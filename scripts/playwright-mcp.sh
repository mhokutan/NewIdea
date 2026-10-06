#!/usr/bin/env bash
# Starts Microsoft's Playwright MCP server.
# In Claude Code cloud sessions it uses the preinstalled Chromium and the agent proxy;
# on a normal computer it falls back to Playwright's own browser.
args=(--headless --isolated --output-dir .playwright-mcp)
if [ -x /opt/pw-browsers/chromium ]; then
  args+=(--executable-path /opt/pw-browsers/chromium --ignore-https-errors)
  if [ -n "$HTTPS_PROXY" ]; then
    args+=(--proxy-server "$HTTPS_PROXY" --proxy-bypass "localhost,127.0.0.1")
  fi
fi
exec npx -y @playwright/mcp@latest "${args[@]}"
