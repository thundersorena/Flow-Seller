'use client'

import { useEffect, useRef } from 'react'
import { Zap, Brain, Shield, BarChart3, RefreshCw, Workflow } from 'lucide-react'

const FEATURES = [
  {
    icon: Zap,
    title: 'Instant AI Execution',
    description:
      'Submit data and receive AI-generated results in under 5 seconds. Powered by state-of-the-art language models with real-time streaming.',
  },
  {
    icon: Workflow,
    title: 'Smart Automation Engine',
    description:
      'One request fans out into a full pipeline: writing, image or video generation, and multi-channel publishing — no code needed.',
  },
  {
    icon: Brain,
    title: 'Multi-Model Support',
    description:
      'Choose from GPT-4o, Claude 3.5, Gemini 1.5, and more. Switch models per workflow to optimize cost and performance.',
  },
  {
    icon: BarChart3,
    title: 'Deep Analytics',
    description:
      'Track every execution — tokens consumed, model used, execution time, and success rates. Understand your automation ROI.',
  },
  {
    icon: RefreshCw,
    title: 'One-Click Rerun',
    description:
      'Re-execute any past automation with the same or updated inputs. Full execution history with diff comparison.',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description:
      'Role-based access control, audit logs, API key management, and SOC 2 compliant infrastructure. Your data is always safe.',
  },
]

export function Features() {
  const sectionRef = useRef<HTMLElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const runGsap = async () => {
      const { gsap } = await import('gsap')
      const { ScrollTrigger } = await import('gsap/ScrollTrigger')
      gsap.registerPlugin(ScrollTrigger)

      const headerEl = sectionRef.current?.querySelector('.section-header')
      if (headerEl) {
        gsap.fromTo(
          headerEl,
          { y: 40, opacity: 0 },
          {
            y: 0, opacity: 1, duration: 0.8,
            scrollTrigger: { trigger: sectionRef.current, start: 'top 80%' },
          }
        )
      }

      const cards = cardsRef.current?.querySelectorAll('.feature-card')
      if (cards && cards.length > 0) {
        gsap.fromTo(
          Array.from(cards),
          { y: 40, opacity: 0 },
          {
            y: 0, opacity: 1, duration: 0.6, stagger: 0.1,
            scrollTrigger: { trigger: cardsRef.current, start: 'top 75%' },
          }
        )
      }
    }
    runGsap()
  }, [])

  return (
    <section ref={sectionRef} id="features" className="py-24 relative">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="section-header text-center mb-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand mb-3">Features</p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Everything you need to automate
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
            A complete platform from form submission to AI output — batteries included.
          </p>
        </div>

        {/* Cards grid */}
        <div
          ref={cardsRef}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="feature-card group p-6 rounded-2xl border border-border/60 bg-card hover:border-brand/30 hover:bg-brand/5 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center mb-4 group-hover:bg-brand/20 transition-colors">
                <feature.icon className="w-5 h-5 text-brand" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
