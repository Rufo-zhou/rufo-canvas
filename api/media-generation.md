# Media Generation API

## Model catalog

```http
GET /api/media-generation
```

Returns the server-side model catalog with `available`, `mediaType`, `requiresKey`, and reference-image capabilities.
Each model also declares supported `aspectRatios`, `qualityOptions`, optional `durationOptions`, and `supportsAudio`.

## Generate media

```http
POST /api/media-generation
Authorization: Bearer <supabase-access-token>
Content-Type: application/json
```

Request:

```json
{
  "projectId": "uuid",
  "modelId": "sana-free",
  "prompt": "A product photograph on a white background",
  "referenceImagePaths": [
    "optional/storage/start-frame.jpg",
    "optional/storage/end-frame.jpg"
  ],
  "referenceMode": "start-end",
  "referenceFit": "outpaint",
  "aspectRatio": "16:9",
  "quality": "high",
  "width": 1024,
  "height": 1024,
  "durationSeconds": 5,
  "audio": false,
  "seed": 42,
  "providerCredentials": {
    "agnesApiKey": "user-owned key sent only for this request"
  }
}
```

`providerCredentials` is optional. The browser sends only the credential required by the selected provider. The route strips credentials before persisting the task request and does not include them in logs, Supabase records, or API responses. User-owned credentials bypass Rufo's shared daily quota because usage is charged to the user's provider account.

Reference modes:

- `image`: image-to-image reference.
- `start-frame`: first frame for image-to-video.
- `start-end`: first and last frame interpolation.
- `multi-image`: multiple Agnes reference images.
- `keyframes`: Agnes keyframe animation.

The request must follow each model's `referenceModes` and `maxReferenceImages` catalog fields.

Reference fitting:

- `outpaint`: default. Keeps the original subject proportions and prepares a target-ratio canvas with extended background context.
- `crop`: uses attention-based cropping without stretching.
- `contain`: keeps the complete source image and fills the remaining canvas area.

For Agnes requests, Rufo prepares reference images to the selected target ratio before calling the provider and appends a composition constraint instructing the model not to stretch or squeeze the subject.

Response:

```json
{
  "data": {
    "taskId": "uuid",
    "asset": {
      "assetId": "uuid",
      "assetUrl": "signed Supabase Storage URL",
      "storagePath": "user/project/generations/file",
      "prompt": "A product photograph on a white background",
      "provider": "pollinations-free",
      "model": "sana",
      "mediaType": "image",
      "mimeType": "image/jpeg",
      "width": 1280,
      "height": 720,
      "aspectRatio": "16:9",
      "quality": "high",
      "audio": false
    }
  }
}
```

The route verifies the Supabase user and project, enforces a daily quota for shared provider credentials, normalizes aspect ratio and quality into provider-specific dimensions, calls the provider server-side, normalizes generated images to the exact selected dimensions without stretching, stores the returned file in private Supabase Storage, and records task and asset metadata.

## Aspect Ratio And Quality

Image presets:

- `1:1`
- `4:3`
- `3:4`
- `3:2`
- `2:3`
- `16:9`
- `9:16`
- `21:9`

Video presets:

- `16:9`
- `9:16`

Quality presets:

- `standard`: roughly 1K images or 480p video where supported.
- `high`: roughly 1.5K images or 720p video where supported.
- `ultra`: roughly 2K images or 1080p video where supported.

Some provider models only support one quality tier. The catalog response is the source of truth for enabled UI options.

Pollinations video models currently expose `16:9` and `9:16`. Agnes Video 2.0 exposes `16:9`, `9:16`, `1:1`, `4:3`, and `3:4`. Agnes duration limits depend on quality:

- 480p: 3, 5, 10, or 18 seconds.
- 720p: 3, 5, or 10 seconds.
- 1080p: 3 or 5 seconds.

The UI and API both enforce these combinations so a 1080p request cannot exceed the provider's 169-frame limit.

## Provider errors

Provider errors are normalized into actionable codes:

- `PROVIDER_BALANCE_REQUIRED`: the key is valid but the supplier account has no remaining balance.
- `PROVIDER_AUTH_ERROR`: the key is invalid, expired, or lacks model access.
- `PROVIDER_RATE_LIMITED`: quota or request frequency has been exceeded.
- `PROVIDER_NETWORK_ERROR`: Rufo could not reach the supplier after retries.

Configuring an API key only enables authentication. It does not add Pollinations Pollen or other provider credits.

All error responses use a user-facing Chinese structure:

```json
{
  "error": {
    "code": "PROVIDER_NETWORK_ERROR",
    "message": "暂时无法连接 Agnes AI 服务。",
    "solution": "检查网络后重试。异步视频任务可在“历史记录”中查看，避免重复提交。",
    "provider": "agnes"
  }
}
```

The route must not expose raw provider responses, stack traces, credentials, or authorization headers. Failed tasks persist the normalized error code, Chinese message, and solution in `generation_tasks` so the history panel can explain failures after refresh.

## Async video polling

Agnes Video 2.0 starts asynchronously. The initial request returns HTTP `202`:

```json
{
  "data": {
    "status": "processing",
    "taskId": "uuid",
    "progress": 0,
    "pollAfterMs": 5000
  }
}
```

Poll without keeping one long HTTP connection open:

```json
{
  "operation": "poll",
  "taskId": "uuid",
  "providerCredentials": {
    "agnesApiKey": "user-owned key"
  }
}
```

Polling returns another `202` while processing or a completed asset response. This avoids reverse-proxy and tunnel timeouts during long video jobs.

## Generation history

The canvas history panel reads the current project's `generation_tasks` in reverse chronological order and joins `generated_assets` by `task_id`.

- `pending` and `processing` show progress.
- `completed` shows the stored media and supports adding it back to the canvas.
- `failed` shows the normalized Chinese reason and solution.
- Credentials are never persisted in task payloads.
