'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Workspace } from '@/types'

export function useWorkspaces() {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const res = await fetch('/api/workspaces')
      if (!res.ok) return []
      return res.json() as Promise<(Workspace & { workspace_members: { role: string }[] })[]>
    },
  })
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient()
  const { setCurrentWorkspace } = useWorkspaceStore()

  return useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }

      return res.json() as Promise<Workspace>
    },
    onSuccess: (workspace) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      setCurrentWorkspace(workspace)
    },
  })
}
