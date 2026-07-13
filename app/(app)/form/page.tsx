'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Send, Image as ImageIcon, Video, Type, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AppHeader } from '@/components/app/header'
import { useExecutionStore } from '@/lib/store/execution-store'
import { cn } from '@/lib/utils'

const PLATFORMS = [
  { id: 'telegram', name: 'Telegram', desc: 'Publishes to your channel' },
  { id: 'bale', name: 'Bale', desc: 'Publishes to your Bale channel' },
  { id: 'whatsapp', name: 'WhatsApp', desc: 'Sends via WhatsApp Business' },
  { id: 'instagram', name: 'Instagram', desc: 'Posts to your IG account' },
]

const MEDIA_TYPES = [
  { value: 'text', label: 'Text only', icon: Type, desc: 'Written post, no media' },
  { value: 'image', label: 'With image', icon: ImageIcon, desc: 'AI-generated visual' },
  { value: 'video', label: 'With video', icon: Video, desc: 'AI-generated short video' },
] as const

const TONES = ['Professional', 'Casual', 'Technical', 'Creative', 'Persuasive']
const LENGTHS = [
  { value: 'Short', desc: '~200 words' },
  { value: 'Medium', desc: '~600 words' },
  { value: 'Long', desc: '~1200 words' },
]

export default function FormPage() {
  const router = useRouter()
  const { setCurrentExecution, addExecution } = useExecutionStore()

  const [prompt, setPrompt] = useState('')
  const [topic, setTopic] = useState('')
  const [tone, setTone] = useState('Professional')
  const [length, setLength] = useState('Medium')
  const [platforms, setPlatforms] = useState<string[]>(['telegram'])
  const [mediaType, setMediaType] = useState<'text' | 'image' | 'video'>('text')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const togglePlatform = (id: string) =>
    setPlatforms((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))

  const canSubmit = prompt.trim().length >= 10 && platforms.length > 0 && !submitting

  const onSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/executions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), topic, tone, length, platforms, mediaType }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        return
      }
      setCurrentExecution(data.execution)
      addExecution(data.execution)
      router.push(`/results?id=${data.execution.id}`)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <AppHeader title="Create Content" description="Describe what you need — AI writes, designs and publishes it to your channels." />

      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Chat-style request box */}
        <div className="bg-card border border-border/60 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-brand/15 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-brand" />
            </div>
            <div>
              <p className="font-medium text-sm">Tell the AI what you need</p>
              <p className="text-xs text-muted-foreground">The more detail you give, the better the result — audience, key points, style, links, anything.</p>
            </div>
          </div>
          <Textarea
            rows={7}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={'e.g. Write an engaging post announcing our new AI analytics dashboard. Audience: startup founders. Mention the free trial, keep it energetic, end with a question to spark comments…'}
            className="resize-y"
          />
          <div className="flex justify-between mt-2">
            <p className="text-xs text-muted-foreground">{prompt.trim().length < 10 ? 'At least 10 characters' : `${prompt.trim().length} characters`}</p>
          </div>
        </div>

        {/* Platforms */}
        <div className="space-y-2">
          <Label>Publish to</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => togglePlatform(p.id)}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all',
                  platforms.includes(p.id) ? 'border-brand bg-brand/10' : 'border-border hover:border-border/80'
                )}
              >
                <p className={cn('font-medium text-sm', platforms.includes(p.id) ? 'text-brand' : '')}>{p.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Media type */}
        <div className="space-y-2">
          <Label>Media</Label>
          <div className="grid grid-cols-3 gap-3">
            {MEDIA_TYPES.map(({ value, label, icon: Icon, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMediaType(value)}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all',
                  mediaType === value ? 'border-brand bg-brand/10' : 'border-border hover:border-border/80'
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className={cn('w-4 h-4', mediaType === value ? 'text-brand' : 'text-muted-foreground')} />
                  <p className={cn('font-medium text-sm', mediaType === value ? 'text-brand' : '')}>{label}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Optional details */}
        <div className="grid md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label htmlFor="topic">Topic / Title <span className="text-muted-foreground">(optional)</span></Label>
            <Input id="topic" placeholder="e.g. AI in healthcare" value={topic} onChange={(e) => setTopic(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Tone</Label>
            <div className="flex flex-wrap gap-2">
              {TONES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTone(t)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm border transition-all',
                    tone === t ? 'border-brand bg-brand/10 text-brand' : 'border-border text-muted-foreground hover:border-border/80'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Length</Label>
          <div className="grid grid-cols-3 gap-3">
            {LENGTHS.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => setLength(l.value)}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all',
                  length === l.value ? 'border-brand bg-brand/10' : 'border-border hover:border-border/80'
                )}
              >
                <p className={cn('font-medium text-sm', length === l.value ? 'text-brand' : '')}>{l.value}</p>
                <p className="text-xs text-muted-foreground">{l.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-sm text-destructive">{error}</div>
        )}

        <Button
          onClick={onSubmit}
          disabled={!canSubmit}
          className="w-full bg-brand text-white hover:bg-brand/90 border-0 gap-2 h-11"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Starting your automation…
            </>
          ) : (
            <>
              <Send className="w-4 h-4" /> Generate & Publish
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
