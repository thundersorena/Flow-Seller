'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Lock, Unlock, Download, PlaySquare, Loader2, Zap, Coins, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppHeader } from '@/components/app/header'
import { useAuthStore, type Allowance } from '@/lib/store/auth-store'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface StoreFlow {
  id: string
  slug: string
  name: string
  description: string
  category: string
  priceCents: number
  owned: boolean
}

interface StorePlan {
  id: string
  slug: string
  name: string
  description: string
  priceCents: number
  dailyTokenLimit: number
  isDefault: boolean
}

function price(cents: number) {
  return cents === 0 ? 'Free' : `$${(cents / 100).toFixed(2)}`
}

export default function FlowsPage() {
  const { user, allowance, setAllowance } = useAuthStore()
  const [flows, setFlows] = useState<StoreFlow[]>([])
  const [plans, setPlans] = useState<StorePlan[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [packs, setPacks] = useState(5)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    const [flowsRes, plansRes, meRes] = await Promise.all([
      api<{ flows: StoreFlow[] }>('/api/flows'),
      api<{ plans: StorePlan[] }>('/api/plans'),
      api<{ allowance: Allowance }>('/api/me'),
    ])
    setFlows(flowsRes.flows)
    setPlans(plansRes.plans)
    setAllowance(meRes.allowance)
  }, [setAllowance])

  useEffect(() => {
    refresh().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load the store.'))
  }, [refresh])

  const act = async (key: string, fn: () => Promise<void>, successMsg: string) => {
    setBusy(key)
    setError('')
    setMessage('')
    try {
      await fn()
      await refresh()
      setMessage(successMsg)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(null)
    }
  }

  const buyFlow = (flow: StoreFlow) =>
    act(`flow-${flow.id}`, async () => {
      await api(`/api/flows/${flow.id}/purchase`, { method: 'POST' })
    }, `"${flow.name}" unlocked — you can now run and download it.`)

  const subscribe = (plan: StorePlan) =>
    act(`plan-${plan.id}`, async () => {
      await api(`/api/plans/${plan.id}/subscribe`, { method: 'POST' })
    }, `You are now on ${plan.name}.`)

  const buyTokens = () =>
    act('tokens', async () => {
      await api('/api/tokens/purchase', { method: 'POST', body: JSON.stringify({ packs }) })
    }, `${(packs * 1000).toLocaleString()} bonus tokens added to your balance.`)

  return (
    <div>
      <AppHeader
        title="Flows Store"
        description="Unlock n8n automation flows, pick a token plan, and top up extra tokens."
      />

      <div className="p-6 space-y-8">
        {(message || error) && (
          <div className={cn(
            'px-4 py-3 rounded-lg border text-sm',
            error
              ? 'bg-destructive/10 border-destructive/30 text-destructive'
              : 'bg-green-500/10 border-green-500/30 text-green-400'
          )}>
            {error || message}
          </div>
        )}

        {/* Usage summary */}
        {allowance && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card border border-border/60 rounded-2xl p-5">
              <p className="text-sm text-muted-foreground mb-1">Current plan</p>
              <p className="text-xl font-bold">{allowance.plan?.name ?? 'No plan'}</p>
              <p className="text-xs text-muted-foreground mt-1">{allowance.dailyLimit.toLocaleString()} tokens / day</p>
            </div>
            <div className="bg-card border border-border/60 rounded-2xl p-5">
              <p className="text-sm text-muted-foreground mb-1">Used today</p>
              <p className="text-xl font-bold">{allowance.usedToday.toLocaleString()}</p>
              <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-brand transition-all"
                  style={{ width: `${Math.min(100, (allowance.usedToday / Math.max(1, allowance.dailyLimit)) * 100)}%` }}
                />
              </div>
            </div>
            <div className="bg-card border border-border/60 rounded-2xl p-5">
              <p className="text-sm text-muted-foreground mb-1">Bonus tokens</p>
              <p className="text-xl font-bold">{allowance.bonusTokens.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Spent after the daily limit</p>
            </div>
          </div>
        )}

        {/* Flow catalog */}
        <section>
          <h2 className="text-lg font-semibold mb-1">n8n Flows</h2>
          <p className="text-sm text-muted-foreground mb-4">Buy once — run it from your panel and download the workflow JSON.</p>
          <div className="grid gap-4 md:grid-cols-2">
            {flows.map((flow) => (
              <div key={flow.id} className="bg-card border border-border/60 rounded-2xl p-5 flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center',
                      flow.owned ? 'bg-green-500/10' : 'bg-brand/10'
                    )}>
                      {flow.owned
                        ? <Unlock className="w-5 h-5 text-green-400" />
                        : <Lock className="w-5 h-5 text-brand" />}
                    </div>
                    <div>
                      <p className="font-semibold">{flow.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{flow.category}</p>
                    </div>
                  </div>
                  <span className={cn(
                    'text-xs font-medium px-2.5 py-1 rounded-full border',
                    flow.owned
                      ? 'bg-green-500/15 text-green-400 border-green-500/20'
                      : 'bg-brand/10 text-brand border-brand/20'
                  )}>
                    {flow.owned ? 'Owned' : price(flow.priceCents)}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground flex-1 mb-4">{flow.description}</p>

                <div className="flex gap-2">
                  {flow.owned ? (
                    <>
                      <Link href={`/form?flow=${flow.id}`} className="flex-1">
                        <Button size="sm" className="w-full bg-brand text-white hover:bg-brand/90 border-0 gap-1.5">
                          <PlaySquare className="w-3.5 h-3.5" /> Run
                        </Button>
                      </Link>
                      <a href={`/api/flows/${flow.id}/download`} download>
                        <Button size="sm" variant="outline" className="gap-1.5">
                          <Download className="w-3.5 h-3.5" /> JSON
                        </Button>
                      </a>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => buyFlow(flow)}
                      disabled={busy === `flow-${flow.id}` || !user?.emailVerified}
                      className="flex-1 bg-brand text-white hover:bg-brand/90 border-0 gap-1.5"
                    >
                      {busy === `flow-${flow.id}`
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Unlocking…</>
                        : <><Lock className="w-3.5 h-3.5" /> Unlock for {price(flow.priceCents)}</>}
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {flows.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-2">No flows available yet.</p>
            )}
          </div>
        </section>

        {/* Token plans */}
        <section>
          <h2 className="text-lg font-semibold mb-1">Token Plans</h2>
          <p className="text-sm text-muted-foreground mb-4">Your plan sets how many tokens you can spend per day.</p>
          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = user?.planId === plan.id
              return (
                <div key={plan.id} className={cn(
                  'bg-card border rounded-2xl p-5 flex flex-col',
                  isCurrent ? 'border-brand/60' : 'border-border/60'
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">{plan.name}</p>
                    {isCurrent && (
                      <span className="flex items-center gap-1 text-xs text-brand">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Current
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold mb-1">{price(plan.priceCents)}<span className="text-sm text-muted-foreground font-normal">/mo</span></p>
                  <p className="text-sm text-muted-foreground mb-4 flex-1">
                    <Zap className="w-3.5 h-3.5 inline mr-1 text-brand" />
                    {plan.dailyTokenLimit.toLocaleString()} tokens per day
                    {plan.description && <><br />{plan.description}</>}
                  </p>
                  <Button
                    size="sm"
                    variant={isCurrent ? 'outline' : 'default'}
                    disabled={isCurrent || busy === `plan-${plan.id}` || !user?.emailVerified}
                    onClick={() => subscribe(plan)}
                    className={cn(!isCurrent && 'bg-brand text-white hover:bg-brand/90 border-0')}
                  >
                    {busy === `plan-${plan.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isCurrent ? 'Active' : 'Choose plan'}
                  </Button>
                </div>
              )
            })}
          </div>
        </section>

        {/* Buy extra tokens */}
        <section className="bg-card border border-border/60 rounded-2xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <h2 className="font-semibold flex items-center gap-2 mb-1">
                <Coins className="w-4 h-4 text-yellow-400" /> Buy extra tokens
              </h2>
              <p className="text-sm text-muted-foreground">
                Need more than your daily limit? Bonus tokens are spent automatically once your plan allowance runs out. $0.50 per 1,000 tokens.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={1000}
                value={packs}
                onChange={(e) => setPacks(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))}
                className="w-20 h-9 px-3 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:border-brand"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">× 1,000 tokens</span>
              <Button
                size="sm"
                onClick={buyTokens}
                disabled={busy === 'tokens' || !user?.emailVerified}
                className="bg-brand text-white hover:bg-brand/90 border-0 whitespace-nowrap"
              >
                {busy === 'tokens'
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : `Buy for $${((packs * 50) / 100).toFixed(2)}`}
              </Button>
            </div>
          </div>
        </section>

        {!user?.emailVerified && (
          <p className="text-sm text-yellow-400">
            Verify your email to purchase flows, plans, and tokens.{' '}
            <Link href={`/verify-email?email=${encodeURIComponent(user?.email ?? '')}`} className="underline">Verify now</Link>
          </p>
        )}
      </div>
    </div>
  )
}
