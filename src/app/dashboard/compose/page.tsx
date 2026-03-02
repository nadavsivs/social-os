'use client'

import { useState, useCallback } from 'react'
import { useWorkspaceStore } from '@/stores/workspace'
import { useSocialAccounts } from '@/hooks/use-social-accounts'
import { useCreatePost, useUpdatePost } from '@/hooks/use-posts'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn, getPlatformColor } from '@/lib/utils'
import { Instagram, Facebook, Sparkles, Send, Save, Clock, X, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import type { Platform, ContentTone, SocialAccount } from '@/types'
import { format } from 'date-fns'

const PLATFORM_ICONS = { instagram: Instagram, facebook: Facebook }
const TONES: { value: ContentTone; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'humorous', label: 'Humorous' },
  { value: 'inspirational', label: 'Inspirational' },
  { value: 'educational', label: 'Educational' },
]

export default function ComposePage() {
  const { currentWorkspace } = useWorkspaceStore()
  const { data: socialAccounts = [] } = useSocialAccounts(currentWorkspace?.id)
  const { mutateAsync: createPost } = useCreatePost()

  // Content state
  const [content, setContent] = useState('')
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [scheduledAt, setScheduledAt] = useState('')
  const [isScheduling, setIsScheduling] = useState(false)

  // AI state
  const [aiOpen, setAiOpen] = useState(false)
  const [aiTopic, setAiTopic] = useState('')
  const [aiTone, setAiTone] = useState<ContentTone>('professional')
  const [aiContext, setAiContext] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<{ content: string; variants: Partial<Record<Platform, string>>; hashtags: string[] } | null>(null)

  const selectedPlatforms = Array.from(
    new Set(
      socialAccounts
        .filter((a) => selectedAccounts.includes(a.id))
        .map((a) => a.platform)
    )
  ) as Platform[]

  function toggleAccount(id: string) {
    setSelectedAccounts((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    )
  }

  async function handleAIGenerate() {
    if (!aiTopic.trim()) {
      toast.error('Please enter a topic')
      return
    }
    if (!currentWorkspace) return

    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiTopic,
          tone: aiTone,
          platforms: selectedPlatforms.length ? selectedPlatforms : ['instagram', 'facebook'],
          additional_context: aiContext,
          workspace_id: currentWorkspace.id,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setAiResult(data)
      setContent(data.content)
      toast.success('Content generated!')
    } catch (err) {
      toast.error('Failed to generate content. Please try again.')
    } finally {
      setAiLoading(false)
    }
  }

  function applyVariant(platform: Platform) {
    const variant = aiResult?.variants[platform]
    if (variant) setContent(variant)
  }

  function appendHashtags() {
    if (!aiResult?.hashtags?.length) return
    setContent((c) => c + '\n\n' + aiResult!.hashtags.join(' '))
  }

  async function handleSave(status: 'draft' | 'scheduled' | 'published') {
    if (!currentWorkspace) {
      toast.error('No workspace selected')
      return
    }
    if (!content.trim()) {
      toast.error('Please write some content first')
      return
    }
    if (selectedAccounts.length === 0) {
      toast.error('Please select at least one account')
      return
    }
    if (status === 'scheduled' && !scheduledAt) {
      toast.error('Please pick a date/time to schedule')
      return
    }

    try {
      const post = await createPost({
        workspace_id: currentWorkspace.id,
        content,
        platforms: selectedPlatforms,
        status,
        scheduled_at: status === 'scheduled' ? new Date(scheduledAt).toISOString() : null,
        ai_generated: !!aiResult,
      })

      if (status === 'published') {
        const res = await fetch('/api/posts/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId: post.id, socialAccountIds: selectedAccounts }),
        })
        if (!res.ok) throw new Error('Publish failed')
        toast.success('Post published!')
      } else {
        toast.success(status === 'scheduled' ? 'Post scheduled!' : 'Saved as draft!')
      }

      // Reset
      setContent('')
      setSelectedAccounts([])
      setScheduledAt('')
      setAiResult(null)
      setAiTopic('')
    } catch {
      toast.error('Something went wrong. Please try again.')
    }
  }

  const charCount = content.length
  const charLimit = selectedPlatforms.includes('instagram') ? 2200 : 63206

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Compose</h1>
        <p className="mt-1 text-sm text-zinc-500">Create and publish content to your social accounts</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main editor */}
        <div className="lg:col-span-2 space-y-4">
          {/* AI Generator */}
          <Card>
            <CardContent className="p-4">
              <button
                onClick={() => setAiOpen((v) => !v)}
                className="flex w-full items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">AI Content Generator</span>
                  <Badge variant="secondary" className="text-[10px]">Beta</Badge>
                </div>
                {aiOpen ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
              </button>

              {aiOpen && (
                <div className="mt-4 space-y-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                  <div className="space-y-1.5">
                    <Label>Topic / brief</Label>
                    <Input
                      placeholder="e.g. Summer sale — 30% off all products this weekend"
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Tone</Label>
                      <Select value={aiTone} onValueChange={(v) => setAiTone(v as ContentTone)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TONES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Extra context (optional)</Label>
                      <Input
                        placeholder="Brand name, CTA, links..."
                        value={aiContext}
                        onChange={(e) => setAiContext(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button onClick={handleAIGenerate} loading={aiLoading} size="sm" className="w-full">
                    <Sparkles className="h-4 w-4" />
                    Generate content
                  </Button>

                  {/* AI Results */}
                  {aiResult && (
                    <div className="rounded-lg bg-purple-50 p-3 space-y-3 dark:bg-purple-950/30">
                      <p className="text-xs font-medium text-purple-700 dark:text-purple-300">Generated content</p>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{aiResult.content}</p>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => setContent(aiResult.content)} className="text-xs h-7">
                          Use this
                        </Button>
                        {Object.entries(aiResult.variants ?? {}).map(([platform, text]) => (
                          <Button
                            key={platform}
                            size="sm"
                            variant="outline"
                            onClick={() => applyVariant(platform as Platform)}
                            className="text-xs h-7 capitalize"
                          >
                            {platform} variant
                          </Button>
                        ))}
                        {aiResult.hashtags?.length > 0 && (
                          <Button size="sm" variant="outline" onClick={appendHashtags} className="text-xs h-7">
                            + Hashtags
                          </Button>
                        )}
                      </div>
                      {aiResult.hashtags?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {aiResult.hashtags.map((tag) => (
                            <span key={tag} className="text-xs text-purple-600 dark:text-purple-400">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Content Editor */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <Textarea
                placeholder="Write your post..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                className="resize-none text-sm"
              />
              <div className="flex items-center justify-between">
                <span className={cn('text-xs', charCount > charLimit ? 'text-red-500' : 'text-zinc-400')}>
                  {charCount} / {charLimit}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Account selector */}
          <Card>
            <CardContent className="p-4">
              <Label className="mb-3 block">Post to</Label>
              {socialAccounts.length === 0 ? (
                <p className="text-xs text-zinc-500">No accounts connected. Go to Social Accounts to connect.</p>
              ) : (
                <div className="space-y-2">
                  {socialAccounts.map((account) => {
                    const Icon = PLATFORM_ICONS[account.platform]
                    const color = getPlatformColor(account.platform)
                    const selected = selectedAccounts.includes(account.id)

                    return (
                      <button
                        key={account.id}
                        onClick={() => toggleAccount(account.id)}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-lg border p-2.5 text-left transition-all',
                          selected
                            ? 'border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-800'
                            : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700'
                        )}
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: `${color}15` }}>
                          <Icon className="h-3.5 w-3.5" style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">{account.account_name}</p>
                          <p className="text-[10px] text-zinc-400 capitalize">{account.platform}</p>
                        </div>
                        {selected && (
                          <div className="h-4 w-4 rounded-full bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center">
                            <X className="h-2.5 w-2.5 text-white dark:text-zinc-900" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label>Schedule for later</Label>
                <button
                  onClick={() => setIsScheduling((v) => !v)}
                  className={cn(
                    'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none',
                    isScheduling ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-200 dark:bg-zinc-700'
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none inline-block h-4 w-4 translate-x-0 rounded-full bg-white shadow-lg transition-transform dark:bg-zinc-900',
                      isScheduling && 'translate-x-4'
                    )}
                  />
                </button>
              </div>

              {isScheduling && (
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                />
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-2">
            {isScheduling ? (
              <Button className="w-full" onClick={() => handleSave('scheduled')}>
                <Clock className="h-4 w-4" />
                Schedule post
              </Button>
            ) : (
              <Button className="w-full" onClick={() => handleSave('published')}>
                <Send className="h-4 w-4" />
                Publish now
              </Button>
            )}
            <Button variant="outline" className="w-full" onClick={() => handleSave('draft')}>
              <Save className="h-4 w-4" />
              Save as draft
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
