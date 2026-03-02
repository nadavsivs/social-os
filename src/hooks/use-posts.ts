'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Post, PostStatus } from '@/types'

export function usePosts(workspaceId: string | undefined, status?: PostStatus) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['posts', workspaceId, status],
    queryFn: async () => {
      if (!workspaceId) return []

      let query = supabase
        .from('posts')
        .select(`
          *,
          post_social_accounts(
            *,
            social_account:social_accounts(*)
          )
        `)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Post[]
    },
    enabled: !!workspaceId,
  })
}

export function useScheduledPosts(workspaceId: string | undefined) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['posts', workspaceId, 'scheduled'],
    queryFn: async () => {
      if (!workspaceId) return []

      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('status', 'scheduled')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })

      if (error) throw error
      return data as Post[]
    },
    enabled: !!workspaceId,
  })
}

export function useCreatePost() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (post: Partial<Post> & { workspace_id: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('posts')
        .insert({
          ...post,
          created_by: user.id,
          content: post.content ?? '',
          status: post.status ?? 'draft',
        })
        .select()
        .single()

      if (error) throw error
      return data as Post
    },
    onSuccess: (post) => {
      queryClient.invalidateQueries({ queryKey: ['posts', post.workspace_id] })
    },
  })
}

export function useUpdatePost() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Post> & { id: string }) => {
      const { data, error } = await supabase
        .from('posts')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Post
    },
    onSuccess: (post) => {
      queryClient.invalidateQueries({ queryKey: ['posts', post.workspace_id] })
    },
  })
}

export function useDeletePost() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, workspaceId }: { id: string; workspaceId: string }) => {
      const { error } = await supabase.from('posts').delete().eq('id', id)
      if (error) throw error
      return { id, workspaceId }
    },
    onSuccess: ({ workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['posts', workspaceId] })
    },
  })
}
