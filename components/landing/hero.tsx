'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, Play, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function Hero() {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)
  const dashboardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const runGsap = async () => {
      const { gsap } = await import('gsap')
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.fromTo(
        headingRef.current,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9 }
      )
        .fromTo(
          subtitleRef.current,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7 },
          '-=0.5'
        )
        .fromTo(
          ctaRef.current,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6 },
          '-=0.4'
        )
        .fromTo(
          dashboardRef.current,
          { y: 60, opacity: 0 },
          { y: 0, opacity: 1, duration: 1 },
          '-=0.3'
        )

      // Floating animation on dashboard card
      gsap.to(dashboardRef.current, {
        y: -12,
        duration: 3,
        ease: 'power1.inOut',
        yoyo: true,
        repeat: -1,
      })
    }
    runGsap()
  }, [])

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-20 pb-16 overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 grid-bg opacity-40" />
      {/* Radial glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-brand/10 blur-[120px] pointer-events-none" />

      <div className="relative z-10 container mx-auto px-4 max-w-6xl text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand/30 bg-brand/10 text-brand text-xs font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
          Powered by an AI Automation Engine
        </div>

        {/* Headline */}
        <h1
          ref={headingRef}
          className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 leading-[1.05]"
        >
          Automate anything
          <br />
          <span className="gradient-text">with AI precision</span>
        </h1>

        {/* Subtitle */}
        <p
          ref={subtitleRef}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Submit data, trigger intelligent n8n workflows, and receive AI-generated results
          in seconds. No code required. Enterprise-grade reliability.
        </p>

        {/* CTA buttons */}
        <div ref={ctaRef} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link href="/register">
            <Button size="lg" className="bg-brand text-white hover:bg-brand/90 border-0 px-8 py-3 text-base h-auto gap-2">
              Start automating free
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
            <span className="w-9 h-9 rounded-full border border-border flex items-center justify-center group-hover:border-brand/50 transition-colors">
              <Play className="w-3.5 h-3.5 ml-0.5" />
            </span>
            Watch 2-min demo
          </button>
        </div>

        {/* Trust indicators */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-16 text-xs text-muted-foreground">
          {['No credit card required', 'Free 14-day trial', 'Cancel anytime'].map((item) => (
            <span key={item} className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-brand" />
              {item}
            </span>
          ))}
        </div>

        {/* Dashboard preview */}
        <div ref={dashboardRef} className="relative mx-auto max-w-4xl">
          <div className="glass rounded-2xl border border-border/60 overflow-hidden shadow-2xl">
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/30">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <div className="w-3 h-3 rounded-full bg-green-500/70" />
              <div className="flex-1 mx-4 h-6 rounded bg-muted/50 flex items-center px-3">
                <span className="text-[10px] text-muted-foreground">app.flowai.dev/dashboard</span>
              </div>
            </div>
            {/* Dashboard content */}
            <div className="p-6 grid grid-cols-4 gap-4">
              {[
                { label: 'Total Executions', value: '12,847', color: 'text-brand' },
                { label: 'Success Rate', value: '96.4%', color: 'text-green-400' },
                { label: 'Tokens Used', value: '48.2M', color: 'text-yellow-400' },
                { label: 'Active Users', value: '1,247', color: 'text-blue-400' },
              ].map((stat) => (
                <div key={stat.label} className="bg-muted/30 rounded-xl p-4 border border-border/50">
                  <p className="text-[10px] text-muted-foreground mb-1">{stat.label}</p>
                  <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
              {/* Execution table preview */}
              <div className="col-span-4 bg-muted/20 rounded-xl border border-border/50 overflow-hidden">
                <div className="px-4 py-2 border-b border-border/50 flex items-center justify-between">
                  <span className="text-xs font-medium">Recent Executions</span>
                  <Badge variant="outline" className="text-[10px] h-5 border-brand/30 text-brand">Live</Badge>
                </div>
                {[
                  { name: 'Content Generator', model: 'GPT-4o', tokens: '1,240', status: 'success', time: '2s' },
                  { name: 'Data Analyzer', model: 'Claude 3.5', tokens: '3,108', status: 'success', time: '4s' },
                  { name: 'Email Drafter', model: 'GPT-4o-mini', tokens: '820', status: 'running', time: '—' },
                ].map((row, i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-2.5 border-b last:border-0 border-border/30 text-[11px]">
                    <span className="text-foreground font-medium w-36 truncate">{row.name}</span>
                    <span className="text-muted-foreground w-24">{row.model}</span>
                    <span className="text-muted-foreground w-16">{row.tokens}</span>
                    <span className="text-muted-foreground w-8">{row.time}</span>
                    <span
                      className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        row.status === 'success'
                          ? 'bg-green-500/15 text-green-400'
                          : 'bg-yellow-500/15 text-yellow-400'
                      }`}
                    >
                      {row.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Decorative glow under card */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-16 bg-brand/20 blur-2xl rounded-full" />
        </div>
      </div>
    </section>
  )
}
