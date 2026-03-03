import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { slugify } from '@/lib/utils'

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

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json([], { status: 200 })

  const admin = adminClient()
  const { data, error } = await admin
    .from('workspace_members')
    .select('role, workspace:workspaces(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json([], { status: 200 })

  const workspaces = (data ?? []).map((row: Record<string, unknown>) => ({
    ...(row.workspace as Record<string, unknown>),
    workspace_members: [{ role: row.role }],
  }))

  return NextResponse.json(workspaces)
}

export async function POST(request: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name } = await request.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const slug = slugify(name.trim())
  const admin = adminClient()

  const { data: workspace, error: wsError } = await admin
    .from('workspaces')
    .insert({ name: name.trim(), slug })
    .select()
    .single()

  if (wsError) return NextResponse.json({ error: wsError.message }, { status: 400 })

  const { error: memberError } = await admin
    .from('workspace_members')
    .insert({ workspace_id: workspace.id, user_id: user.id, role: 'owner' })

  if (memberError) {
    await admin.from('workspaces').delete().eq('id', workspace.id)
    return NextResponse.json({ error: memberError.message }, { status: 400 })
  }

  return NextResponse.json(workspace)
}
