'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { SocialAccount } from '@/types'

export function useSocialAccounts(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['social-accounts', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return []
      const res = await fetch(`/api/social-accounts?workspaceId=${workspaceId}`)
      if (!res.ok) return []
      return res.json() as Promise<SocialAccount[]>
    },
    enabled: !!workspaceId,
  })
}

export function useDisconnectSocialAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, workspaceId }: { id: string; workspaceId: string }) => {
      const res = await fetch(`/api/social-accounts?id=${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      return { id, workspaceId }
    },
    onSuccess: ({ workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['social-accounts', workspaceId] })
    },
  })
}
