import fs from "fs";
import path from "path";
import { chromium, type LaunchOptions } from "playwright-core";

const EXEC_RELATIVE = [
  path.join("chrome-linux", "chrome"),
  path.join("chrome-linux", "headless_shell"),
];

function browserSearchRoots(): string[] {
  const roots: string[] = [];
  const add = (p: string | undefined) => {
    const trimmed = p?.trim();
    if (trimmed) roots.push(trimmed);
  };

  add(process.env.PLAYWRIGHT_BROWSERS_PATH);
  add("/ms-playwright");

  if (process.env.LOCALAPPDATA) {
    add(path.join(process.env.LOCALAPPDATA, "ms-playwright"));
  }
  if (process.env.HOME) {
    add(path.join(process.env.HOME, ".cache", "ms-playwright"));
  }

  return [...new Set(roots)];
}

function findChromiumUnder(root: string): string | undefined {
  let entries: string[];
  try {
    entries = fs.readdirSync(root);
  } catch {
    return undefined;
  }

  for (const entry of entries) {
    if (!entry.startsWith("chromium")) continue;
    for (const rel of EXEC_RELATIVE) {
      const full = path.join(root, entry, rel);
      if (fs.existsSync(full)) return full;
    }
  }
  return undefined;
}

/** Prefer env, then browsers shipped in the Playwright Docker image or local install. */
export function resolveChromiumExecutable(): string | undefined {
  const fromEnv =
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim() ||
    process.env.CHROME_PATH?.trim();
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;

  for (const root of browserSearchRoots()) {
    const found = findChromiumUnder(root);
    if (found) return found;
  }

  return undefined;
}

export class ChromiumUnavailableError extends Error {
  constructor() {
    const onVercel = Boolean(process.env.VERCEL);
    super(
      onVercel
        ? "Logged-in browser mode cannot run on Vercel (no Chromium in the sandbox). Deploy this repo with the Dockerfile on Railway, or use Guest fetch / API search modes here."
        : "Chromium was not found on this server. Deploy with the project Dockerfile on Railway (Playwright image), set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, or run locally: npx playwright install chromium"
    );
    this.name = "ChromiumUnavailableError";
  }
}

export function chromiumLaunchOptions(): LaunchOptions {
  const executablePath = resolveChromiumExecutable();
  if (!executablePath) {
    throw new ChromiumUnavailableError();
  }

  return {
    headless: true,
    executablePath,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  };
}

export async function launchChromium() {
  return chromium.launch(chromiumLaunchOptions());
}

/** Strip noisy Playwright install banners from wrapped errors. */
export function formatPlaywrightLaunchError(e: unknown): string {
  if (e instanceof ChromiumUnavailableError) return e.message;
  const raw = e instanceof Error ? e.message : String(e);
  if (raw.includes("Executable doesn't exist")) {
    return new ChromiumUnavailableError().message;
  }
  const box = raw.indexOf("╔");
  if (box > 0) return raw.slice(0, box).trim() || raw;
  return raw;
}