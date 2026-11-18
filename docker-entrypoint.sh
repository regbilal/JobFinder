#!/bin/sh
set -e
if [ -z "$PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH" ]; then
  CHROME="$(find /ms-playwright -type f \( -path '*/chrome-linux/chrome' -o -path '*/chrome-linux/headless_shell' \) 2>/dev/null | head -1)"
  if [ -n "$CHROME" ]; then
    export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="$CHROME"
  fi
fi
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-/ms-playwright}"
exec "$@"