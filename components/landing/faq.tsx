'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const FAQS = [
  {
    q: 'What is FlowAI and how does it work?',
    a: 'FlowAI is an AI content automation platform. You describe what you need through our interface, our AI engine generates the content, and it publishes straight to your social channels — all in seconds.',
  },
  {
    q: 'Do I need to know how to code?',
    a: 'No coding required. Pick your channels, describe your content, and your automation is live. FlowAI handles generation and publishing automatically.',
  },
  {
    q: 'Which AI models are supported?',
    a: 'We support all major models: GPT-4o, GPT-4o-mini, Claude 3.5 Sonnet, Claude 3 Haiku, Gemini 1.5 Pro, Gemini 1.5 Flash, Llama 3, and more. You can configure different models per workflow.',
  },
  {
    q: 'How does token tracking work?',
    a: 'Every execution automatically tracks the number of tokens consumed by the AI model. You can view this in your dashboard per execution, per workflow, and in aggregate analytics.',
  },
  {
    q: 'Which platforms can I publish to?',
    a: 'FlowAI publishes to Telegram channels, Bale, WhatsApp and Instagram, with more channels on the way. Select any combination per post.',
  },
  {
    q: 'Is there a free tier?',
    a: 'Yes! The Starter plan is permanently free with 100 executions and 500K tokens per month. No credit card required to get started.',
  },
  {
    q: 'How do you handle data security?',
    a: 'All data is encrypted in transit (TLS 1.3) and at rest (AES-256). We never store your AI outputs beyond 90 days by default. Enterprise customers get dedicated infrastructure and custom retention policies.',
  },
]

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="py-24">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand mb-3">FAQ</p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Frequently asked questions
          </h2>
        </div>

        <div className="space-y-2">
          {FAQS.map((faq, i) => (
            <div
              key={i}
              className="border border-border/60 rounded-xl overflow-hidden"
            >
              <button
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-muted/30 transition-colors"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
              >
                <span className="font-medium text-sm pr-4">{faq.q}</span>
                <ChevronDown
                  className={cn(
                    'w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200',
                    open === i && 'rotate-180'
                  )}
                />
              </button>
              {open === i && (
                <div className="px-6 pb-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
