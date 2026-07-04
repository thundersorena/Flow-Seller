'use client'

import { useEffect, useState } from 'react'
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { TrendingUp, Zap, Users, Coins, CheckCircle2 } from 'lucide-react'
import { AppHeader } from '@/components/app/header'
import { StatCard } from '@/components/app/stat-card'
import { StatusBadge } from '@/components/app/status-badge'
import { api } from '@/lib/api'
import type { AdminAnalytics } from '../page'

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

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AdminAnalytics | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api<AdminAnalytics>('/api/admin/analytics')
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load analytics.'))
  }, [])

  return (
    <div>
      <AppHeader title="Platform Analytics" description="Deep-dive metrics across all users and workflows." />

      <div className="p-6 space-y-6">
        {error && (
          <div className="px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Executions" value={(data?.totalExecutions ?? 0).toLocaleString()} icon={Zap} />
          <StatCard title="Active Users" value={(data?.activeUsers ?? 0).toLocaleString()} icon={Users} iconColor="bg-blue-500/10" iconTextColor="text-blue-400" />
          <StatCard title="Total Tokens" value={(data?.totalTokens ?? 0).toLocaleString()} icon={Coins} iconColor="bg-yellow-500/10" iconTextColor="text-yellow-400" />
          <StatCard title="Success Rate" value={data ? `${data.successRate}%` : '—'} icon={CheckCircle2} iconColor="bg-green-500/10" iconTextColor="text-green-400" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Daily executions */}
          <div className="lg:col-span-2 bg-card border border-border/60 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-semibold text-sm">Daily Executions</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Last 7 days</p>
              </div>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data?.executionsByDay ?? []}>
                <defs>
                  <linearGradient id="execGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" />
                <XAxis dataKey="date" tick={TICK_STYLE} axisLine={false} tickLine={false} />
                <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="count" stroke={COLORS[0]} fill="url(#execGrad2)" strokeWidth={2} name="Executions" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Token usage by model - pie */}
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <h2 className="font-semibold text-sm mb-5">Tokens by Model</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data?.tokensByModel ?? []}
                  dataKey="tokens"
                  nameKey="model"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {(data?.tokensByModel ?? []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(v: unknown) => [`${Number(v).toLocaleString()}`, 'Tokens']}
                />
                <Legend
                  formatter={(value) => (
                    <span style={{ fontSize: 11, color: 'oklch(0.58 0 0)' }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent executions */}
        <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border/50">
            <h2 className="font-semibold text-sm">Latest Executions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20">
                  {['User', 'Workflow', 'Model', 'Tokens', 'Status', 'Date'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.recentExecutions ?? []).map((exec) => (
                  <tr key={exec.id} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">{exec.userEmail ?? '—'}</td>
                    <td className="px-5 py-3.5 font-medium">{exec.workflowName}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{exec.modelName}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{exec.tokensUsed.toLocaleString()}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={exec.status} /></td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">
                      {new Date(exec.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {data && data.recentExecutions.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground text-sm">No executions yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
