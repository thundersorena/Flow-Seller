'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ShieldCheck, RotateCcw, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

const RESEND_COOLDOWN = 60

export default function VerifyEmailPage() {
  const router = useRouter()
  const [otp, setOtp]           = useState(['', '', '', '', '', ''])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState(false)
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN)
  const [resending, setResending] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // useEffect(() => { inputRefs.current[0]?.focus() }, [])

  // On mount: send the OTP (also handles direct navigation to this page)
  useEffect(() => {
    fetch('/api/auth/send-otp', { method: 'POST' })
      .then(r => r.json())
      .then((d: { error?: string }) => {
        if (d.error === 'Unauthorized') {
          // No session — redirect back to register
          router.replace('/register')
        }
      })
      .catch(() => null)
  }, [router])

  // Count down the resend timer
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const verify = useCallback(async (code: string) => {
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/auth/verify-otp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ code, mode: 'verify-email' }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) { setError(data.error ?? 'Verification failed'); return }
      setSuccess(true)
      setTimeout(() => router.push('/dashboard'), 1200)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [router])

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return
    const next = [...otp]
    next[index] = value
    setOtp(next)
    setError('')
    if (value && index < 5) inputRefs.current[index + 1]?.focus()
    if (value && index === 5 && next.every(Boolean)) verify(next.join(''))
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!text) return
    e.preventDefault()
    const next = Array(6).fill('') as string[]
    text.split('').forEach((d, i) => { next[i] = d })
    setOtp(next)
    setError('')
    inputRefs.current[Math.min(text.length - 1, 5)]?.focus()
    if (text.length === 6) verify(text)
  }

  const handleResend = async () => {
    setResending(true)
    setError('')
    setOtp(['', '', '', '', '', ''])
    inputRefs.current[0]?.focus()
    try {
      const res  = await fetch('/api/auth/send-otp', { method: 'POST' })
      const data = await res.json() as { error?: string }
      if (!res.ok) { setError(data.error ?? 'Failed to resend'); return }
      setCooldown(RESEND_COOLDOWN)
    } catch {
      setError('Network error.')
    } finally {
      setResending(false)
    }
  }

  if (success) {
    return (
      <div className="glass rounded-2xl border border-border/60 p-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-8 h-8 text-green-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Email verified!</h1>
        <p className="text-sm text-muted-foreground">Redirecting you to the dashboard…</p>
      </div>
    )
  }

  const filledCount = otp.filter(Boolean).length

  return (
    <div className="glass rounded-2xl border border-border/60 p-8 text-center w-full max-w-sm mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto mb-5">
        <ShieldCheck className="w-7 h-7 text-brand" />
      </div>

      <h1 className="text-2xl font-bold mb-1">Check your inbox</h1>
      <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
        We sent a 6-digit code to your email.<br />
        Enter it below — it expires in 15 minutes.
      </p>

      {/* OTP inputs */}
      <div className="flex justify-center gap-2 mb-5" onPaste={handlePaste}>
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={el => { inputRefs.current[i] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            autoComplete="one-time-code"
            disabled={loading || success}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            className={[
              'w-11 h-14 text-center text-xl font-bold rounded-xl border transition-all outline-none',
              'bg-muted/50 text-foreground',
              digit
                ? 'border-brand ring-2 ring-brand/20'
                : 'border-border focus:border-brand focus:ring-2 focus:ring-brand/20',
              loading ? 'opacity-50 cursor-not-allowed' : '',
            ].join(' ')}
          />
        ))}
      </div>

      {error && (
        <div className="mb-4 px-4 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button
        onClick={() => { if (filledCount === 6) verify(otp.join('')) }}
        disabled={filledCount < 6 || loading}
        className="w-full bg-brand text-white hover:bg-brand/90 border-0 mb-5"
      >
        {loading
          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying…</>
          : 'Verify email'}
      </Button>

      <p className="text-sm text-muted-foreground">
        Didn&apos;t get the code?{' '}
        {cooldown > 0
          ? <span className="text-muted-foreground/50">Resend in {cooldown}s</span>
          : (
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-brand hover:underline disabled:opacity-50 inline-flex items-center gap-1"
            >
              {resending && <RotateCcw className="w-3 h-3 animate-spin" />}
              Resend code
            </button>
          )
        }
      </p>
    </div>
  )
}
