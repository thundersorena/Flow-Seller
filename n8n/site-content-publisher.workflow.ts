/**
 * n8n workflow: "Site Content Publisher"
 *
 * This file is the source of truth for the n8n workflow that powers the site's
 * content generation. It uses the n8n Workflow SDK format and is deployed to
 * your n8n instance via the n8n MCP tools (create_workflow_from_code).
 *
 * Flow:
 *   Webhook (from the site) -> Valid Secret? -> Normalize -> Respond 202
 *   -> Build Prompt -> Generate Content (OpenAI chat completions, exact token usage)
 *   -> Extract Result -> [ Save Result To Site (callback) | Media Type? switch ]
 *   Media Type?: image -> Generate Image -> platform fan-out (Telegram channel / Bale / WhatsApp / Instagram*)
 *                video -> Generate Video (Sora) -> platform fan-out
 *                text  -> platform fan-out
 *   (* Instagram nodes are disabled placeholders until Meta Graph API setup is done.)
 *
 * Failure path: Generate Content error output -> Report Failure (callback with status "failed").
 */

import { workflow, node, trigger, sticky, placeholder, newCredential, ifElse, switchCase, expr } from '@n8n/workflow-sdk';

const siteWebhook = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.1,
  config: {
    name: 'Site Request',
    parameters: {
      httpMethod: 'POST',
      path: 'site-content-publisher',
      responseMode: 'responseNode'
    }
  },
  output: [{ headers: { 'x-site': 'flowai' }, params: {}, query: {}, body: { executionId: 'a1b2c3', secret: 'shared-secret', prompt: 'Write a post about AI in healthcare', topic: 'AI in healthcare', tone: 'Professional', length: 'Medium', platforms: ['telegram', 'bale'], mediaType: 'image', callbackUrl: 'https://mysite.vercel.app/api/n8n/callback' } }]
});

const validSecret = ifElse({
  version: 2.3,
  config: {
    name: 'Valid Secret?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
        conditions: [{ leftValue: expr('{{ $json.body?.secret ?? $json.secret ?? "" }}'), operator: { type: 'string', operation: 'equals' }, rightValue: 'CHANGE_ME_SHARED_SECRET' }],
        combinator: 'and'
      }
    }
  }
});

const rejectUnauthorized = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Reject Unauthorized',
    parameters: {
      respondWith: 'json',
      responseBody: '{ "error": "unauthorized" }',
      options: { responseCode: 401 }
    }
  },
  output: [{ response: 'sent' }]
});

const normalizeRequest = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Normalize Request',
    parameters: {
      mode: 'manual',
      includeOtherFields: false,
      assignments: {
        assignments: [
          { id: 'exec-id', name: 'executionId', value: expr('{{ $json.body?.executionId ?? $json.executionId ?? "" }}'), type: 'string' },
          { id: 'user-prompt', name: 'userPrompt', value: expr('{{ $json.body?.prompt ?? $json.prompt ?? "" }}'), type: 'string' },
          { id: 'topic', name: 'topic', value: expr('{{ $json.body?.topic ?? $json.topic ?? "" }}'), type: 'string' },
          { id: 'tone', name: 'tone', value: expr('{{ $json.body?.tone ?? $json.tone ?? "Professional" }}'), type: 'string' },
          { id: 'length-pref', name: 'lengthPref', value: expr('{{ $json.body?.length ?? $json.length ?? "Medium" }}'), type: 'string' },
          { id: 'platforms', name: 'platforms', value: expr('{{ $json.body?.platforms ?? $json.platforms ?? [] }}'), type: 'array' },
          { id: 'media-type', name: 'mediaType', value: expr('{{ $json.body?.mediaType ?? $json.mediaType ?? "text" }}'), type: 'string' },
          { id: 'callback-url', name: 'callbackUrl', value: expr('{{ $json.body?.callbackUrl ?? $json.callbackUrl ?? "" }}'), type: 'string' },
          { id: 'secret', name: 'secret', value: expr('{{ $json.body?.secret ?? $json.secret ?? "" }}'), type: 'string' }
        ]
      }
    }
  },
  output: [{ executionId: 'a1b2c3', userPrompt: 'Write a post about AI in healthcare', topic: 'AI in healthcare', tone: 'Professional', lengthPref: 'Medium', platforms: ['telegram', 'bale'], mediaType: 'image', callbackUrl: 'https://mysite.vercel.app/api/n8n/callback', secret: 'shared-secret' }]
});

