-- ============================================================
-- SocialOS Database Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- WORKSPACES
-- ============================================================
create table public.workspaces (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text not null unique,
  logo_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.workspaces enable row level security;

-- ============================================================
-- WORKSPACE MEMBERS
-- ============================================================
create type public.member_role as enum ('owner', 'admin', 'member');

create table public.workspace_members (
  id uuid default uuid_generate_v4() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.member_role default 'member' not null,
  created_at timestamptz default now() not null,
  unique(workspace_id, user_id)
);

alter table public.workspace_members enable row level security;

-- Workspace RLS policies (access via membership)
create policy "Members can view their workspaces"
  on public.workspaces for select
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = id and user_id = auth.uid()
    )
  );

create policy "Owners and admins can update workspace"
  on public.workspaces for update
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = id and user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "Authenticated users can create workspaces"
  on public.workspaces for insert
  with check (auth.uid() is not null);

-- Workspace members RLS
create policy "Members can view workspace members"
  on public.workspace_members for select
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id and wm.user_id = auth.uid()
    )
  );

create policy "Owners and admins can manage members"
  on public.workspace_members for all
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id and wm.user_id = auth.uid() and wm.role in ('owner', 'admin')
    )
  );

create policy "Users can join workspaces (insert own membership)"
  on public.workspace_members for insert
  with check (user_id = auth.uid());

-- ============================================================
-- SOCIAL ACCOUNTS
-- ============================================================
create type public.social_platform as enum ('instagram', 'facebook');

create table public.social_accounts (
  id uuid default uuid_generate_v4() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  platform public.social_platform not null,
  platform_account_id text not null,
  account_name text not null,
  account_handle text,
  avatar_url text,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(workspace_id, platform, platform_account_id)
);

alter table public.social_accounts enable row level security;

create policy "Workspace members can view social accounts"
  on public.social_accounts for select
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = social_accounts.workspace_id and user_id = auth.uid()
    )
  );

create policy "Admins can manage social accounts"
  on public.social_accounts for all
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = social_accounts.workspace_id and user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- ============================================================
-- POSTS
-- ============================================================
create type public.post_status as enum ('draft', 'scheduled', 'published', 'failed');

create table public.posts (
  id uuid default uuid_generate_v4() primary key,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  created_by uuid references auth.users(id) on delete set null,
  title text,
  content text not null default '',
  media_urls text[] default '{}' not null,
  platforms public.social_platform[] default '{}' not null,
  status public.post_status default 'draft' not null,
  scheduled_at timestamptz,
  published_at timestamptz,
  platform_post_ids jsonb default '{}' not null,
  ai_generated boolean default false not null,
  tags text[] default '{}' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.posts enable row level security;

create policy "Workspace members can view posts"
  on public.posts for select
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = posts.workspace_id and user_id = auth.uid()
    )
  );

create policy "Workspace members can create posts"
  on public.posts for insert
  with check (
    exists (
      select 1 from public.workspace_members
      where workspace_id = posts.workspace_id and user_id = auth.uid()
    )
  );

create policy "Workspace members can update posts"
  on public.posts for update
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = posts.workspace_id and user_id = auth.uid()
    )
  );

create policy "Workspace members can delete posts"
  on public.posts for delete
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = posts.workspace_id and user_id = auth.uid()
    )
  );

-- ============================================================
-- POST SOCIAL ACCOUNTS (per-platform publish status)
-- ============================================================
create table public.post_social_accounts (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  social_account_id uuid references public.social_accounts(id) on delete cascade not null,
  status public.post_status default 'draft' not null,
  platform_post_id text,
  error_message text,
  published_at timestamptz,
  unique(post_id, social_account_id)
);

alter table public.post_social_accounts enable row level security;

create policy "Workspace members can view post accounts"
  on public.post_social_accounts for select
  using (
    exists (
      select 1 from public.posts p
      join public.workspace_members wm on wm.workspace_id = p.workspace_id
      where p.id = post_id and wm.user_id = auth.uid()
    )
  );

create policy "Workspace members can manage post accounts"
  on public.post_social_accounts for all
  using (
    exists (
      select 1 from public.posts p
      join public.workspace_members wm on wm.workspace_id = p.workspace_id
      where p.id = post_id and wm.user_id = auth.uid()
    )
  );

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do nothing;

create policy "Workspace members can upload media"
  on storage.objects for insert
  with check (bucket_id = 'post-media' and auth.uid() is not null);

create policy "Anyone can view media"
  on storage.objects for select
  using (bucket_id = 'post-media');

create policy "Uploaders can delete their media"
  on storage.objects for delete
  using (bucket_id = 'post-media' and auth.uid() is not null);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_workspaces_updated_at
  before update on public.workspaces
  for each row execute procedure public.handle_updated_at();

create trigger handle_social_accounts_updated_at
  before update on public.social_accounts
  for each row execute procedure public.handle_updated_at();

create trigger handle_posts_updated_at
  before update on public.posts
  for each row execute procedure public.handle_updated_at();

create trigger handle_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();
