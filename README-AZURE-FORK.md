# OpenCode - Azure OpenAI Fork

This is a fork of [OpenCode](https://github.com/anomalyco/opencode) with patches to support Azure OpenAI GPT-5.x models via OpenAI-compatible proxies (e.g., ZotGPT Gateway, Portkey).

## What's Different?

This fork includes fixes for two compatibility issues when routing GPT-5.x models through OpenAI-compatible API gateways:

1. **`max_tokens` → `max_completion_tokens`**: Azure's newer API requires `max_completion_tokens` instead of `max_tokens` for GPT-4.1+ and GPT-5.x models. The fix transforms the request body at the fetch layer.

2. **Reasoning defaults**: Azure OpenAI rejects requests that combine `reasoning_effort` with function tools on the `/v1/chat/completions` endpoint. The fix skips automatic `reasoningEffort`/`reasoningSummary` defaults for models using `@ai-sdk/openai-compatible`.

These fixes are scoped to only affect `openai-compatible` proxy routes, preserving full reasoning support for native `@ai-sdk/openai` and `@ai-sdk/azure` users.

## Quick Install

### Option 1: Pre-built Binary (Linux x64)

Download the latest release from this fork:

```bash
curl -fsSL https://github.com/joachimvandekerckhove/opencode/releases/latest/download/opencode-linux-x64.zip -o opencode.zip
unzip opencode.zip
chmod +x opencode
sudo mv opencode /usr/local/bin/  # or ~/.local/bin/
```

### Option 2: Build from Source

Requires [Bun](https://bun.sh) 1.3+:

```bash
git clone https://github.com/joachimvandekerckhove/opencode.git
cd opencode
bun install
cd packages/opencode
bun build --compile src/index.ts --outfile=opencode
sudo mv opencode /usr/local/bin/  # or ~/.local/bin/
```

### Option 3: Use Original Install Script

You can also use the original install script and then replace the binary with the patched version:

```bash
# Install original
curl -fsSL https://opencode.ai/install | bash

# Replace with patched version (after building from source above)
cp /path/to/your/patched/opencode ~/.opencode/bin/opencode
```

## Configuration for ZotGPT Gateway

Create an `opencode.json` config file:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "zotgpt": {
      "name": "ZotGPT Gateway",
      "portkey-anthropic": {
        "npm": "@ai-sdk/anthropic",
        "name": "UCI ZotGPT (Anthropic)",
        "options": {
          "baseURL": "https://api.portkey.ai/v1",
          "apiKey": "bypass-validation",
          "headers": {
            "x-portkey-api-key": "YOUR_API_KEY"
          }
        },
        "models": {
          "@zotgpt-api-bedrock/us.anthropic.claude-sonnet-4-6": {
            "name": "UCI/Claude Sonnet 4.6"
          }
        }
      },
      "portkey-openai": {
        "npm": "@ai-sdk/openai",
        "name": "UCI ZotGPT (OpenAI)",
        "options": {
          "baseURL": "https://api.portkey.ai/v1",
          "apiKey": "bypass-validation",
          "headers": {
            "x-portkey-api-key": "YOUR_API_KEY"
          }
        },
        "models": {
          "@zotgpt-api-azure/gpt-5.6-luna": {
            "name": "UCI/GPT 5.6 Luna",
            "family": "gpt"
          },
          "@zotgpt-api-azure/gpt-5.6-terra": {
            "name": "UCI/GPT 5.6 Terra",
            "family": "gpt"
          },
          "@zotgpt-api-azure/gpt-5.6-sol": {
            "name": "UCI/GPT 5.6 Sol",
            "family": "gpt"
          }
        }
      }
    }
  }
}
```

Then run:

```bash
export OPENCODE_CONFIG=/path/to/opencode.json
opencode run -m "zotgpt/@zotgpt-api-azure/gpt-5.6-luna" -- "Hello!"
```

## Tested Models

This fork has been tested with:

- ✅ GPT-5.6-luna (Azure via Portkey)
- ✅ GPT-5.6-terra (Azure via Portkey)
- ✅ GPT-5.6-sol (Azure via Portkey)
- ✅ Claude Sonnet 4.6 (Bedrock)
- ✅ Claude Opus 5 (Bedrock)
- ✅ Claude Sonnet 5 (Bedrock)
- ✅ Gemma 4 E2b (Mantle)
- ✅ Kimi k2.5 (Mantle)

## Upstream

This fork tracks the upstream `anomalyco/opencode:dev` branch. To sync:

```bash
git remote add upstream https://github.com/anomalyco/opencode.git
git fetch upstream
git rebase upstream/dev
```

## License

MIT - Same as upstream OpenCode.
