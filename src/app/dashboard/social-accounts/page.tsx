'use client'

import { useWorkspaceStore } from '@/stores/workspace'
import { useSocialAccounts, useDisconnectSocialAccount } from '@/hooks/use-social-accounts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getPlatformColor } from '@/lib/utils'
import { Instagram, Facebook, Plus, Trash2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { SocialAccount } from '@/types'

const PLATFORM_META = {
  instagram: { label: 'Instagram', Icon: Instagram, description: 'Share photos, reels, and stories' },
  facebook: { label: 'Facebook', Icon: Facebook, description: 'Posts, pages, and groups' },
}

export default function SocialAccountsPage() {
  const { currentWorkspace } = useWorkspaceStore()
  const { data: accounts = [], isLoading } = useSocialAccounts(currentWorkspace?.id)
  const { mutate: disconnect } = useDisconnectSocialAccount()

  function handleConnect(platform: 'instagram' | 'facebook') {
    if (!currentWorkspace) {
      toast.error('Please select a workspace first')
      return
    }
    const callbackUrl = `${window.location.origin}/api/social/callback`
    const state = btoa(JSON.stringify({ workspaceId: currentWorkspace.id, platform }))
    const url = `/api/social/connect/${platform}?state=${state}&callback=${encodeURIComponent(callbackUrl)}`
    window.location.href = url
  }

  function handleDisconnect(account: SocialAccount) {
    if (!currentWorkspace) return
    disconnect(
      { id: account.id, workspaceId: currentWorkspace.id },
      {
        onSuccess: () => toast.success(`${account.account_name} disconnected`),
        onError: () => toast.error('Failed to disconnect account'),
      }
    )
  }

  const connectedPlatforms = new Set(accounts.map((a) => a.platform))

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Social accounts</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Connect your social media accounts to start publishing
        </p>
      </div>

      {/* Connect new */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        {(Object.entries(PLATFORM_META) as [keyof typeof PLATFORM_META, typeof PLATFORM_META[keyof typeof PLATFORM_META]][]).map(([platform, meta]) => {
          const { Icon, label, description } = meta
          const isConnected = connectedPlatforms.has(platform)
          const color = getPlatformColor(platform)

          return (
            <Card key={platform} className="relative overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl p-2.5" style={{ backgroundColor: `${color}15` }}>
                      <Icon className="h-5 w-5" style={{ color }} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{label}</CardTitle>
                      <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
                    </div>
                  </div>
                  {isConnected && (
                    <Badge variant="success" className="shrink-0">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Connected
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  variant={isConnected ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => handleConnect(platform)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4" />
                  {isConnected ? 'Add another account' : `Connect ${label}`}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Connected accounts list */}
      {accounts.length > 0 && (
        <div>
          <h2 className="mb-4 text-sm font-medium text-zinc-500 uppercase tracking-wide">Connected accounts</h2>
          <div className="space-y-3">
            {accounts.map((account) => {
              const color = getPlatformColor(account.platform)
              const meta = PLATFORM_META[account.platform]
              const Icon = meta.Icon

              return (
                <Card key={account.id}>
                  <CardContent className="p-4 flex items-center gap-4">
                    {account.avatar_url ? (
                      <img
                        src={account.avatar_url}
                        alt={account.account_name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: `${color}15` }}>
                        <Icon className="h-5 w-5" style={{ color }} />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{account.account_name}</p>
                      {account.account_handle && (
                        <p className="text-xs text-zinc-500">@{account.account_handle}</p>
                      )}
                    </div>

                    <Badge variant="secondary" className="shrink-0 capitalize">{account.platform}</Badge>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-400 hover:text-red-600"
                      onClick={() => handleDisconnect(account)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {!isLoading && accounts.length === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500">No accounts connected yet. Connect Instagram or Facebook above to get started.</p>
        </div>
      )}
    </div>
  )
}