const acknowledgeRequest = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Acknowledge Request',
    parameters: {
      respondWith: 'json',
      responseBody: expr('{{ { "status": "accepted", "executionId": $json.executionId } }}'),
      options: { responseCode: 202 }
    }
  },
  output: [{ executionId: 'a1b2c3', userPrompt: 'Write a post about AI in healthcare', topic: 'AI in healthcare', tone: 'Professional', lengthPref: 'Medium', platforms: ['telegram', 'bale'], mediaType: 'image', callbackUrl: 'https://mysite.vercel.app/api/n8n/callback', secret: 'shared-secret' }]
});

const buildPrompt = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Build Prompt',
    parameters: {
      mode: 'manual',
      includeOtherFields: true,
      assignments: {
        assignments: [
          { id: 'system-prompt', name: 'systemPrompt', value: 'You are a professional multi-platform social media content creator. Write original, publication-ready content. Never use placeholder text. Adapt formatting to the target platforms listed in the request. When Instagram is a target, include a strong hook in the first line, short punchy lines for mobile readability, a clear call to action, and a final line starting with "Hashtags:" followed by 15-25 niche-relevant hashtags (avoid banned or generic tags). When Telegram or Bale are targets, keep the post clean and readable in a channel format.', type: 'string' },
          { id: 'user-message', name: 'userMessage', value: expr('Create a {{ $json.mediaType }} social media post for these platforms: {{ $json.platforms.join(", ") }}.\n\nTopic: {{ $json.topic }}\nTone: {{ $json.tone }}\nLength: {{ $json.lengthPref }}\n\nDetailed request from the user:\n{{ $json.userPrompt }}'), type: 'string' }
        ]
      }
    }
  },
  output: [{ executionId: 'a1b2c3', systemPrompt: 'You are a professional multi-platform social media content creator.', userMessage: 'Create an image social media post', platforms: ['telegram', 'bale'], mediaType: 'image', callbackUrl: 'https://mysite.vercel.app/api/n8n/callback', secret: 'shared-secret' }]
});

const generateContent = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Generate Content',
    onError: 'continueErrorOutput',
    parameters: {
      method: 'POST',
      url: 'https://api.openai.com/v1/chat/completions',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'openAiApi',
      sendBody: true,
      specifyBody: 'json',
      jsonBody: expr('{{ { "model": "gpt-5.4-mini", "messages": [ { "role": "system", "content": $json.systemPrompt }, { "role": "user", "content": $json.userMessage } ] } }}')
    },
    credentials: { openAiApi: { id: 'UdpPvzIZuVMZSJTV', name: 'OpenAI account' } }
  },
  output: [{ id: 'chatcmpl-1', model: 'gpt-5.4-mini', choices: [{ message: { role: 'assistant', content: 'Generated post content here' } }], usage: { prompt_tokens: 120, completion_tokens: 480, total_tokens: 600 } }]
});

const reportFailure = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Report Failure',
    onError: 'continueRegularOutput',
    parameters: {
      method: 'POST',
      url: expr('{{ $("Normalize Request").item.json.callbackUrl }}'),
      sendHeaders: true,
      specifyHeaders: 'keypair',
      headerParameters: { parameters: [{ name: 'x-callback-secret', value: expr('{{ $("Normalize Request").item.json.secret }}') }] },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: expr('{{ { "executionId": $("Normalize Request").item.json.executionId, "status": "failed", "error": ($json.error?.message ?? $json.message ?? "Content generation failed"), "n8nExecutionId": $execution.id } }}')
    }
  },
  output: [{ ok: true }]
});

