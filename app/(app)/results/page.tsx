'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Copy, Download, RefreshCw, ArrowLeft, CheckCircle2, Clock, Cpu, Coins, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppHeader } from '@/components/app/header'
import { StatusBadge } from '@/components/app/status-badge'
import { useExecutionStore } from '@/lib/store/execution-store'
import { MOCK_EXECUTIONS } from '@/lib/mock-data'

function ResultsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = searchParams.get('id')
  const { executions, currentExecution, setExecutions, setCurrentExecution } = useExecutionStore()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!executions.length) setExecutions(MOCK_EXECUTIONS)
  }, [executions.length, setExecutions])

  useEffect(() => {
    if (id && executions.length) {
      const found = executions.find((e) => e.id === id)
      if (found) setCurrentExecution(found)
    }
  }, [id, executions, setCurrentExecution])

  const exec = currentExecution ?? executions.find((e) => e.id === id) ?? executions[0]

  if (!exec) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>Execution not found.</p>
        <Link href="/dashboard"><Button variant="outline" className="mt-4">Back to Dashboard</Button></Link>
      </div>
    )
  }

  const copyOutput = () => {
    navigator.clipboard.writeText(exec.output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadOutput = () => {
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
      <AppHeader
        title="Execution Result"
        description={`${exec.workflowName} · ${exec.id}`}
        action={
          <div className="flex items-center gap-2">
            <Link href="/form">
              <Button variant="outline" size="sm" className="gap-1.5 h-8">
                <RefreshCw className="w-3.5 h-3.5" /> Rerun
              </Button>
            </Link>
            <Button onClick={copyOutput} variant="outline" size="sm" className="gap-1.5 h-8">
              <Copy className={`w-3.5 h-3.5 ${copied ? 'text-green-400' : ''}`} />
              {copied ? 'Copied!' : 'Copy'}
            </Button>
            <Button onClick={downloadOutput} size="sm" className="bg-brand text-white hover:bg-brand/90 border-0 gap-1.5 h-8">
              <Download className="w-3.5 h-3.5" /> Download
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-5">
        {/* Metadata cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: CheckCircle2, label: 'Status', value: <StatusBadge status={exec.status} /> },
            { icon: Cpu, label: 'Model', value: <span className="font-mono text-xs">{exec.modelName}</span> },
            { icon: Coins, label: 'Tokens Used', value: exec.tokensUsed.toLocaleString() },
            { icon: Clock, label: 'Exec. Time', value: `${(exec.executionTime / 1000).toFixed(2)}s` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-card border border-border/60 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
              <div className="text-sm font-medium">{value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Output */}
          <div className="lg:col-span-2 bg-card border border-border/60 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
              <h2 className="font-semibold text-sm">AI-Generated Output</h2>
              <span className="text-xs text-muted-foreground">{format(new Date(exec.createdAt), 'MMM d, yyyy HH:mm:ss')}</span>
            </div>
            <div className="p-5 prose prose-sm dark:prose-invert max-w-none overflow-auto max-h-150
              prose-headings:font-semibold prose-headings:text-foreground
              prose-p:text-muted-foreground prose-p:leading-relaxed
              prose-code:text-brand prose-code:bg-brand/10 prose-code:px-1 prose-code:rounded
              prose-strong:text-foreground prose-li:text-muted-foreground
              prose-table:text-sm prose-th:text-foreground prose-td:text-muted-foreground">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{exec.output}</ReactMarkdown>
            </div>
          </div>

          {/* Sidebar metadata */}
          <div className="space-y-4">
            {/* Input summary */}
            <div className="bg-card border border-border/60 rounded-2xl p-5">
              <h3 className="font-semibold text-sm mb-3">Submitted Input</h3>
              <div className="space-y-2">
                {Object.entries(exec.input).map(([k, v]) => (
                  <div key={k} className="flex flex-col gap-0.5">
                    <p className="text-xs text-muted-foreground capitalize">{k.replace(/([A-Z])/g, ' $1')}</p>
                    <p className="text-sm truncate">{String(v)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Prompt */}
            <div className="bg-card border border-border/60 rounded-2xl p-5">
              <h3 className="font-semibold text-sm mb-3">Prompt Sent to AI</h3>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-6">{exec.prompt}</p>
            </div>

            {/* Workflow info */}
            <div className="bg-card border border-border/60 rounded-2xl p-5">
              <h3 className="font-semibold text-sm mb-3">Workflow Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{exec.workflowName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Execution ID</span>
                  <span className="font-mono text-xs">{exec.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated</span>
                  <span className="text-xs">{format(new Date(exec.updatedAt), 'HH:mm:ss')}</span>
                </div>
              </div>
            </div>

            <Link href="/dashboard/executions">
              <Button variant="outline" className="w-full gap-1.5" size="sm">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to History
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground text-sm">Loading…</div>}>
      <ResultsContent />
    </Suspense>
  )
}
