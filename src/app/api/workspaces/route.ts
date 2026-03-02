import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { slugify } from '@/lib/utils'

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()

    // Log what cookies we can see (names only, not values)
    const cookieNames = allCookies.map((c) => c.name)
    console.log('[POST /api/workspaces] cookies present:', cookieNames)

    // Create auth client to verify user
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return allCookies
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Expected in some contexts
            }
          },
        },
      }
    )

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    console.log('[POST /api/workspaces] getUser result:', {
      userId: user?.id ?? null,
      email: user?.email ?? null,
      authError: authError?.message ?? null,
    })

    if (!user) {
      return NextResponse.json(
        {
          error: `Not authenticated: ${authError?.message ?? 'no session found'}`,
          debug: { cookieNames },
        },
        { status: 401 }
      )
    }

    const body = await request.json()
    const name = body?.name
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const slug = slugify(name.trim())

    // Create service-role client for DB writes (bypasses RLS)
    const admin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return []
          },
          setAll() {},
        },
      }
    )

    // Insert workspace
    const { data: workspace, error: wsError } = await admin
      .from('workspaces')
      .insert({ name: name.trim(), slug })
      .select()
      .single()

    if (wsError) {
      console.error('[POST /api/workspaces] workspace insert:', wsError)
      return NextResponse.json({ error: wsError.message, code: wsError.code }, { status: 400 })
    }

    // Insert owner membership
    const { error: memberError } = await admin
      .from('workspace_members')
      .insert({ workspace_id: workspace.id, user_id: user.id, role: 'owner' })

    if (memberError) {
      console.error('[POST /api/workspaces] member insert:', memberError)
      // Clean up the orphaned workspace
      await admin.from('workspaces').delete().eq('id', workspace.id)
      return NextResponse.json({ error: memberError.message, code: memberError.code }, { status: 400 })
    }

    return NextResponse.json(workspace)
  } catch (err) {
    console.error('[POST /api/workspaces] unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