const extractResult = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Extract Result',
    parameters: {
      mode: 'manual',
      includeOtherFields: false,
      assignments: {
        assignments: [
          { id: 'content', name: 'content', value: expr('{{ $json.choices[0].message.content }}'), type: 'string' },
          { id: 'model-name', name: 'modelName', value: expr('{{ $json.model }}'), type: 'string' },
          { id: 'prompt-tokens', name: 'promptTokens', value: expr('{{ $json.usage.prompt_tokens }}'), type: 'number' },
          { id: 'completion-tokens', name: 'completionTokens', value: expr('{{ $json.usage.completion_tokens }}'), type: 'number' },
          { id: 'total-tokens', name: 'totalTokens', value: expr('{{ $json.usage.total_tokens }}'), type: 'number' }
        ]
      }
    }
  },
  output: [{ content: 'Generated post content here', modelName: 'gpt-5.4-mini', promptTokens: 120, completionTokens: 480, totalTokens: 600 }]
});

const saveResultToSite = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Save Result To Site',
    onError: 'continueRegularOutput',
    parameters: {
      method: 'POST',
      url: expr('{{ $("Normalize Request").item.json.callbackUrl }}'),
      sendHeaders: true,
      specifyHeaders: 'keypair',
      headerParameters: { parameters: [{ name: 'x-callback-secret', value: expr('{{ $("Normalize Request").item.json.secret }}') }] },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: expr('{{ { "executionId": $("Normalize Request").item.json.executionId, "status": "success", "output": $json.content, "modelName": $json.modelName, "promptTokens": $json.promptTokens, "completionTokens": $json.completionTokens, "tokensUsed": $json.totalTokens, "mediaType": $("Normalize Request").item.json.mediaType, "platforms": $("Normalize Request").item.json.platforms, "n8nExecutionId": $execution.id } }}')
    }
  },
  output: [{ ok: true }]
});

const mediaTypeSwitch = switchCase({
  version: 3.4,
  config: {
    name: 'Media Type?',
    parameters: {
      mode: 'rules',
      rules: {
        values: [
          { renameOutput: true, outputKey: 'Image', conditions: { options: { caseSensitive: false, leftValue: '', typeValidation: 'strict' }, conditions: [{ leftValue: expr('{{ $("Normalize Request").item.json.mediaType }}'), operator: { type: 'string', operation: 'equals' }, rightValue: 'image' }], combinator: 'and' } },
          { renameOutput: true, outputKey: 'Video', conditions: { options: { caseSensitive: false, leftValue: '', typeValidation: 'strict' }, conditions: [{ leftValue: expr('{{ $("Normalize Request").item.json.mediaType }}'), operator: { type: 'string', operation: 'equals' }, rightValue: 'video' }], combinator: 'and' } }
        ]
      },
      options: { fallbackOutput: 'extra', renameFallbackOutput: 'Text Only' }
    }
  }
});

const generateImage = node({
  type: '@n8n/n8n-nodes-langchain.openAi',
  version: 2.3,
  config: {
    name: 'Generate Image',
    onError: 'continueRegularOutput',
    parameters: {
      resource: 'image',
      operation: 'generate',
      modelId: { __rl: true, mode: 'list', value: 'gpt-image-1-mini', cachedResultName: 'GPT-IMAGE-1-MINI' },
      prompt: expr('Create an eye-catching social media image for this post. No text overlays unless essential.\n\n{{ $("Extract Result").item.json.content.substring(0, 1500) }}'),
      options: {}
    },
    credentials: { openAiApi: { id: 'UdpPvzIZuVMZSJTV', name: 'OpenAI account' } }
  },
  output: [{ generated: true }]
});

