'use client'

import { useState } from 'react'
import { useCreateWorkspace } from '@/hooks/use-workspace'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export function WorkspaceSetup() {
  const [name, setName] = useState('')
  const { mutateAsync: createWorkspace, isPending } = useCreateWorkspace()

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    try {
      await createWorkspace(name.trim())
      toast.success('Workspace created!')
    } catch {
      toast.error('Failed to create workspace. Please try again.')
    }
  }

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white font-bold text-xl mb-4 dark:bg-zinc-100 dark:text-zinc-900">
            S
          </div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Create your workspace</h2>
          <p className="mt-1.5 text-sm text-zinc-500">
            A workspace groups your social accounts, posts, and team members.
          </p>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="workspace-name">Workspace name</Label>
            <Input
              id="workspace-name"
              placeholder="e.g. Acme Marketing"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
            <p className="text-xs text-zinc-400">This could be your brand, company, or client name.</p>
          </div>

          <Button type="submit" className="w-full" loading={isPending}>
            Create workspace
          </Button>
        </form>
      </div>
    </div>
  )
}
