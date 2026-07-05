'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v3'
import { Eye, EyeOff, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/lib/store/auth-store'
import type { SafeUser } from '@/src/schema'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  agree: z.literal(true, { errorMap: () => ({ message: 'You must accept the terms' }) }),
})
type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const { setUser, setToken } = useAuthStore()
  const [showPw, setShowPw] = useState(false)
  const [serverError, setServerError] = useState('')

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) })

  const pw = watch('password', '')
  const checks = { length: pw.length >= 8, upper: /[A-Z]/.test(pw), number: /[0-9]/.test(pw) }

  const onSubmit = async (data: FormData) => {
    setServerError('')
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: data.name, email: data.email, password: data.password }),
    })
    const result = await res.json() as { user?: SafeUser; error?: string }

    if (!res.ok || result.error) {
      setServerError(result.error ?? 'Registration failed')
      return
    }

    const u = result.user!
    const createdAt = u.createdAt instanceof Date ? u.createdAt.toISOString() : String(u.createdAt)
    setUser({ id: u.id, name: u.name, email: u.email, role: u.role, emailVerified: u.emailVerified, createdAt })
    setToken('session')
    router.push('/verify-email')
  }

  return (
    <div className="glass rounded-2xl border border-border/60 p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Create your account</h1>
        <p className="text-sm text-muted-foreground">Start automating with AI in minutes</p>
      </div>

      {serverError && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" placeholder="Alex Rivera" autoComplete="name" {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input id="email" type="email" placeholder="you@company.com"
            autoComplete="email" {...register('email')} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input id="password" type={showPw ? 'text' : 'password'}
              placeholder="Create a strong password" autoComplete="new-password"
              {...register('password')} />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {pw && (
            <div className="grid grid-cols-3 gap-2 mt-1.5">
              {Object.entries(checks).map(([key, passed]) => (
                <div key={key} className={`flex items-center gap-1 text-[11px] ${passed ? 'text-green-400' : 'text-muted-foreground'}`}>
                  <Check className={`w-3 h-3 ${passed ? 'opacity-100' : 'opacity-30'}`} />
                  <span>{key === 'length' ? '8+ chars' : key === 'upper' ? 'Uppercase' : 'Number'}</span>
                </div>
              ))}
            </div>
          )}
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <div className="flex items-start gap-2.5">
          <input type="checkbox" id="agree" {...register('agree')}
            className="mt-0.5 w-4 h-4 rounded border-border accent-brand" />
          <Label htmlFor="agree" className="text-sm text-muted-foreground cursor-pointer leading-relaxed">
            I agree to the{' '}
            <Link href="#" className="text-brand hover:underline">Terms of Service</Link>
            {' '}and{' '}
            <Link href="#" className="text-brand hover:underline">Privacy Policy</Link>
          </Label>
        </div>
        {errors.agree && <p className="text-xs text-destructive">{errors.agree.message}</p>}

        <Button type="submit" className="w-full bg-brand text-white hover:bg-brand/90 border-0"
          disabled={isSubmitting}>
          {isSubmitting
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating account…</>
            : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-sm text-center text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-brand hover:underline font-medium">Sign in</Link>
      </p>
    </div>
  )
}