const generateVideo = node({
  type: '@n8n/n8n-nodes-langchain.openAi',
  version: 2.3,
  config: {
    name: 'Generate Video',
    onError: 'continueRegularOutput',
    parameters: {
      resource: 'video',
      operation: 'generate',
      modelId: { __rl: true, mode: 'id', value: 'sora-2' },
      prompt: expr('Create a short engaging social media video based on this post:\n\n{{ $("Extract Result").item.json.content.substring(0, 1500) }}'),
      seconds: 8,
      size: '1280x720',
      options: {}
    },
    credentials: { openAiApi: { id: 'UdpPvzIZuVMZSJTV', name: 'OpenAI account' } }
  },
  output: [{ generated: true }]
});

function platformSwitch(name: string, withInstagram: boolean) {
  const values = [
    { renameOutput: true, outputKey: 'Telegram', conditions: { options: { caseSensitive: false, leftValue: '', typeValidation: 'strict' as const }, conditions: [{ leftValue: expr('{{ $("Normalize Request").item.json.platforms }}'), operator: { type: 'array', operation: 'contains' }, rightValue: 'telegram' }], combinator: 'and' as const } },
    { renameOutput: true, outputKey: 'Bale', conditions: { options: { caseSensitive: false, leftValue: '', typeValidation: 'strict' as const }, conditions: [{ leftValue: expr('{{ $("Normalize Request").item.json.platforms }}'), operator: { type: 'array', operation: 'contains' }, rightValue: 'bale' }], combinator: 'and' as const } },
    { renameOutput: true, outputKey: 'WhatsApp', conditions: { options: { caseSensitive: false, leftValue: '', typeValidation: 'strict' as const }, conditions: [{ leftValue: expr('{{ $("Normalize Request").item.json.platforms }}'), operator: { type: 'array', operation: 'contains' }, rightValue: 'whatsapp' }], combinator: 'and' as const } }
  ];
  if (withInstagram) {
    values.push({ renameOutput: true, outputKey: 'Instagram', conditions: { options: { caseSensitive: false, leftValue: '', typeValidation: 'strict' as const }, conditions: [{ leftValue: expr('{{ $("Normalize Request").item.json.platforms }}'), operator: { type: 'array', operation: 'contains' }, rightValue: 'instagram' }], combinator: 'and' as const } });
  }
  return switchCase({
    version: 3.4,
    config: {
      name,
      parameters: { mode: 'rules', rules: { values }, options: { allMatchingOutputs: true } }
    }
  });
}

const imagePlatforms = platformSwitch('Image Platforms', true);
const videoPlatforms = platformSwitch('Video Platforms', true);
const textPlatforms = platformSwitch('Text Platforms', false);

const tgChannelPhoto = node({
  type: 'n8n-nodes-base.telegram',
  version: 1.2,
  config: {
    name: 'TG Channel Photo',
    onError: 'continueRegularOutput',
    parameters: {
      resource: 'message',
      operation: 'sendPhoto',
      chatId: placeholder('Telegram CHANNEL ID, e.g. @yourchannel or -100xxxxxxxxxx (bot must be channel admin)'),
      binaryData: true,
      binaryPropertyName: 'data',
      additionalFields: { caption: expr('{{ $("Extract Result").item.json.content.substring(0, 1000) }}') }
    },
    credentials: { telegramApi: { id: 'YEgQphOtGTP4c6x1', name: 'Telegram account' } }
  },
  output: [{ ok: true, result: { message_id: 100 } }]
});

const tgChannelVideo = node({
  type: 'n8n-nodes-base.telegram',
  version: 1.2,
  config: {
    name: 'TG Channel Video',
    onError: 'continueRegularOutput',
    parameters: {
      resource: 'message',
      operation: 'sendVideo',
      chatId: placeholder('Telegram CHANNEL ID, e.g. @yourchannel or -100xxxxxxxxxx (bot must be channel admin)'),
      binaryData: true,
      binaryPropertyName: 'data',
      additionalFields: { caption: expr('{{ $("Extract Result").item.json.content.substring(0, 1000) }}') }
    },
    credentials: { telegramApi: { id: 'YEgQphOtGTP4c6x1', name: 'Telegram account' } }
  },
  output: [{ ok: true, result: { message_id: 101 } }]
});

