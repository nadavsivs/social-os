import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { SocialAccount, Post } from '@/types'

async function publishToInstagram(post: Post, account: SocialAccount): Promise<string> {
  const { access_token, platform_account_id } = account

  if (post.media_urls?.length > 0) {
    // Create media container
    const containerRes = await fetch(
      `https://graph.facebook.com/v19.0/${platform_account_id}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: post.media_urls[0],
          caption: post.content,
          access_token,
        }),
      }
    )
    const container = await containerRes.json()
    if (container.error) throw new Error(container.error.message)

    // Publish container
    const publishRes = await fetch(
      `https://graph.facebook.com/v19.0/${platform_account_id}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: container.id, access_token }),
      }
    )
    const published = await publishRes.json()
    if (published.error) throw new Error(published.error.message)
    return published.id
  } else {
    // Text-only not supported by IG — post as caption-only with a placeholder or skip
    throw new Error('Instagram requires at least one image or video.')
  }
}

async function publishToFacebook(post: Post, account: SocialAccount): Promise<string> {
  const { access_token, platform_account_id } = account

  const body: Record<string, string> = {
    message: post.content,
    access_token,
  }

  if (post.media_urls?.length > 0) {
    body.url = post.media_urls[0]
  }

  const endpoint = post.media_urls?.length
    ? `https://graph.facebook.com/v19.0/${platform_account_id}/photos`
    : `https://graph.facebook.com/v19.0/${platform_account_id}/feed`

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.id ?? data.post_id
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const serviceSupabase = await createServiceClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { postId, socialAccountIds } = await req.json()

    if (!postId || !socialAccountIds?.length) {
      return NextResponse.json({ error: 'postId and socialAccountIds are required' }, { status: 400 })
    }

    // Fetch post
    const { data: post, error: postError } = await serviceSupabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single()

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Fetch accounts
    const { data: accounts, error: accountsError } = await serviceSupabase
      .from('social_accounts')
      .select('*')
      .in('id', socialAccountIds)

    if (accountsError || !accounts?.length) {
      return NextResponse.json({ error: 'Social accounts not found' }, { status: 404 })
    }

    const results: Array<{ accountId: string; success: boolean; platformPostId?: string; error?: string }> = []

    for (const account of accounts as SocialAccount[]) {
      try {
        let platformPostId: string

        if (account.platform === 'instagram') {
          platformPostId = await publishToInstagram(post as Post, account)
        } else if (account.platform === 'facebook') {
          platformPostId = await publishToFacebook(post as Post, account)
        } else {
          throw new Error(`Unsupported platform: ${account.platform}`)
        }

        await serviceSupabase.from('post_social_accounts').upsert({
          post_id: postId,
          social_account_id: account.id,
          status: 'published',
          platform_post_id: platformPostId,
          published_at: new Date().toISOString(),
        }, { onConflict: 'post_id,social_account_id' })

        results.push({ accountId: account.id, success: true, platformPostId })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'

        await serviceSupabase.from('post_social_accounts').upsert({
          post_id: postId,
          social_account_id: account.id,
          status: 'failed',
          error_message: message,
        }, { onConflict: 'post_id,social_account_id' })

        results.push({ accountId: account.id, success: false, error: message })
      }
    }

    const allSucceeded = results.every((r) => r.success)
    const anySucceeded = results.some((r) => r.success)

    await serviceSupabase.from('posts').update({
      status: allSucceeded ? 'published' : anySucceeded ? 'published' : 'failed',
      published_at: anySucceeded ? new Date().toISOString() : null,
    }).eq('id', postId)

    return NextResponse.json({ success: true, results })
  } catch (err) {
    console.error('[Publish]', err)
    return NextResponse.json({ error: 'Publish failed' }, { status: 500 })
  }
}
