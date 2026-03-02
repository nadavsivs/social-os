'use client'

import { useState } from 'react'
import { useWorkspaceStore } from '@/stores/workspace'
import { usePosts } from '@/hooks/use-posts'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn, getPlatformColor, formatDate } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Plus, Clock, CheckCircle2, FileText } from 'lucide-react'
import Link from 'next/link'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday,
  addMonths, subMonths, format,
} from 'date-fns'
import type { Post } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-zinc-200 text-zinc-700',
  scheduled: 'bg-amber-100 text-amber-700',
  published: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
}

export default function PlannerPage() {
  const { currentWorkspace } = useWorkspaceStore()
  const { data: posts = [] } = usePosts(currentWorkspace?.id)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  function getPostsForDay(day: Date): Post[] {
    return posts.filter((post) => {
      const date = post.scheduled_at ?? post.published_at ?? post.created_at
      return date && isSameDay(new Date(date), day)
    })
  }

  const selectedDayPosts = selectedDay ? getPostsForDay(selectedDay) : []

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Content planner</h1>
          <p className="mt-1 text-sm text-zinc-500">Plan and track your publishing schedule</p>
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard/compose">
            <Plus className="h-4 w-4" />
            New post
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            {/* Month nav */}
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <button
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                className="rounded-md p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {format(currentDate, 'MMMM yyyy')}
              </h2>
              <button
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                className="rounded-md p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-zinc-100 dark:border-zinc-800">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <div key={d} className="py-2.5 text-center text-xs font-medium text-zinc-400">
                  {d}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7">
              {days.map((day, i) => {
                const dayPosts = getPostsForDay(day)
                const isCurrentMonth = isSameMonth(day, currentDate)
                const isSelected = selectedDay && isSameDay(day, selectedDay)
                const today = isToday(day)

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={cn(
                      'relative min-h-[80px] p-2 text-left border-b border-r border-zinc-100 transition-colors dark:border-zinc-800',
                      i % 7 === 6 && 'border-r-0',
                      Math.floor(i / 7) === Math.floor((days.length - 1) / 7) && 'border-b-0',
                      !isCurrentMonth && 'opacity-30',
                      isSelected && 'bg-zinc-50 dark:bg-zinc-800',
                      !isSelected && 'hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs',
                        today
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                          : 'text-zinc-700 dark:text-zinc-300'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayPosts.slice(0, 2).map((post) => (
                        <div
                          key={post.id}
                          className={cn(
                            'truncate rounded px-1 py-0.5 text-[10px] font-medium',
                            STATUS_COLORS[post.status]
                          )}
                        >
                          {post.content?.slice(0, 20) || 'Untitled'}
                        </div>
                      ))}
                      {dayPosts.length > 2 && (
                        <span className="text-[10px] text-zinc-400">+{dayPosts.length - 2} more</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Day detail / upcoming */}
        <div className="space-y-4">
          {selectedDay ? (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {format(selectedDay, 'MMMM d, yyyy')}
              </h2>
              {selectedDayPosts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-center dark:border-zinc-700">
                  <p className="text-xs text-zinc-500">No posts this day</p>
                  <Button asChild variant="outline" size="sm" className="mt-3">
                    <Link href="/dashboard/compose">Schedule a post</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayPosts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Upcoming</h2>
              {posts.filter((p) => p.status === 'scheduled').length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-center dark:border-zinc-700">
                  <p className="text-xs text-zinc-500">No scheduled posts</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {posts
                    .filter((p) => p.status === 'scheduled' && p.scheduled_at)
                    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())
                    .slice(0, 6)
                    .map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Legend */}
          <div className="rounded-xl border border-zinc-100 p-4 space-y-2 dark:border-zinc-800">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Legend</p>
            {[
              { status: 'draft', label: 'Draft', Icon: FileText },
              { status: 'scheduled', label: 'Scheduled', Icon: Clock },
              { status: 'published', label: 'Published', Icon: CheckCircle2 },
            ].map(({ status, label, Icon }) => (
              <div key={status} className="flex items-center gap-2">
                <div className={cn('h-3 w-3 rounded', STATUS_COLORS[status])} />
                <span className="text-xs text-zinc-600 dark:text-zinc-400">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function PostCard({ post }: { post: Post }) {
  const date = post.scheduled_at ?? post.published_at ?? post.created_at
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs text-zinc-700 dark:text-zinc-300 line-clamp-2 flex-1">
          {post.content || 'Untitled'}
        </p>
        <Badge variant="secondary" className={cn('shrink-0 text-[10px]', STATUS_COLORS[post.status])}>
          {post.status}
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-zinc-400">{formatDate(date, 'long')}</span>
        <div className="flex gap-1">
          {post.platforms?.map((p) => (
            <span key={p} className="text-[10px] font-medium capitalize" style={{ color: getPlatformColor(p) }}>
              {p}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
