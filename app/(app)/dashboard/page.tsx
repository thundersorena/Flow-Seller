'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { LayoutDashboard, Zap, CheckCircle2, Coins, Clock, ArrowRight, Eye, Copy, Download, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppHeader } from '@/components/app/header'
import { StatCard } from '@/components/app/stat-card'
import { StatusBadge } from '@/components/app/status-badge'
import { useAuthStore } from '@/lib/store/auth-store'
import { useExecutionStore } from '@/lib/store/execution-store'

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { executions, setExecutions } = useExecutionStore()
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    if (!user) { router.push('/login'); return }
    fetch('/api/executions')
      .then((res) => (res.ok ? res.json() : { executions: [] }))
      .then((data) => setExecutions(data.executions ?? []))
      .catch(() => setExecutions([]))
  }, [user, router, setExecutions])

  const filtered = executions.filter(
    (e) =>
      e.workflowName.toLowerCase().includes(search.toLowerCase()) ||
      e.status.toLowerCase().includes(search.toLowerCase()) ||
      e.modelName.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: executions.length,
    success: executions.filter((e) => e.status === 'success').length,
    tokens: executions.reduce((s, e) => s + e.tokensUsed, 0),
    avgTime: executions.length ? Math.round(executions.reduce((s, e) => s + e.executionTime, 0) / executions.length) : 0,
  }

  const copyOutput = (id: string, output: string) => {
    navigator.clipboard.writeText(output)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div>
      <AppHeader
        title={`Welcome back, ${user?.name?.split(' ')[0] ?? 'there'}`}
        description="Here&apos;s an overview of your automation activity."
        action={
          <Link href="/form">
            <Button size="sm" className="bg-brand text-white hover:bg-brand/90 border-0 gap-1.5">
              <Zap className="w-3.5 h-3.5" /> New automation
            </Button>
          </Link>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Executions" value={stats.total.toLocaleString()} change="+12%" icon={LayoutDashboard} />
          <StatCard title="Success Rate" value={`${(stats.total ? (stats.success / stats.total) * 100 : 0).toFixed(1)}%`} change="+2.1%" icon={CheckCircle2} iconColor="bg-green-500/10" iconTextColor="text-green-400" />
          <StatCard title="Tokens Used" value={`${(stats.tokens / 1000).toFixed(0)}K`} change="+24%" icon={Coins} iconColor="bg-yellow-500/10" iconTextColor="text-yellow-400" />
          <StatCard title="Avg. Run Time" value={`${(stats.avgTime / 1000).toFixed(1)}s`} change="-0.3s" changeType="up" icon={Clock} iconColor="bg-blue-500/10" iconTextColor="text-blue-400" />
        </div>

        {/* Execution table */}
        <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-border/50">
            <h2 className="font-semibold">Execution History</h2>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search executions…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 px-3 text-sm bg-muted rounded-lg border border-border focus:outline-none focus:border-brand transition-colors w-52"
              />
              <Link href="/dashboard/executions">
                <Button variant="outline" size="sm" className="gap-1 h-8 text-xs">
                  View all <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-xs text-muted-foreground">
                  <th className="text-left px-6 py-3 font-medium">Workflow</th>
                  <th className="text-left px-6 py-3 font-medium">Model</th>
                  <th className="text-left px-6 py-3 font-medium">Tokens</th>
                  <th className="text-left px-6 py-3 font-medium">Time</th>
                  <th className="text-left px-6 py-3 font-medium">Status</th>
                  <th className="text-left px-6 py-3 font-medium">Date</th>
                  <th className="text-right px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 8).map((exec) => (
                  <tr key={exec.id} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-3.5">
                      <span className="font-medium text-foreground">{exec.workflowName}</span>
                      <p className="text-xs text-muted-foreground">{exec.id}</p>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs text-muted-foreground">{exec.modelName}</td>
                    <td className="px-6 py-3.5 text-muted-foreground">{exec.tokensUsed.toLocaleString()}</td>
                    <td className="px-6 py-3.5 text-muted-foreground">{(exec.executionTime / 1000).toFixed(1)}s</td>
                    <td className="px-6 py-3.5"><StatusBadge status={exec.status} /></td>
                    <td className="px-6 py-3.5 text-muted-foreground text-xs whitespace-nowrap">
                      {format(new Date(exec.createdAt), 'MMM d, HH:mm')}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/results?id=${exec.id}`}>
                          <button className="p-1.5 rounded hover:bg-muted transition-colors" title="View">
                            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        </Link>
                        <button
                          onClick={() => copyOutput(exec.id, exec.output)}
                          className="p-1.5 rounded hover:bg-muted transition-colors"
                          title="Copy output"
                        >
                          <Copy className={`w-3.5 h-3.5 ${copied === exec.id ? 'text-green-400' : 'text-muted-foreground'}`} />
                        </button>
                        <Link href="/form">
                          <button className="p-1.5 rounded hover:bg-muted transition-colors" title="Rerun">
                            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
