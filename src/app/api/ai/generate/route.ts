import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import type { AIGenerationRequest, Platform } from '@/types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const PLATFORM_GUIDES: Record<Platform, string> = {
  instagram: 'Instagram: visual storytelling, emoji-friendly, 2200 char max, strong hashtag culture, first line must hook instantly',
  facebook: 'Facebook: longer form acceptable, conversational, encourages shares/discussion, links work well, up to 63206 chars',
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body: AIGenerationRequest = await req.json()
    const { topic, tone, platforms, additional_context, workspace_id } = body

    if (!topic?.trim()) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
    }

    const platformGuides = platforms.map((p) => PLATFORM_GUIDES[p]).join('\n')

    const systemPrompt = `You are an expert social media copywriter. Your job is to create compelling, platform-optimized content.

Platform guidelines:
${platformGuides}

Tone: ${tone}
${additional_context ? `Brand context: ${additional_context}` : ''}

RULES:
- Never use generic filler phrases like "In today's digital age" or "Are you ready to..."
- Be specific, authentic, and value-driven
- Each variant must feel native to its platform
- Hashtags should be strategic and relevant (5-10 max)
- Return ONLY valid JSON, no markdown`

    const userPrompt = `Create social media content for: "${topic}"

Return a JSON object with:
{
  "content": "primary version (works across platforms)",
  "platform_variants": {
    ${platforms.map((p) => `"${p}": "platform-specific version"`).join(',\n    ')}
  },
  "suggested_hashtags": ["#tag1", "#tag2", "..."],
  "suggested_posting_time": "best time suggestion as a string"
}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 1200,
    })

    const raw = completion.choices[0]?.message?.content
    if (!raw) throw new Error('Empty response from OpenAI')

    const parsed = JSON.parse(raw)

    return NextResponse.json({
      content: parsed.content ?? '',
      variants: parsed.platform_variants ?? {},
      hashtags: parsed.suggested_hashtags ?? [],
      suggested_posting_time: parsed.suggested_posting_time,
    })
  } catch (err) {
    console.error('[AI Generate]', err)
    return NextResponse.json({ error: 'AI generation failed' }, { status: 500 })
  }
}
