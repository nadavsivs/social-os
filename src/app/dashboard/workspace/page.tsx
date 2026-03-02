'use client'

import { Suspense, useState } from 'react'
import { useWorkspaceStore } from '@/stores/workspace'
import { useWorkspaces, useCreateWorkspace } from '@/hooks/use-workspace'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { getInitials } from '@/lib/utils'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useSearchParams } from 'next/navigation'

function WorkspacePageContent() {
  const searchParams = useSearchParams()
  const { currentWorkspace, setCurrentWorkspace } = useWorkspaceStore()
  const { data: workspaces = [] } = useWorkspaces()
  const { mutateAsync: createWorkspace, isPending } = useCreateWorkspace()

  const [showNewForm, setShowNewForm] = useState(searchParams.get('new') === 'true')
  const [newName, setNewName] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      await createWorkspace(newName.trim())
      toast.success(`"${newName}" workspace created`)
      setNewName('')
      setShowNewForm(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err)
      console.error('[workspace create]', err)
      toast.error(`Failed to create workspace: ${msg}`)
    }
  }

  return (
    <>
      {/* Current workspace */}
      {currentWorkspace && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Current workspace</CardTitle>
              <Badge variant="success">Active</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white font-bold dark:bg-zinc-100 dark:text-zinc-900">
                {getInitials(currentWorkspace.name)}
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{currentWorkspace.name}</p>
                <p className="text-xs text-zinc-500">/{currentWorkspace.slug}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All workspaces */}
      <div className="mb-6">
        <h2 className="mb-3 text-sm font-medium text-zinc-500 uppercase tracking-wide">All workspaces</h2>
        <div className="space-y-2">
          {workspaces.map((ws) => (
            <Card
              key={ws.id}
              className={ws.id === currentWorkspace?.id ? 'ring-1 ring-zinc-900 dark:ring-zinc-100' : ''}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-900 font-bold text-sm dark:bg-zinc-800 dark:text-zinc-100">
                  {getInitials(ws.name)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{ws.name}</p>
                  <p className="text-xs text-zinc-400">{ws.workspace_members?.[0]?.role}</p>
                </div>
                {ws.id !== currentWorkspace?.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentWorkspace(ws)
                      toast.success(`Switched to ${ws.name}`)
                    }}
                  >
                    Switch
                  </Button>
                )}
                {ws.id === currentWorkspace?.id && (
                  <Badge variant="secondary">Active</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Separator className="my-6" />

      {/* Create new workspace */}
      {showNewForm ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">New workspace</CardTitle>
            <CardDescription>Create a workspace for a new brand or client</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="new-workspace">Workspace name</Label>
                <Input
                  id="new-workspace"
                  placeholder="e.g. Acme Corp"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" loading={isPending}>
                  Create workspace
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowNewForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" onClick={() => setShowNewForm(true)}>
          <Plus className="h-4 w-4" />
          New workspace
        </Button>
      )}
    </>
  )
}

export default function WorkspacePage() {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Workspace</h1>
        <p className="mt-1 text-sm text-zinc-500">Manage your workspaces</p>
      </div>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-zinc-100" />}>
        <WorkspacePageContent />
      </Suspense>
    </div>
  )
}
