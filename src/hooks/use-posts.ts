'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Post, PostStatus } from '@/types'

export function usePosts(workspaceId: string | undefined, status?: PostStatus) {
  return useQuery({
    queryKey: ['posts', workspaceId, status],
    queryFn: async () => {
      if (!workspaceId) return []
      const params = new URLSearchParams({ workspaceId })
      if (status) params.set('status', status)
      const res = await fetch(`/api/posts?${params}`)
      if (!res.ok) return []
      return res.json() as Promise<Post[]>
    },
    enabled: !!workspaceId,
  })
}

export function useScheduledPosts(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['posts', workspaceId, 'scheduled'],
    queryFn: async () => {
      if (!workspaceId) return []
      const params = new URLSearchParams({ workspaceId, status: 'scheduled' })
      const res = await fetch(`/api/posts?${params}`)
      if (!res.ok) return []
      return res.json() as Promise<Post[]>
    },
    enabled: !!workspaceId,
  })
}

export function useCreatePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (post: Partial<Post> & { workspace_id: string }) => {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      return res.json() as Promise<Post>
    },
    onSuccess: (post) => {
      queryClient.invalidateQueries({ queryKey: ['posts', post.workspace_id] })
    },
  })
}

export function useUpdatePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, workspace_id, ...updates }: Partial<Post> & { id: string; workspace_id: string }) => {
      const res = await fetch(`/api/posts`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      return res.json() as Promise<Post>
    },
    onSuccess: (post) => {
      queryClient.invalidateQueries({ queryKey: ['posts', post.workspace_id] })
    },
  })
}

export function useDeletePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, workspaceId }: { id: string; workspaceId: string }) => {
      const res = await fetch(`/api/posts?id=${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      return { id, workspaceId }
    },
    onSuccess: ({ workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: ['posts', workspaceId] })
    },
  })
}
