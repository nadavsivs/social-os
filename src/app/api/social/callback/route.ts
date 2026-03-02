import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error || !code || !state) {
    return NextResponse.redirect(`${origin}/dashboard/social-accounts?error=oauth_failed`)
  }

  try {
    const stateData = JSON.parse(atob(state)) as { workspaceId: string; platform: string }
    const { workspaceId, platform } = stateData

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(`${origin}/auth/login`)

    // Exchange code for access token
    const tokenRes = await fetch('https://graph.facebook.com/v19.0/oauth/access_token', {
      method: 'GET',
      headers: {},
    })

    const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token')
    tokenUrl.searchParams.set('client_id', process.env.META_APP_ID!)
    tokenUrl.searchParams.set('client_secret', process.env.META_APP_SECRET!)
    tokenUrl.searchParams.set('redirect_uri', `${origin}/api/social/callback`)
    tokenUrl.searchParams.set('code', code)

    const tokenResponse = await fetch(tokenUrl.toString())
    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      console.error('[OAuth callback] token error:', tokenData.error)
      return NextResponse.redirect(`${origin}/dashboard/social-accounts?error=token_exchange_failed`)
    }

    const accessToken: string = tokenData.access_token

    // Get long-lived token
    const longLivedUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token')
    longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token')
    longLivedUrl.searchParams.set('client_id', process.env.META_APP_ID!)
    longLivedUrl.searchParams.set('client_secret', process.env.META_APP_SECRET!)
    longLivedUrl.searchParams.set('fb_exchange_token', accessToken)

    const longLivedRes = await fetch(longLivedUrl.toString())
    const longLivedData = await longLivedRes.json()
    const longToken: string = longLivedData.access_token ?? accessToken

    // Get user's pages
    const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${longToken}&fields=id,name,picture,instagram_business_account`)
    const pagesData = await pagesRes.json()

    const accounts: Array<{
      platform: string
      platform_account_id: string
      account_name: string
      access_token: string
      avatar_url: string | null
    }> = []

    for (const page of pagesData.data ?? []) {
      // Facebook page
      if (platform === 'facebook') {
        accounts.push({
          platform: 'facebook',
          platform_account_id: page.id,
          account_name: page.name,
          access_token: page.access_token ?? longToken,
          avatar_url: page.picture?.data?.url ?? null,
        })
      }

      // Instagram business account linked to this page
      if (platform === 'instagram' && page.instagram_business_account?.id) {
        const igRes = await fetch(
          `https://graph.facebook.com/v19.0/${page.instagram_business_account.id}?fields=id,name,username,profile_picture_url&access_token=${page.access_token ?? longToken}`
        )
        const igData = await igRes.json()

        accounts.push({
          platform: 'instagram',
          platform_account_id: igData.id,
          account_name: igData.name ?? igData.username,
          access_token: page.access_token ?? longToken,
          avatar_url: igData.profile_picture_url ?? null,
        })
      }
    }

    // Upsert all discovered accounts
    for (const account of accounts) {
      await supabase.from('social_accounts').upsert(
        {
          workspace_id: workspaceId,
          platform: account.platform as 'instagram' | 'facebook',
          platform_account_id: account.platform_account_id,
          account_name: account.account_name,
          access_token: account.access_token,
          avatar_url: account.avatar_url,
          is_active: true,
          token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
        },
        { onConflict: 'workspace_id,platform,platform_account_id' }
      )
    }

    return NextResponse.redirect(`${origin}/dashboard/social-accounts?connected=true`)
  } catch (err) {
    console.error('[OAuth callback]', err)
    return NextResponse.redirect(`${origin}/dashboard/social-accounts?error=internal`)
  }
}
