'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Users, BarChart3, Zap, Coins, CheckCircle2,
  ArrowRight, Activity,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts'
import { AppHeader } from '@/components/app/header'
import { StatCard } from '@/components/app/stat-card'
import { StatusBadge } from '@/components/app/status-badge'
import { api } from '@/lib/api'
import type { ExecutionStatus } from '@/lib/store/execution-store'

const CHART_COLORS = ['hsl(265,70%,62%)', 'hsl(200,68%,68%)', 'hsl(145,60%,72%)', 'hsl(50,90%,70%)']

export interface AdminAnalytics {
  totalExecutions: number
  totalTokens: number
  successRate: number
  activeUsers: number
  executionsByDay: { date: string; count: number }[]
  tokensByModel: { model: string; tokens: number }[]
  recentExecutions: {
    id: string
    workflowName: string
    modelName: string
    tokensUsed: number
    status: ExecutionStatus
    createdAt: string
    userEmail: string | null
  }[]
}

export default function AdminPage() {
  const [data, setData] = useState<AdminAnalytics | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api<AdminAnalytics>('/api/admin/analytics')
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load analytics.'))
  }, [])

  return (
    <div>
      <AppHeader title="Admin Overview" description="Platform-wide metrics and activity." />

      <div className="p-6 space-y-6">
        {error && (
          <div className="px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Executions" value={(data?.totalExecutions ?? 0).toLocaleString()} icon={Zap} />
          <StatCard title="Active Users" value={(data?.activeUsers ?? 0).toLocaleString()} icon={Users} iconColor="bg-blue-500/10" iconTextColor="text-blue-400" />
          <StatCard title="Total Tokens" value={(data?.totalTokens ?? 0).toLocaleString()} icon={Coins} iconColor="bg-yellow-500/10" iconTextColor="text-yellow-400" />
          <StatCard title="Success Rate" value={data ? `${data.successRate}%` : '—'} icon={CheckCircle2} iconColor="bg-green-500/10" iconTextColor="text-green-400" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Executions chart */}
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-sm">Executions (Last 7 Days)</h2>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data?.executionsByDay ?? []}>
                <defs>
                  <linearGradient id="execGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,100%,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(0,0%,55%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(0,0%,55%)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'hsl(0,0%,12%)', border: '1px solid hsl(0,0%,20%)', borderRadius: 10, fontSize: 12 }}
                  labelStyle={{ color: 'hsl(0,0%,90%)' }}
                />
                <Area type="monotone" dataKey="count" stroke={CHART_COLORS[0]} fill="url(#execGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Tokens by model */}
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-sm">Token Usage by Model</h2>
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data?.tokensByModel ?? []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,100%,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(0,0%,55%)' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="model" tick={{ fontSize: 11, fill: 'hsl(0,0%,55%)' }} axisLine={false} tickLine={false} width={110} />
                <Tooltip
                  contentStyle={{ background: 'hsl(0,0%,12%)', border: '1px solid hsl(0,0%,20%)', borderRadius: 10, fontSize: 12 }}
                  formatter={(v: unknown) => [`${Number(v).toLocaleString()} tokens`, 'Tokens']}
                />
                <Bar dataKey="tokens" radius={[0, 4, 4, 0]}>
                  {(data?.tokensByModel ?? []).map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent executions */}
        <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
            <h2 className="font-semibold text-sm">Recent Executions (All Users)</h2>
            <Link href="/admin/analytics">
              <button className="flex items-center gap-1 text-xs text-brand hover:underline">
                View analytics <ArrowRight className="w-3 h-3" />
              </button>
            </Link>
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
                      {new Date(exec.createdAt).toLocaleDateString()}
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
