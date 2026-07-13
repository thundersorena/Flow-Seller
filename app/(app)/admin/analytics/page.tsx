'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { TrendingUp, Zap, Users, Coins, CheckCircle2, Eye } from 'lucide-react'
import { AppHeader } from '@/components/app/header'
import { StatCard } from '@/components/app/stat-card'
import { StatusBadge } from '@/components/app/status-badge'
import type { Execution } from '@/lib/store/execution-store'

const COLORS = [
  'oklch(0.62 0.22 265)',
  'oklch(0.68 0.18 200)',
  'oklch(0.72 0.14 145)',
  'oklch(0.74 0.19 50)',
]

const TOOLTIP_STYLE = {
  contentStyle: {
    background: 'oklch(0.12 0 0)',
    border: '1px solid oklch(1 0 0 / 10%)',
    borderRadius: 10,
    fontSize: 12,
  },
  labelStyle: { color: 'oklch(0.96 0 0)' },
}

const TICK_STYLE = { fontSize: 11, fill: 'oklch(0.58 0 0)' }

interface AdminStats {
  totals: { totalExecutions: number; totalTokens: number; totalPromptTokens: number; totalCompletionTokens: number }
  byStatus: { status: string; count: number }[]
  byUser: { userId: string; userName: string; userEmail: string; executions: number; tokensUsed: number }[]
  byDay: { day: string; executions: number; tokensUsed: number }[]
}

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [executions, setExecutions] = useState<Execution[]>([])

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((res) => (res.ok ? res.json() : null))
      .then(setStats)
      .catch(() => setStats(null))
    fetch('/api/admin/executions')
      .then((res) => (res.ok ? res.json() : { executions: [] }))
      .then((data) => setExecutions(data.executions ?? []))
      .catch(() => setExecutions([]))
  }, [])

  const successCount = stats?.byStatus.find((s) => s.status === 'success')?.count ?? 0
  const successRate = stats && stats.totals.totalExecutions
    ? ((successCount / stats.totals.totalExecutions) * 100).toFixed(1)
    : '0.0'

  return (
    <div>
      <AppHeader title="Usage Monitoring" description="Every run, every token, for every user." />

      <div className="p-6 space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Executions" value={(stats?.totals.totalExecutions ?? 0).toLocaleString()} icon={Zap} />
          <StatCard title="Active Users" value={(stats?.byUser.length ?? 0).toLocaleString()} icon={Users} iconColor="bg-blue-500/10" iconTextColor="text-blue-400" />
          <StatCard title="Total Tokens" value={(stats?.totals.totalTokens ?? 0).toLocaleString()} icon={Coins} iconColor="bg-yellow-500/10" iconTextColor="text-yellow-400" />
          <StatCard title="Success Rate" value={`${successRate}%`} icon={CheckCircle2} iconColor="bg-green-500/10" iconTextColor="text-green-400" />
        </div>

        {/* Prompt vs completion tokens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-semibold text-sm">Daily Executions</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Last 30 days</p>
              </div>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats?.byDay ?? []}>
                <defs>
                  <linearGradient id="execGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" />
                <XAxis dataKey="day" tick={TICK_STYLE} axisLine={false} tickLine={false} />
                <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="executions" stroke={COLORS[0]} fill="url(#execGrad2)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-semibold text-sm">Daily Token Usage</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Last 30 days</p>
              </div>
              <Coins className="w-4 h-4 text-muted-foreground" />
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats?.byDay ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" vertical={false} />
                <XAxis dataKey="day" tick={TICK_STYLE} axisLine={false} tickLine={false} />
                <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: unknown) => [`${Number(v).toLocaleString()} tokens`, 'Tokens']} />
                <Bar dataKey="tokensUsed" radius={[4, 4, 0, 0]} fill={COLORS[1]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Per-user usage */}
        <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border/50">
            <h2 className="font-semibold text-sm">Usage by User</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20">
                  {['User', 'Email', 'Executions', 'Tokens Used'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(stats?.byUser ?? []).map((u) => (
                  <tr key={u.userId} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5 font-medium">{u.userName}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{u.userEmail}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{u.executions.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{u.tokensUsed.toLocaleString()}</td>
                  </tr>
                ))}
                {(stats?.byUser ?? []).length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-10 text-center text-muted-foreground text-sm">No usage yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* All executions */}
        <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border/50">
            <h2 className="font-semibold text-sm">All Executions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20">
                  {['User', 'Platforms', 'Media', 'Model', 'Prompt Tok.', 'Compl. Tok.', 'Total Tok.', 'Status', 'Date', ''].map((h, i) => (
                    <th key={i} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {executions.map((exec) => (
                  <tr key={exec.id} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">{exec.userName ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{exec.userEmail ?? ''}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground capitalize">{(exec.platforms ?? []).join(', ') || '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground capitalize">{exec.mediaType ?? 'text'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{exec.modelName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{(exec.promptTokens ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-muted-foreground">{(exec.completionTokens ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-muted-foreground">{exec.tokensUsed.toLocaleString()}</td>
                    <td className="px-4 py-3"><StatusBadge status={exec.status} /></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(exec.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Link href={`/results?id=${exec.id}`}>
                        <button className="p-1.5 rounded hover:bg-muted transition-colors" title="View">
                          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))}
                {executions.length === 0 && (
                  <tr><td colSpan={10} className="px-5 py-10 text-center text-muted-foreground text-sm">No executions yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
