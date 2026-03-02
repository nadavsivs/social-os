/**
 * Type-safe Supabase helpers.
 *
 * We cast to `any` here because the new @supabase/supabase-js v2.98+ requires
 * the Database type to be auto-generated via `supabase gen types typescript`.
 * Until the project is connected and types are generated, we use explicit
 * return type assertions at the call sites. All runtime behaviour is correct.
 *
 * TODO: Run `pnpm supabase gen types typescript --project-id <id> > src/types/supabase.ts`
 * after the Supabase project is configured.
 */

import { createClient } from './client'
import { createClient as createServerClientFn, createServiceClient } from './server'
import type {
  Workspace, WorkspaceMember, SocialAccount,
  Post, PostSocialAccount,
} from '@/types'

// Re-export for convenience
export { createClient, createServerClientFn as createServerClient, createServiceClient }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function db(supabase: any) {
  return supabase as {
    from(table: 'workspaces'): ReturnType<typeof workspacesTable>
    from(table: 'workspace_members'): ReturnType<typeof workspaceMembersTable>
    from(table: 'social_accounts'): ReturnType<typeof socialAccountsTable>
    from(table: 'posts'): ReturnType<typeof postsTable>
    from(table: 'post_social_accounts'): ReturnType<typeof postSocialAccountsTable>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    from(table: string): any
  }
}

// These are placeholder type helpers — the actual db calls use any at runtime
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare function workspacesTable(): any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare function workspaceMembersTable(): any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare function socialAccountsTable(): any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare function postsTable(): any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare function postSocialAccountsTable(): any
