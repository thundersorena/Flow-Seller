'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore, type Allowance, type User } from '@/lib/store/auth-store'

/**
 * Syncs the client store with the server session (JWT cookie) on mount.
 * Middleware already guards the routes; this keeps user data fresh.
 */
export function SessionSync() {
  const router = useRouter()
  const { setUser, setAllowance, logout } = useAuthStore()

  useEffect(() => {
    let cancelled = false
    fetch('/api/me')
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data: { user: User; allowance: Allowance }) => {
        if (cancelled) return
        setUser(data.user)
        setAllowance(data.allowance)
      })
      .catch(() => {
        if (cancelled) return
        logout()
        router.push('/login')
      })
    return () => { cancelled = true }
  }, [setUser, setAllowance, logout, router])

  return null
}
