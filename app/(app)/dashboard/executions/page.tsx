'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Eye, Copy, RefreshCw, Download, Search, Filter } from 'lucide-react'
import { AppHeader } from '@/components/app/header'
import { StatusBadge } from '@/components/app/status-badge'
import { Button } from '@/components/ui/button'
import { useExecutionStore } from '@/lib/store/execution-store'
import type { ExecutionStatus } from '@/lib/store/execution-store'

const STATUSES: ExecutionStatus[] = ['success', 'failed', 'running', 'pending']

export default function ExecutionsPage() {
  const { executions, setExecutions } = useExecutionStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ExecutionStatus | 'all'>('all')
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/executions')
      .then((res) => (res.ok ? res.json() : { executions: [] }))
      .then((data) => setExecutions(data.executions ?? []))
      .catch(() => setExecutions([]))
  }, [setExecutions])

  const filtered = executions.filter((e) => {
    const matchSearch = e.workflowName.toLowerCase().includes(search.toLowerCase()) || e.id.includes(search)
    const matchStatus = statusFilter === 'all' || e.status === statusFilter
    return matchSearch && matchStatus
  })

  const copyOutput = (id: string, output: string) => {
    navigator.clipboard.writeText(output)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const downloadOutput = (exec: typeof executions[0]) => {
    const blob = new Blob([exec.output], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${exec.workflowName}-${exec.id}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <AppHeader title="Execution History" description="All automation runs with full details and actions." />

      <div className="p-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by workflow name or ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-4 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:border-brand transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <div className="flex gap-1">
              {(['all', ...STATUSES] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                    statusFilter === s ? 'bg-brand text-white' : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Workflow</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Model</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Tokens</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Exec Time</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Created</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((exec) => (
                  <tr key={exec.id} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors group">
                    <td className="px-5 py-4">
                      <p className="font-medium">{exec.workflowName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{exec.id}</p>
                    </td>
                    <td className="px-5 py-4 text-xs font-mono text-muted-foreground">{exec.modelName}</td>
                    <td className="px-5 py-4 text-muted-foreground">{exec.tokensUsed.toLocaleString()}</td>
                    <td className="px-5 py-4 text-muted-foreground">{(exec.executionTime / 1000).toFixed(2)}s</td>
                    <td className="px-5 py-4"><StatusBadge status={exec.status} /></td>
                    <td className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(exec.createdAt), 'MMM d, yyyy HH:mm')}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/results?id=${exec.id}`}>
                          <button className="p-1.5 rounded-md hover:bg-muted transition-colors" title="View details">
                            <Eye className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                          </button>
                        </Link>
                        <button onClick={() => copyOutput(exec.id, exec.output)} className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Copy output">
                          <Copy className={`w-3.5 h-3.5 ${copied === exec.id ? 'text-green-400' : 'text-muted-foreground hover:text-foreground'}`} />
                        </button>
                        <button onClick={() => downloadOutput(exec)} className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Download">
                          <Download className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                        </button>
                        <Link href="/form">
                          <button className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Rerun">
                            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                          </button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-sm">No executions found matching your filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
