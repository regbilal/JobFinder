#!/bin/sh
set -e
if [ -z "$PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH" ]; then
  CHROME="$(find /ms-playwright -path '*/chrome-linux/chrome' -type f 2>/dev/null | head -1)"
  if [ -n "$CHROME" ]; then
    export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="$CHROME"
  fi
fi
exec "$@"