const tgChannelText = node({
  type: 'n8n-nodes-base.telegram',
  version: 1.2,
  config: {
    name: 'TG Channel Text',
    onError: 'continueRegularOutput',
    parameters: {
      resource: 'message',
      operation: 'sendMessage',
      chatId: placeholder('Telegram CHANNEL ID, e.g. @yourchannel or -100xxxxxxxxxx (bot must be channel admin)'),
      text: expr('{{ $("Extract Result").item.json.content.substring(0, 3900) }}'),
      additionalFields: { appendAttribution: false }
    },
    credentials: { telegramApi: { id: 'YEgQphOtGTP4c6x1', name: 'Telegram account' } }
  },
  output: [{ ok: true, result: { message_id: 102 } }]
});

function balePost(name: string) {
  return node({
    type: 'n8n-nodes-base.httpRequest',
    version: 4.4,
    config: {
      name,
      onError: 'continueRegularOutput',
      parameters: {
        method: 'POST',
        url: placeholder('Bale sendMessage URL: https://tapi.bale.ai/botYOUR_BALE_TOKEN/sendMessage'),
        sendBody: true,
        specifyBody: 'keypair',
        bodyParameters: { parameters: [
          { name: 'chat_id', value: 'CHANGE_ME_BALE_CHANNEL_ID' },
          { name: 'text', value: expr('{{ $("Extract Result").item.json.content.substring(0, 3900) }}') }
        ] }
      }
    },
    output: [{ ok: true }]
  });
}

const baleImagePost = balePost('Bale Image Post');
const baleVideoPost = balePost('Bale Video Post');
const baleTextPost = balePost('Bale Text Post');

const waImage = node({
  type: 'n8n-nodes-base.whatsApp',
  version: 1.1,
  config: {
    name: 'WA Image',
    onError: 'continueRegularOutput',
    parameters: {
      resource: 'message',
      operation: 'send',
      phoneNumberId: placeholder('WhatsApp Business phone number ID'),
      recipientPhoneNumber: placeholder('Recipient phone number with country code'),
      messageType: 'image',
      mediaPath: 'useMedian8n',
      mediaPropertyName: 'data',
      additionalFields: { mediaCaption: expr('{{ $("Extract Result").item.json.content.substring(0, 1000) }}') }
    },
    credentials: { whatsAppApi: newCredential('WhatsApp account') }
  },
  output: [{ messages: [{ id: 'wamid.1' }] }]
});

const waVideo = node({
  type: 'n8n-nodes-base.whatsApp',
  version: 1.1,
  config: {
    name: 'WA Video',
    onError: 'continueRegularOutput',
    parameters: {
      resource: 'message',
      operation: 'send',
      phoneNumberId: placeholder('WhatsApp Business phone number ID'),
      recipientPhoneNumber: placeholder('Recipient phone number with country code'),
      messageType: 'video',
      mediaPath: 'useMedian8n',
      mediaPropertyName: 'data',
      additionalFields: { mediaCaption: expr('{{ $("Extract Result").item.json.content.substring(0, 1000) }}') }
    },
    credentials: { whatsAppApi: newCredential('WhatsApp account') }
  },
  output: [{ messages: [{ id: 'wamid.2' }] }]
});

const waText = node({
  type: 'n8n-nodes-base.whatsApp',
  version: 1.1,
  config: {
    name: 'WA Text',
    onError: 'continueRegularOutput',
    parameters: {
      resource: 'message',
      operation: 'send',
      phoneNumberId: placeholder('WhatsApp Business phone number ID'),
      recipientPhoneNumber: placeholder('Recipient phone number with country code'),
      messageType: 'text',
      textBody: expr('{{ $("Extract Result").item.json.content.substring(0, 4000) }}')
    },
    credentials: { whatsAppApi: newCredential('WhatsApp account') }
  },
  output: [{ messages: [{ id: 'wamid.3' }] }]
});

