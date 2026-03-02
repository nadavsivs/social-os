'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Workspace } from '@/types'
import { slugify } from '@/lib/utils'

export function useWorkspaces() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select(`
          *,
          workspace_members!inner(role)
        `)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data as (Workspace & { workspace_members: { role: string }[] })[]
    },
  })
}

export function useCreateWorkspace() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { setCurrentWorkspace } = useWorkspaceStore()

  return useMutation({
    mutationFn: async (name: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const slug = slugify(name)

      const { data: workspace, error: wsError } = await supabase
        .from('workspaces')
        .insert({ name, slug })
        .select()
        .single()

      if (wsError) throw wsError

      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({ workspace_id: (workspace as Workspace).id, user_id: user.id, role: 'owner' as const })

      if (memberError) throw memberError

      return workspace as Workspace
    },
    onSuccess: (workspace) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      setCurrentWorkspace(workspace)
    },
  })
}
