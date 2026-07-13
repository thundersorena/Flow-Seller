# Testing & Go-Live Guide

The integration is deliberately staged so you can **test the n8n flow on its own first**, then flip one env var to connect it to the live site. Users never see n8n — the site calls it an "automation engine".

## Architecture (how the site and the flow sync)

```
User (logged in)                    Vercel (Next.js + Neon)                       n8n
────────────────                    ───────────────────────                       ───
fills chat-style form  ──────────▶  POST /api/executions
                                    1. INSERT executions row (status: pending)
                                    2. POST to CONTENT_ENGINE_URL  ──────────▶   Webhook "Site Request"
                                    3. row → running                             ├─ Valid Secret? (rejects 401)
results page polls                                                               ├─ 202 accepted
GET /api/executions/[id]                                                         ├─ Generate Content (OpenAI, exact tokens)
      ▲                                                                          ├─ POST callback ────┐
      │                             POST /api/engine/callback  ◀────────────────┘                    │
      │                             UPDATE row: output, tokens,                  ├─ image/video branch
      └── status flips to success   status, model, engine exec id               └─ publish: TG channel / Bale / WA / IG
```

Everything (input, output, prompt/completion/total tokens, model, platforms, media type, status, error, n8n execution id) is stored in the `executions` table in Neon — that is the single source of truth for both the user panel and admin monitoring.

## 1. One-time setup

### Database (Neon)
Run the migration — either:
- `pnpm db:generate && pnpm db:migrate` (uses `DATABASE_URL` from `.env`), or
- paste `drizzle/0001_social_publishing.sql` into the Neon SQL editor.

### n8n workflow ("Site Content Publisher")
The workflow source lives in [n8n/site-content-publisher.workflow.ts](n8n/site-content-publisher.workflow.ts). After it's created in your n8n instance:

1. Open the **Valid Secret?** node and replace `CHANGE_ME_SHARED_SECRET` with a long random string (e.g. run `openssl rand -hex 24`).
2. In the three **TG Channel …** nodes, set your channel ID (`@yourchannel` or `-100…`). Add your bot as **admin of the channel** — this is what makes it publish to the channel instead of the bot chat.
3. Bale nodes: set the URL `https://tapi.bale.ai/bot<YOUR_BALE_TOKEN>/sendMessage` and your Bale channel `chat_id`.
4. WhatsApp nodes: create a WhatsApp Business Cloud credential (Meta developer app) and fill the phone number ID + recipient.
5. Instagram nodes stay **disabled** until you have a Meta Graph API token and public media hosting (see the sticky note in the workflow).
6. Video uses OpenAI Sora (`sora-2`); if your OpenAI account has no Sora access, test with `mediaType: "image"` or `"text"` first.

### Vercel env vars (Project → Settings → Environment Variables)
| Variable | Value |
|---|---|
| `CONTENT_ENGINE_URL` | the workflow's **production** webhook URL (shown on the Webhook node after publishing) |
| `CONTENT_ENGINE_SECRET` | the same secret you put in the **Valid Secret?** node |
| `CONTENT_ENGINE_ENABLED` | `false` for now — **this is the final switch** |
| `APP_URL` | `https://<your-app>.vercel.app` |

## 2. Stage A — test the n8n flow alone (no site involved)

In the n8n editor press **Test workflow** (the webhook shows a *test* URL), then from your terminal:

```bash
curl -X POST "<TEST_WEBHOOK_URL>" \
  -H "Content-Type: application/json" \
  -d '{
    "executionId": "00000000-0000-0000-0000-000000000001",
    "secret": "<YOUR_SECRET>",
    "prompt": "Write a short energetic post announcing our new AI dashboard, aimed at startup founders.",
    "topic": "Product launch",
    "tone": "Casual",
    "length": "Short",
    "platforms": ["telegram"],
    "mediaType": "text",
    "callbackUrl": "https://webhook.site/<your-inspect-url>"
  }'
```

Check, in order:
1. You get `{"status":"accepted", ...}` back immediately (202).
2. The post appears in your **Telegram channel**.
3. The callback landed on webhook.site with `output`, `promptTokens`, `completionTokens`, `tokensUsed` — this is exactly what will be written to your DB.
4. Wrong secret → the run stops at **Valid Secret?** and returns 401.
5. Repeat with `"mediaType": "image"` and `"platforms": ["telegram","bale"]`.

## 3. Stage B — test the site with the engine still off (dry-run)

With `CONTENT_ENGINE_ENABLED=false` (or unset), the site works end-to-end except for calling n8n:
- Log in → **Create Content** → submit. A row is created with status `pending`.
- Dashboard, history, results page, and the admin panels all read real DB data.
- You can simulate the n8n callback manually to test the full loop:

```bash
curl -X POST "https://<your-app>.vercel.app/api/engine/callback" \
  -H "Content-Type: application/json" \
  -H "x-callback-secret: <YOUR_SECRET>" \
  -d '{
    "executionId": "<the pending row id from the results page URL>",
    "status": "success",
    "output": "## Test output\nHello from the engine.",
    "modelName": "gpt-5.4-mini",
    "promptTokens": 120,
    "completionTokens": 480,
    "tokensUsed": 600
  }'
```

The results page (which polls every 4 s) should flip to **success** and show the output + token counts.

## 4. Stage C — go live

1. **Publish** the workflow in n8n (production webhook becomes active).
2. Set `CONTENT_ENGINE_URL` to the production webhook URL.
3. Set `CONTENT_ENGINE_ENABLED=true` and redeploy.
4. Submit a real request from the site and watch it land in your Telegram channel while the results page fills in.

## User panel vs admin panel

| | User panel (`/dashboard`, `/form`, `/results`) | Admin panel (`/admin`, `/admin/analytics`) |
|---|---|---|
| Data scope | Only the logged-in user's own executions (`WHERE user_id = …`) | Every execution of every user |
| Token usage | Own totals on the dashboard | Totals, per-user ranking, per-day charts, prompt/completion breakdown |
| Access | Any authenticated user (JWT cookie) | `role = 'admin'` only — APIs return 403 otherwise |
| Engine visibility | Never mentions n8n — only "automation engine" | Settings page may reference engine configuration |

To make yourself admin: `UPDATE users SET role = 'admin' WHERE email = '<you>';` in Neon.

## Troubleshooting

- Row stuck on `running` → the callback never arrived. Check the n8n execution log; verify `APP_URL` is right (the callback URL is `APP_URL + /api/engine/callback`) and the secret matches.
- `401` from the callback → `x-callback-secret` ≠ `CONTENT_ENGINE_SECRET` on Vercel.
- `502 Failed to start automation` on submit → `CONTENT_ENGINE_URL` wrong, workflow not published, or n8n returned an error (check the row's error message).
- Telegram error `chat not found` → bot is not an admin of the channel, or wrong channel ID.
