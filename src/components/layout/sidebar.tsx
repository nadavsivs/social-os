'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn, getInitials } from '@/lib/utils'
import { useWorkspaceStore } from '@/stores/workspace'
import { useWorkspaces } from '@/hooks/use-workspace'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  Calendar,
  PenSquare,
  Settings,
  Users,
  LogOut,
  ChevronDown,
  Plus,
  Share2,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const nav = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Compose', href: '/dashboard/compose', icon: PenSquare },
  { label: 'Planner', href: '/dashboard/planner', icon: Calendar },
  { label: 'Social Accounts', href: '/dashboard/social-accounts', icon: Share2 },
  { label: 'Settings', href: '/dashboard/workspace', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { currentWorkspace, setCurrentWorkspace } = useWorkspaceStore()
  const { data: workspaces = [] } = useWorkspaces()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      {/* Workspace Switcher */}
      <div className="border-b border-zinc-100 p-3 dark:border-zinc-800">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-zinc-50 transition-colors dark:hover:bg-zinc-900">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-900 text-white text-xs font-bold dark:bg-zinc-100 dark:text-zinc-900">
                {currentWorkspace ? getInitials(currentWorkspace.name) : 'S'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {currentWorkspace?.name ?? 'Select workspace'}
                </p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="start" side="bottom">
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
            {workspaces.map((ws) => (
              <DropdownMenuItem
                key={ws.id}
                onClick={() => setCurrentWorkspace(ws)}
                className={cn(currentWorkspace?.id === ws.id && 'bg-zinc-100 dark:bg-zinc-800')}
              >
                <div className="flex h-5 w-5 items-center justify-center rounded bg-zinc-900 text-white text-[10px] font-bold dark:bg-zinc-100 dark:text-zinc-900">
                  {getInitials(ws.name)}
                </div>
                <span className="truncate">{ws.name}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/dashboard/workspace?new=true')}>
              <Plus className="h-4 w-4" />
              New workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 p-3 overflow-y-auto">
        {nav.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
                active
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User Menu */}
      <div className="border-t border-zinc-100 p-3 dark:border-zinc-800">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-colors dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
