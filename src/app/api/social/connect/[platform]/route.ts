import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const META_SCOPES = [
  'instagram_basic',
  'instagram_content_publish',
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'public_profile',
].join(',')

export async function GET(
  req: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  const { platform } = await params
  const { searchParams } = new URL(req.url)
  const state = searchParams.get('state') ?? ''

  if (platform !== 'instagram' && platform !== 'facebook') {
    return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 })
  }

  const appId = process.env.META_APP_ID
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/social/callback`

  const metaOAuthUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth')
  metaOAuthUrl.searchParams.set('client_id', appId!)
  metaOAuthUrl.searchParams.set('redirect_uri', callbackUrl)
  metaOAuthUrl.searchParams.set('scope', META_SCOPES)
  metaOAuthUrl.searchParams.set('state', state)
  metaOAuthUrl.searchParams.set('response_type', 'code')

  return NextResponse.redirect(metaOAuthUrl.toString())
}