const igImagePlaceholder = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'IG Image (Setup Needed)',
    disabled: true,
    onError: 'continueRegularOutput',
    parameters: {
      method: 'POST',
      url: 'https://graph.facebook.com/v21.0/YOUR_IG_BUSINESS_ACCOUNT_ID/media',
      sendBody: true,
      specifyBody: 'keypair',
      bodyParameters: { parameters: [
        { name: 'image_url', value: 'PUBLIC_IMAGE_URL_NEEDED' },
        { name: 'caption', value: expr('{{ $("Extract Result").item.json.content.substring(0, 2200) }}') },
        { name: 'access_token', value: 'YOUR_META_ACCESS_TOKEN' }
      ] }
    }
  },
  output: [{ id: 'container-id' }]
});

const igVideoPlaceholder = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'IG Video (Setup Needed)',
    disabled: true,
    onError: 'continueRegularOutput',
    parameters: {
      method: 'POST',
      url: 'https://graph.facebook.com/v21.0/YOUR_IG_BUSINESS_ACCOUNT_ID/media',
      sendBody: true,
      specifyBody: 'keypair',
      bodyParameters: { parameters: [
        { name: 'media_type', value: 'REELS' },
        { name: 'video_url', value: 'PUBLIC_VIDEO_URL_NEEDED' },
        { name: 'caption', value: expr('{{ $("Extract Result").item.json.content.substring(0, 2200) }}') },
        { name: 'access_token', value: 'YOUR_META_ACCESS_TOKEN' }
      ] }
    }
  },
  output: [{ id: 'container-id' }]
});

const noteOverview = sticky('## Site Content Publisher\nTriggered by the website (Vercel) via POST webhook.\n\nPayload: executionId, secret, prompt, topic, tone, length, platforms[], mediaType, callbackUrl.\n\nFlow: validate secret -> respond 202 -> generate content (exact token usage) -> save result back to the site DB via callback -> generate media if requested -> publish to all selected platforms.\n\nIMPORTANT: change CHANGE_ME_SHARED_SECRET in the "Valid Secret?" node and set the same value as N8N_WEBHOOK_SECRET in Vercel.', [siteWebhook, validSecret], { color: 4 });

const notePlatforms = sticky('## Platform setup\n- Telegram: set your CHANNEL id (@channel or -100...) in the TG nodes; the bot must be an admin of the channel. Content publishes to the channel, not the bot chat.\n- Bale: put your bot token in the URL and channel chat_id (Bale API mirrors Telegram: https://tapi.bale.ai/botTOKEN/sendMessage). Media upload to Bale can be added later; v1 posts the text.\n- WhatsApp: create a WhatsApp Business Cloud credential (Meta) and fill phone number ID + recipient.\n- Instagram: nodes are DISABLED placeholders. IG Graph API needs a public media URL + a second /media_publish call. Enable after hosting media (e.g. Vercel Blob).', [imagePlatforms, videoPlatforms, textPlatforms], { color: 5 });

export default workflow('site-content-publisher', 'Site Content Publisher')
  .add(siteWebhook)
  .to(validSecret
    .onTrue!(normalizeRequest.to(acknowledgeRequest.to(buildPrompt.to(generateContent.onError(reportFailure)))))
    .onFalse(rejectUnauthorized))
  .add(generateContent)
  .to(extractResult)
  .add(extractResult)
  .to(saveResultToSite)
  .add(extractResult)
  .to(mediaTypeSwitch
    .onCase!(0, generateImage.to(imagePlatforms
      .onCase!(0, tgChannelPhoto)
      .onCase(1, baleImagePost)
      .onCase(2, waImage)
      .onCase(3, igImagePlaceholder)))
    .onCase(1, generateVideo.to(videoPlatforms
      .onCase!(0, tgChannelVideo)
      .onCase(1, baleVideoPost)
      .onCase(2, waVideo)
      .onCase(3, igVideoPlaceholder)))
    .onCase(2, textPlatforms
      .onCase!(0, tgChannelText)
      .onCase(1, baleTextPost)
      .onCase(2, waText)))
  .add(noteOverview)
  .add(notePlatforms);
