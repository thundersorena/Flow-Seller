/**
 * Server-side bridge to the automation engine (n8n).
 * The engine is an implementation detail — nothing here is exposed to the client,
 * and user-facing code should never mention n8n.
 *
 * Env vars (set in Vercel → Project → Settings → Environment Variables):
 *   CONTENT_ENGINE_URL      — production webhook URL of the "Site Content Publisher" workflow
 *   CONTENT_ENGINE_SECRET   — shared secret; must equal the value in the workflow's "Valid Secret?" node
 *   CONTENT_ENGINE_ENABLED  — "true" to actually call the engine; anything else = dry-run mode
 *                             (rows are still created so the whole UI can be tested first)
 *   APP_URL                 — public base URL of this site, e.g. https://yourapp.vercel.app
 */

export interface EngineTriggerPayload {
  executionId: string;
  prompt: string;
  topic: string;
  tone: string;
  length: string;
  platforms: string[];
  mediaType: 'text' | 'image' | 'video';
}

export function engineEnabled(): boolean {
  return process.env.CONTENT_ENGINE_ENABLED === 'true';
}

export async function triggerContentFlow(payload: EngineTriggerPayload): Promise<{ ok: boolean; error?: string }> {
  const url    = process.env.CONTENT_ENGINE_URL;
  const secret = process.env.CONTENT_ENGINE_SECRET;
  const appUrl = process.env.APP_URL;

  if (!url || !secret || !appUrl) {
    return { ok: false, error: 'Content engine is not configured (CONTENT_ENGINE_URL / CONTENT_ENGINE_SECRET / APP_URL).' };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        secret,
        callbackUrl: `${appUrl.replace(/\/$/, '')}/api/engine/callback`,
      }),
    });

    if (!res.ok) {
      return { ok: false, error: `Engine responded with ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed to reach content engine' };
  }
}
