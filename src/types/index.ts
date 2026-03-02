export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Platform = 'instagram' | 'facebook'
export type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed'
export type MemberRole = 'owner' | 'admin' | 'member'
export type ContentTone = 'professional' | 'casual' | 'humorous' | 'inspirational' | 'educational'

export interface Workspace {
  id: string
  name: string
  slug: string
  logo_url: string | null
  created_at: string
  updated_at: string
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: MemberRole
  created_at: string
  user?: {
    email: string
    full_name: string | null
    avatar_url: string | null
  }
}

export interface SocialAccount {
  id: string
  workspace_id: string
  platform: Platform
  platform_account_id: string
  account_name: string
  account_handle: string | null
  avatar_url: string | null
  access_token: string
  refresh_token: string | null
  token_expires_at: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Post {
  id: string
  workspace_id: string
  created_by: string
  title: string | null
  content: string
  media_urls: string[]
  platforms: Platform[]
  status: PostStatus
  scheduled_at: string | null
  published_at: string | null
  platform_post_ids: Record<string, string>
  ai_generated: boolean
  tags: string[]
  created_at: string
  updated_at: string
  social_accounts?: SocialAccount[]
  post_social_accounts?: PostSocialAccount[]
}

export interface PostSocialAccount {
  id: string
  post_id: string
  social_account_id: string
  status: PostStatus
  platform_post_id: string | null
  error_message: string | null
  published_at: string | null
  social_account?: SocialAccount
}

export interface AIGenerationRequest {
  topic: string
  tone: ContentTone
  platforms: Platform[]
  additional_context?: string
  workspace_id: string
}

export interface AIGenerationResult {
  content: string
  platform_variants: Partial<Record<Platform, string>>
  suggested_hashtags: string[]
  suggested_posting_time?: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; email: string; full_name: string | null; avatar_url: string | null; created_at: string; updated_at: string }
        Insert: { id: string; email: string; full_name?: string | null; avatar_url?: string | null }
        Update: { full_name?: string | null; avatar_url?: string | null }
        Relationships: []
      }
      workspaces: {
        Row: Workspace
        Insert: Omit<Workspace, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Workspace, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      workspace_members: {
        Row: Omit<WorkspaceMember, 'user'>
        Insert: Omit<WorkspaceMember, 'id' | 'created_at' | 'user'>
        Update: Partial<Omit<WorkspaceMember, 'id' | 'created_at' | 'user'>>
        Relationships: [
          { foreignKeyName: 'workspace_members_workspace_id_fkey'; columns: ['workspace_id']; referencedRelation: 'workspaces'; referencedColumns: ['id'] },
          { foreignKeyName: 'workspace_members_user_id_fkey'; columns: ['user_id']; referencedRelation: 'users'; referencedColumns: ['id'] }
        ]
      }
      social_accounts: {
        Row: Omit<SocialAccount, never>
        Insert: Omit<SocialAccount, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<SocialAccount, 'id' | 'created_at' | 'updated_at'>>
        Relationships: [
          { foreignKeyName: 'social_accounts_workspace_id_fkey'; columns: ['workspace_id']; referencedRelation: 'workspaces'; referencedColumns: ['id'] }
        ]
      }
      posts: {
        Row: Omit<Post, 'social_accounts' | 'post_social_accounts'>
        Insert: Omit<Post, 'id' | 'created_at' | 'updated_at' | 'social_accounts' | 'post_social_accounts'>
        Update: Partial<Omit<Post, 'id' | 'created_at' | 'updated_at' | 'social_accounts' | 'post_social_accounts'>>
        Relationships: [
          { foreignKeyName: 'posts_workspace_id_fkey'; columns: ['workspace_id']; referencedRelation: 'workspaces'; referencedColumns: ['id'] }
        ]
      }
      post_social_accounts: {
        Row: Omit<PostSocialAccount, 'social_account'>
        Insert: Omit<PostSocialAccount, 'id' | 'social_account'>
        Update: Partial<Omit<PostSocialAccount, 'id' | 'social_account'>>
        Relationships: [
          { foreignKeyName: 'post_social_accounts_post_id_fkey'; columns: ['post_id']; referencedRelation: 'posts'; referencedColumns: ['id'] },
          { foreignKeyName: 'post_social_accounts_social_account_id_fkey'; columns: ['social_account_id']; referencedRelation: 'social_accounts'; referencedColumns: ['id'] }
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      member_role: MemberRole
      social_platform: Platform
      post_status: PostStatus
    }
  }
}
