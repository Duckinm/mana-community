# MANA MCP connection

MANA exposes one public, stateless MCP endpoint. It lets an AI client use a curated set of MANA workspace actions without exposing MANA's internal infrastructure or provider credentials.

| | |
| --- | --- |
| Endpoint | `http://localhost:3300/mcp` for the Docker preview (host development: `http://localhost:4000/mcp`) |
| Transport | Streamable HTTP, stateless |
| Authentication | `Authorization: Bearer $MANA_MCP_TOKEN` |
| Token | Settings → AI → MCP connection → **Copy setup** |
| Version | `/mcp` is the current public contract; there is no `/mcp/v2` yet |

## Quick setup

1. In MANA, open **Settings → AI → MCP connection** and choose **Copy setup**.
2. Save the private token in the environment that launches your AI client:

   ```sh
   export MANA_MCP_TOKEN=your-private-token
   ```

3. Configure the client with the endpoint and the bearer-token environment variable.
4. Restart the client, then ask it to list its MCP tools.

Treat the token like a password. MANA accepts bearer tokens only; it deliberately rejects tokens in a query string so they cannot be copied into browser history or proxy logs. If an older URL-based setup was ever shared, regenerate the token in Settings before reconnecting.

### Codex

Add this to `~/.codex/config.toml` (or a trusted project's `.codex/config.toml`):

```toml
[mcp_servers.mana]
url = "http://localhost:3300/mcp"
bearer_token_env_var = "MANA_MCP_TOKEN"
```

Codex's desktop app, CLI, and IDE extension share this MCP configuration. Restart the client after setting the environment variable.

### Other MCP clients

Use the same endpoint and send this request header:

```text
Authorization: Bearer YOUR_TOKEN
```

The user-facing guide has copyable setup examples for Claude Code, Gemini CLI, Cursor, VS Code, and Claude Desktop: [MANA MCP guide](https://heymana.app/docs/mcp/).

## What an external client can do

The public catalog is an explicit capability profile, not a mirror of every in-app tool. It covers normal MANA work such as:

- projects and tasks, including task-label lookup, creation, and editing;
- contacts and client history;
- a paged document library plus safe document detail and publishing for quotations, invoices, and receipts;
- transactions, a paged transaction list, and a bounded next-month cash-flow forecast;
- MANA storage metadata and folders;
- MANA calendar events and refresh for a Google Calendar connection already configured in MANA;

The client discovers only the tools enabled for that token. List-style reads are bounded (normally 50 items by default, up to 100 where supported), so a client starts with the smallest useful context. Use a returned ID to request a detail or make a change.

External MCP uses the same service-layer checks as the app. For example, `create_document` applies the document workflow's sender, client, item, project, recurring-schedule, and date rules; AI actions require a configured provider, and Google Calendar sync requires a connected account. Community features have no subscription tiers or action quotas.

Before an external client publishes a document, it must first ask the owner and send `confirmPublish: true`. Calendar events stay in MANA by default; sending one to an already-connected Google Calendar requires both `syncToGoogle: true` and `confirmGoogleSync: true` after the owner confirms. Calendar connection setup and removal stay in MANA's settings UI.

## What is deliberately not public MCP

External MCP never exposes:

- MANA HQ or provider administration for Neon, Sentry, Cloudflare, Fly.io, Stripe, or other operations systems;
- OAuth tokens, API keys, or other credentials;
- outbound email/reminder sends, token rotation, account settings, chat-only UI controls, file uploads, or signed download URLs;
- permanent deletion, signed download links, and unbounded account exports.

Google Calendar is an exception to the integration boundary only in a narrow sense: the client can work with connections the user has already made inside MANA. MANA performs provider work under its own existing ownership and provider-connection checks; the client never receives a Google credential.

New tools are private by default. A tool becomes public only when it is added to the external allow-list in `apps/api/src/utils/mcp-tools/capabilities.ts` and is reviewed for ownership, validation, result size, and side effects.
