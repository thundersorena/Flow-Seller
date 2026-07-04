'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore, type User } from '@/lib/store/auth-store'
import { api } from '@/lib/api'

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, setUser } = useAuthStore()
  const email = searchParams.get('email') ?? user?.email ?? ''

  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    if (value && index < 5) inputRefs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleVerify = async () => {
    if (otp.some((d) => !d)) { setError('Enter all 6 digits'); return }
    if (!email) { setError('Missing email — please sign in again.'); return }
    setError('')
    setLoading(true)
    try {
      const { user: verified } = await api<{ user: User }>('/api/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email, code: otp.join('') }),
      })
      setUser(verified)
      router.push(verified.role === 'admin' ? '/admin' : '/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email) { setError('Missing email — please sign in again.'); return }
    setError('')
    setInfo('')
    setResending(true)
    try {
      await api('/api/verify-email', { method: 'POST', body: JSON.stringify({ email }) })
      setInfo('A new code has been sent to your email.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend the code.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="glass rounded-2xl border border-border/60 p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto mb-6">
        <ShieldCheck className="w-8 h-8 text-brand" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Verify your email</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Enter the 6-digit code we sent to<br />
        <span className="text-foreground font-medium">{email || 'your email'}</span>
      </p>

      <div className="flex justify-center gap-2 mb-6">
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="w-12 h-14 text-center text-xl font-bold bg-muted border border-border rounded-xl focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
          />
        ))}
      </div>

      {error && <p className="text-sm text-destructive mb-4">{error}</p>}
      {info && <p className="text-sm text-green-400 mb-4">{info}</p>}

      <Button onClick={handleVerify} className="w-full bg-brand text-white hover:bg-brand/90 border-0 mb-4" disabled={loading}>
        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying…</> : 'Verify email'}
      </Button>

      <p className="text-sm text-muted-foreground">
        Didn&apos;t receive the code?{' '}
        <button onClick={handleResend} disabled={resending} className="text-brand hover:underline disabled:opacity-50">
          {resending ? 'Sending…' : 'Resend'}
        </button>
      </p>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground text-sm text-center">Loading…</div>}>
      <VerifyEmailContent />
    </Suspense>
  )
}
