import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils'

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name } = await request.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const slug = slugify(name.trim())

  // Insert workspace
  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .insert({ name: name.trim(), slug })
    .select()
    .single()

  if (wsError) {
    console.error('[POST /api/workspaces] workspace insert:', wsError)
    return NextResponse.json({ error: wsError.message, code: wsError.code }, { status: 400 })
  }

  // Insert owner membership
  const { error: memberError } = await supabase
    .from('workspace_members')
    .insert({ workspace_id: workspace.id, user_id: user.id, role: 'owner' })

  if (memberError) {
    console.error('[POST /api/workspaces] member insert:', memberError)
    return NextResponse.json({ error: memberError.message, code: memberError.code }, { status: 400 })
  }

  return NextResponse.json(workspace)
}
