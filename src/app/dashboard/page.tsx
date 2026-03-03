'use client'

import { useWorkspaceStore } from '@/stores/workspace'
import { useWorkspaces } from '@/hooks/use-workspace'
import { usePosts } from '@/hooks/use-posts'
import { useSocialAccounts } from '@/hooks/use-social-accounts'
import { WorkspaceSetup } from '@/components/workspace/workspace-setup'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, getPlatformColor } from '@/lib/utils'
import Link from 'next/link'
import { PenSquare, Calendar, Share2, TrendingUp, Clock, CheckCircle2, AlertCircle } from 'lucide-react'

export default function DashboardPage() {
  const { currentWorkspace } = useWorkspaceStore()
  const { data: workspaces = [], isLoading } = useWorkspaces()
  const { data: posts = [] } = usePosts(currentWorkspace?.id)
  const { data: socialAccounts = [] } = useSocialAccounts(currentWorkspace?.id)

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
      </div>
    )
  }

  if (!currentWorkspace) {
    return <WorkspaceSetup />
  }

  const drafts = posts.filter((p) => p.status === 'draft')
  const scheduled = posts.filter((p) => p.status === 'scheduled')
  const published = posts.filter((p) => p.status === 'published')
  const recentPosts = posts.slice(0, 5)

  const stats = [
    { label: 'Connected accounts', value: socialAccounts.length, icon: Share2, color: 'text-blue-600' },
    { label: 'Drafts', value: drafts.length, icon: PenSquare, color: 'text-amber-600' },
    { label: 'Scheduled', value: scheduled.length, icon: Clock, color: 'text-purple-600' },
    { label: 'Published', value: published.length, icon: CheckCircle2, color: 'text-green-600' },
  ]

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {currentWorkspace.name}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Your social media command center
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</p>
                  <p className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">{value}</p>
                </div>
                <div className={`rounded-xl bg-zinc-50 p-2.5 dark:bg-zinc-800 ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      {socialAccounts.length === 0 && (
        <Card className="mb-8 border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">No social accounts connected</p>
                <p className="text-xs text-amber-700 dark:text-amber-300">Connect Instagram or Facebook to start publishing</p>
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100">
              <Link href="/dashboard/social-accounts">Connect now</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Posts */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent posts</CardTitle>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard/compose">
                    <PenSquare className="h-4 w-4" />
                    New post
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {recentPosts.length === 0 ? (
                <div className="px-6 pb-6 text-center">
                  <p className="text-sm text-zinc-500">No posts yet.</p>
                  <Button asChild variant="outline" size="sm" className="mt-3">
                    <Link href="/dashboard/compose">Create your first post</Link>
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {recentPosts.map((post) => (
                    <div key={post.id} className="flex items-start gap-3 px-6 py-3.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-900 dark:text-zinc-100 line-clamp-2">{post.content || post.title || 'Untitled'}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="text-xs text-zinc-400">{formatDate(post.created_at)}</span>
                          {post.platforms?.map((p) => (
                            <span key={p} className="text-xs font-medium capitalize" style={{ color: getPlatformColor(p) }}>
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                      <PostStatusBadge status={post.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start gap-2">
                <Link href="/dashboard/compose">
                  <PenSquare className="h-4 w-4" />
                  Compose post
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start gap-2">
                <Link href="/dashboard/planner">
                  <Calendar className="h-4 w-4" />
                  View planner
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start gap-2">
                <Link href="/dashboard/social-accounts">
                  <Share2 className="h-4 w-4" />
                  Manage accounts
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Connected Accounts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Connected accounts</CardTitle>
            </CardHeader>
            <CardContent>
              {socialAccounts.length === 0 ? (
                <p className="text-xs text-zinc-500">No accounts connected.</p>
              ) : (
                <div className="space-y-2">
                  {socialAccounts.map((account) => (
                    <div key={account.id} className="flex items-center gap-2.5">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: getPlatformColor(account.platform) }}
                      />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate">
                        {account.account_name}
                      </span>
                      <span className="ml-auto text-xs text-zinc-400 capitalize">{account.platform}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function PostStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline' }> = {
    draft: { label: 'Draft', variant: 'secondary' },
    scheduled: { label: 'Scheduled', variant: 'warning' },
    published: { label: 'Published', variant: 'success' },
    failed: { label: 'Failed', variant: 'destructive' },
  }
  const { label, variant } = map[status] ?? { label: status, variant: 'outline' }
  return <Badge variant={variant}>{label}</Badge>
}
