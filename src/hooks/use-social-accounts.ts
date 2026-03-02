'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { SocialAccount } from '@/types'

export function useSocialAccounts(workspaceId: string | undefined) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['social-accounts', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return []

      const { data, error } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data as SocialAccount[]
    },
    enabled: !!workspaceId,
  })
}

export function useDisconnectSocialAccount() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, workspaceId }: { id: string; workspaceId: string }) => {
      const { error } = await supabase
        .from('social_accounts')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error
      return { id, workspaceId }
    },
    onSuccess: ({ workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['social-accounts', workspaceId] })
    },
  })
}
