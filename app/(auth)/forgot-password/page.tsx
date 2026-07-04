'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v3'
import { Loader2, ArrowLeft, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'

const emailSchema = z.object({ email: z.string().email('Enter a valid email') })
type EmailData = z.infer<typeof emailSchema>

const resetSchema = z.object({
  code:        z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
})
type ResetData = z.infer<typeof resetSchema>

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const emailForm = useForm<EmailData>({ resolver: zodResolver(emailSchema) })
  const resetForm = useForm<ResetData>({ resolver: zodResolver(resetSchema) })

  const onRequest = async (data: EmailData) => {
    setError('')
    try {
      await api('/api/forgot-password', { method: 'POST', body: JSON.stringify(data) })
      setEmail(data.email)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the reset code.')
    }
  }

  const onReset = async (data: ResetData) => {
    setError('')
    try {
      await api('/api/forgot-password', {
        method: 'PUT',
        body: JSON.stringify({ email, code: data.code, newPassword: data.newPassword }),
      })
      router.push('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed.')
    }
  }

  if (email) {
    return (
      <div className="glass rounded-2xl border border-border/60 p-8">
        <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-brand" />
        </div>
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">Check your inbox</h1>
          <p className="text-sm text-muted-foreground">
            We sent a 6-digit reset code to <span className="text-foreground font-medium">{email}</span>.
            Enter it below with your new password.
          </p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={resetForm.handleSubmit(onReset)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="code">Reset code</Label>
            <Input id="code" inputMode="numeric" maxLength={6} placeholder="123456" {...resetForm.register('code')} />
            {resetForm.formState.errors.code && (
              <p className="text-xs text-destructive">{resetForm.formState.errors.code.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">New password</Label>
            <Input id="newPassword" type="password" placeholder="••••••••" {...resetForm.register('newPassword')} />
            {resetForm.formState.errors.newPassword && (
              <p className="text-xs text-destructive">{resetForm.formState.errors.newPassword.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full bg-brand text-white hover:bg-brand/90 border-0" disabled={resetForm.formState.isSubmitting}>
            {resetForm.formState.isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Resetting…</> : 'Reset password'}
          </Button>
        </form>

        <Link href="/login" className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mt-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl border border-border/60 p-8">
      <Link href="/login" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to sign in
      </Link>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Reset your password</h1>
        <p className="text-sm text-muted-foreground">We&apos;ll email you a 6-digit reset code.</p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={emailForm.handleSubmit(onRequest)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <Input id="email" type="email" placeholder="you@company.com" {...emailForm.register('email')} />
          {emailForm.formState.errors.email && (
            <p className="text-xs text-destructive">{emailForm.formState.errors.email.message}</p>
          )}
        </div>
        <Button type="submit" className="w-full bg-brand text-white hover:bg-brand/90 border-0" disabled={emailForm.formState.isSubmitting}>
          {emailForm.formState.isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</> : 'Send reset code'}
        </Button>
      </form>
    </div>
  )
}
