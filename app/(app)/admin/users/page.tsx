'use client'

import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import {
  Search, MoreHorizontal, ShieldCheck, ShieldOff, UserX,
  CheckCircle2, Clock, Users, Coins, CreditCard,
} from 'lucide-react'
import { AppHeader } from '@/components/app/header'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

type UserStatus = 'active' | 'suspended'

interface AdminUser {
  id: string
  name: string
  email: string
  role: 'user' | 'admin'
  status: UserStatus
  emailVerified: boolean
  bonusTokens: number
  createdAt: string
  planId: string | null
  planName: string | null
  executions: number
  tokensUsed: number
}

interface PlanOption {
  id: string
  name: string
  dailyTokenLimit: number
}

const STATUS_CONFIG: Record<UserStatus, { label: string; classes: string }> = {
  active:    { label: 'Active',    classes: 'bg-green-500/15 text-green-400 border-green-500/20' },
  suspended: { label: 'Suspended', classes: 'bg-red-500/15 text-red-400 border-red-500/20' },
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [plans, setPlans] = useState<PlanOption[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all')
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    const [usersRes, plansRes] = await Promise.all([
      api<{ users: AdminUser[] }>('/api/admin/users'),
      api<{ plans: PlanOption[] }>('/api/admin/plans'),
    ])
    setUsers(usersRes.users)
    setPlans(plansRes.plans)
  }, [])

  useEffect(() => {
    refresh().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load users.'))
  }, [refresh])

  const patchUser = async (id: string, body: Record<string, unknown>) => {
    setOpenMenu(null)
    setError('')
    try {
      await api(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed.')
    }
  }

  const deleteUser = async (id: string) => {
    setOpenMenu(null)
    if (!window.confirm('Delete this user and all their data? This cannot be undone.')) return
    setError('')
    try {
      await api(`/api/admin/users/${id}`, { method: 'DELETE' })
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.')
    }
  }

  const grantTokens = async (user: AdminUser) => {
    setOpenMenu(null)
    const input = window.prompt(
      `Grant bonus tokens to ${user.email} (current balance: ${user.bonusTokens.toLocaleString()}).\nEnter an amount — negative to revoke:`,
      '1000',
    )
    if (!input) return
    const amount = Number(input)
    if (!Number.isInteger(amount) || amount === 0) { setError('Enter a non-zero whole number of tokens.'); return }
    await patchUser(user.id, { grantTokens: amount })
  }

  const filtered = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || u.status === statusFilter
    return matchSearch && matchStatus
  })

  const counts = {
    all: users.length,
    active: users.filter((u) => u.status === 'active').length,
    unverified: users.filter((u) => !u.emailVerified).length,
    suspended: users.filter((u) => u.status === 'suspended').length,
  }

  return (
    <div>
      <AppHeader
        title="User Management"
        description="Manage users, plans, and token grants."
      />

      <div className="p-6 space-y-6">
        {error && (
          <div className="px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {([
            { label: 'Total Users', value: counts.all,        icon: Users,        color: 'text-brand',      bg: 'bg-brand/10' },
            { label: 'Active',      value: counts.active,     icon: CheckCircle2, color: 'text-green-400',  bg: 'bg-green-500/10' },
            { label: 'Unverified',  value: counts.unverified, icon: Clock,        color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
            { label: 'Suspended',   value: counts.suspended,  icon: UserX,        color: 'text-red-400',    bg: 'bg-red-500/10' },
          ] as const).map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-card border border-border/60 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">{label}</p>
                <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center', bg)}>
                  <Icon className={cn('w-4 h-4', color)} />
                </div>
              </div>
              <p className="text-2xl font-bold">{value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-4 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:border-brand transition-colors"
            />
          </div>
          <div className="flex gap-1">
            {(['all', 'active', 'suspended'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize',
                  statusFilter === s
                    ? 'bg-brand text-white'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                {s} {s !== 'all' && <span className="opacity-60">({counts[s]})</span>}
              </button>
            ))}
          </div>
        </div>

        {/* User table */}
        <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  {['User', 'Role', 'Verified', 'Plan', 'Executions', 'Tokens Used', 'Bonus Tokens', 'Joined', 'Status', ''].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => {
                  const statusCfg = STATUS_CONFIG[user.status]
                  return (
                    <tr
                      key={user.id}
                      className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-brand/20 text-brand text-xs font-semibold">
                              {user.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium leading-tight">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs capitalize',
                            user.role === 'admin'
                              ? 'border-brand/40 text-brand bg-brand/10'
                              : 'border-border text-muted-foreground'
                          )}
                        >
                          {user.role}
                        </Badge>
                      </td>

                      <td className="px-5 py-4">
                        {user.emailVerified ? (
                          <span className="flex items-center gap-1 text-green-400 text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-muted-foreground text-xs">
                            <Clock className="w-3.5 h-3.5" /> Pending
                          </span>
                        )}
                      </td>

                      {/* Plan selector */}
                      <td className="px-5 py-4">
                        <select
                          value={user.planId ?? ''}
                          onChange={(e) => patchUser(user.id, { planId: e.target.value || null })}
                          className="h-8 px-2 text-xs bg-muted border border-border rounded-lg focus:outline-none focus:border-brand"
                        >
                          <option value="">No plan</option>
                          {plans.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.dailyTokenLimit.toLocaleString()}/day)
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-5 py-4 text-muted-foreground">{user.executions.toLocaleString()}</td>
                      <td className="px-5 py-4 text-muted-foreground">{user.tokensUsed.toLocaleString()}</td>
                      <td className="px-5 py-4 text-muted-foreground">{user.bonusTokens.toLocaleString()}</td>

                      <td className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(user.createdAt), 'MMM d, yyyy')}
                      </td>

                      <td className="px-5 py-4">
                        <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border', statusCfg.classes)}>
                          {statusCfg.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}
                            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          {openMenu === user.id && (
                            <div className="absolute right-0 top-8 z-20 bg-popover border border-border rounded-xl shadow-lg w-48 py-1 overflow-hidden">
                              <button
                                onClick={() => grantTokens(user)}
                                className="flex items-center gap-2.5 w-full px-4 py-2 text-sm hover:bg-muted transition-colors text-left"
                              >
                                <Coins className="w-3.5 h-3.5" /> Grant Tokens
                              </button>
                              {user.role !== 'admin' && (
                                <button
                                  onClick={() => patchUser(user.id, { role: 'admin' })}
                                  className="flex items-center gap-2.5 w-full px-4 py-2 text-sm hover:bg-muted transition-colors text-left"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" /> Make Admin
                                </button>
                              )}
                              {user.status === 'active' ? (
                                <button
                                  onClick={() => patchUser(user.id, { status: 'suspended' })}
                                  className="flex items-center gap-2.5 w-full px-4 py-2 text-sm hover:bg-muted transition-colors text-left"
                                >
                                  <ShieldOff className="w-3.5 h-3.5" /> Suspend User
                                </button>
                              ) : (
                                <button
                                  onClick={() => patchUser(user.id, { status: 'active' })}
                                  className="flex items-center gap-2.5 w-full px-4 py-2 text-sm hover:bg-muted transition-colors text-left"
                                >
                                  <CreditCard className="w-3.5 h-3.5" /> Reactivate User
                                </button>
                              )}
                              <button
                                onClick={() => deleteUser(user.id)}
                                className="flex items-center gap-2.5 w-full px-4 py-2 text-sm hover:bg-destructive/10 text-destructive transition-colors text-left"
                              >
                                <UserX className="w-3.5 h-3.5" /> Delete User
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground text-sm">
              No users found matching your search.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
