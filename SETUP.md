# Shockproof Skills — Environment Setup

This guide covers the environment variables needed to run skills in **Cowork/sandbox** environments where gcloud CLI is not available.

Locally with gcloud installed, most secrets are auto-resolved from Secret Manager — only `GCS_SERVICE_ACCOUNT_KEY` needs explicit setup.

## Environment Variables

| Variable | Used by | Required in Cowork? | Notes |
|----------|---------|---------------------|-------|
| `RENDER_HTML_API_KEY` | All skills (PNG rendering) | Yes | API key for the `renderHtmlToPng` cloud function |
| `ANTHROPIC_API_KEY` | convert-pdf-to-html-deck (narration + semantic mode) | Yes | Claude API key. In Claude Code sessions, `CLAUDE_CODE_OAUTH_TOKEN` is used automatically |
| `GCS_SERVICE_ACCOUNT_KEY` | convert-pdf-to-html-deck (lossless PDF upload) | Yes | Base64-encoded GCP service account JSON key |
| `NARAKEET_API_KEY` | All skills (video generation) | Only if generating video | Narakeet TTS API key |

## Generating `GCS_SERVICE_ACCOUNT_KEY`

This key allows skills to upload files to Firebase Storage without gcloud CLI.

```bash
# 1. Create a dedicated service account
gcloud iam service-accounts create skills-storage-upload \
  --display-name="Skills Storage Upload" \
  --project=shockproof-dev

# 2. Grant Storage write access
gcloud projects add-iam-policy-binding shockproof-dev \
  --member="serviceAccount:skills-storage-upload@shockproof-dev.iam.gserviceaccount.com" \
  --role="roles/storage.objectCreator"

# 3. Generate a JSON key and base64-encode it
gcloud iam service-accounts keys create /tmp/sa-key.json \
  --iam-account=skills-storage-upload@shockproof-dev.iam.gserviceaccount.com

cat /tmp/sa-key.json | base64 | tr -d '\n'
# ↑ Copy this output — it is your GCS_SERVICE_ACCOUNT_KEY value

# 4. Clean up the plaintext key
rm /tmp/sa-key.json
```

> **Security:** The base64 value contains a private key. Treat it like a password — store it in Cowork secrets or a secure env var, never commit it to source control.

## Generating `RENDER_HTML_API_KEY`

This is already stored in Secret Manager. To retrieve it for Cowork:

```bash
gcloud secrets versions access latest --secret=RENDER_HTML_API_KEY --project=shockproof-dev
```

## Generating `NARAKEET_API_KEY`

Retrieve from Secret Manager:

```bash
gcloud secrets versions access latest --secret=NARAKEET_API_KEY --project=shockproof-dev
```

## Local Development

When running locally with gcloud CLI authenticated (`gcloud auth application-default login`):

- `RENDER_HTML_API_KEY` and `NARAKEET_API_KEY` are auto-resolved from Secret Manager
- `GCS_SERVICE_ACCOUNT_KEY` is not needed — gcloud auth provides Storage access directly
- `ANTHROPIC_API_KEY` is auto-resolved (or `CLAUDE_CODE_OAUTH_TOKEN` is used in Claude Code sessions)
