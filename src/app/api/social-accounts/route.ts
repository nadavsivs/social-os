import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function getAuthUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

function adminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json([])

  const workspaceId = request.nextUrl.searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json([])

  const admin = adminClient()

  // Verify user belongs to this workspace
  const { data: membership } = await admin
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!membership) return NextResponse.json([])

  const { data, error } = await admin
    .from('social_accounts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json([])

  return NextResponse.json(data ?? [])
}
