'use client'

import { useCallback, useEffect, useState } from 'react'
import { Save, Plus, Trash2, Coins, Loader2 } from 'lucide-react'
import { AppHeader } from '@/components/app/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface AdminPlan {
  id: string
  slug: string
  name: string
  description: string
  priceCents: number
  dailyTokenLimit: number
  isDefault: boolean
}

const EMPTY_DRAFT = { slug: '', name: '', description: '', priceCents: 0, dailyTokenLimit: 10000, isDefault: false }

export default function AdminSettingsPage() {
  const [plans, setPlans] = useState<AdminPlan[]>([])
  const [edits, setEdits] = useState<Record<string, Partial<AdminPlan>>>({})
  const [draft, setDraft] = useState({ ...EMPTY_DRAFT })
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    const res = await api<{ plans: AdminPlan[] }>('/api/admin/plans')
    setPlans(res.plans)
    setEdits({})
  }, [])

  useEffect(() => {
    refresh().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load plans.'))
  }, [refresh])

  const setEdit = (id: string, patch: Partial<AdminPlan>) =>
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))

  const run = async (key: string, fn: () => Promise<void>, successMsg: string) => {
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

  const savePlan = (plan: AdminPlan) => {
    const patch = edits[plan.id]
    if (!patch || Object.keys(patch).length === 0) return
    run(`save-${plan.id}`, async () => {
      await api(`/api/admin/plans/${plan.id}`, { method: 'PATCH', body: JSON.stringify(patch) })
    }, `Plan "${patch.name ?? plan.name}" updated.`)
  }

  const deletePlan = (plan: AdminPlan) => {
    if (!window.confirm(`Delete plan "${plan.name}"? Users on this plan fall back to the default daily limit.`)) return
    run(`delete-${plan.id}`, async () => {
      await api(`/api/admin/plans/${plan.id}`, { method: 'DELETE' })
    }, `Plan "${plan.name}" deleted.`)
  }

  const createPlan = () => {
    run('create', async () => {
      await api('/api/admin/plans', { method: 'POST', body: JSON.stringify(draft) })
      setDraft({ ...EMPTY_DRAFT })
    }, `Plan "${draft.name}" created.`)
  }

  return (
    <div>
      <AppHeader
        title="Token Plans"
        description="Manage subscription tiers and each plan's daily token limit."
      />

      <div className="p-6 space-y-6 max-w-4xl">
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

        {/* Existing plans */}
        {plans.map((plan) => {
          const merged = { ...plan, ...edits[plan.id] }
          const dirty = Boolean(edits[plan.id] && Object.keys(edits[plan.id]).length)
          return (
            <div key={plan.id} className="bg-card border border-border/60 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
                    <Coins className="w-4 h-4 text-brand" />
                  </div>
                  <p className="font-semibold">{plan.name}</p>
                  <span className="text-xs text-muted-foreground font-mono">({plan.slug})</span>
                  {merged.isDefault && (
                    <span className="text-[10px] font-medium bg-brand/20 text-brand px-2 py-0.5 rounded-full">
                      Signup default
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => savePlan(plan)}
                    disabled={!dirty || busy === `save-${plan.id}`}
                    className="gap-1.5 bg-brand text-white hover:bg-brand/90 border-0 h-8 text-xs"
                  >
                    {busy === `save-${plan.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deletePlan(plan)}
                    disabled={busy === `delete-${plan.id}`}
                    className="gap-1.5 h-8 text-xs text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={merged.name}
                    onChange={(e) => setEdit(plan.id, { name: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Daily token limit</Label>
                  <Input
                    type="number"
                    min={0}
                    value={merged.dailyTokenLimit}
                    onChange={(e) => setEdit(plan.id, { dailyTokenLimit: Math.max(0, Number(e.target.value) || 0) })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Price (cents / month)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={merged.priceCents}
                    onChange={(e) => setEdit(plan.id, { priceCents: Math.max(0, Number(e.target.value) || 0) })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Default for new signups</Label>
                  <div className="h-9 flex items-center">
                    <Switch
                      checked={merged.isDefault}
                      onCheckedChange={(v) => setEdit(plan.id, { isDefault: v })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
                  <Label className="text-xs">Description</Label>
                  <Input
                    value={merged.description}
                    onChange={(e) => setEdit(plan.id, { description: e.target.value })}
                    className="h-9"
                    placeholder="Shown on the plan card in the store."
                  />
                </div>
              </div>
            </div>
          )
        })}

        {/* New plan */}
        <div className="bg-card border border-dashed border-border rounded-2xl p-5">
          <p className="font-semibold mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-brand" /> Create a new plan
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Slug</Label>
              <Input
                value={draft.slug}
                onChange={(e) => setDraft({ ...draft, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                placeholder="plan-c"
                className="h-9 font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Plan C"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Daily token limit</Label>
              <Input
                type="number"
                min={0}
                value={draft.dailyTokenLimit}
                onChange={(e) => setDraft({ ...draft, dailyTokenLimit: Math.max(0, Number(e.target.value) || 0) })}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Price (cents / month)</Label>
              <Input
                type="number"
                min={0}
                value={draft.priceCents}
                onChange={(e) => setDraft({ ...draft, priceCents: Math.max(0, Number(e.target.value) || 0) })}
                className="h-9"
              />
            </div>
          </div>
          <Button
            size="sm"
            onClick={createPlan}
            disabled={busy === 'create' || draft.slug.length < 2 || draft.name.length < 2}
            className="gap-1.5 bg-brand text-white hover:bg-brand/90 border-0"
          >
            {busy === 'create' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Create plan
          </Button>
        </div>
      </div>
    </div>
  )
}
