"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

export function LinkedInConnect() {
  const [connected, setConnected] = useState(false);
  const [source, setSource] = useState<"env" | "cookie" | "none">("none");
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [liAtPaste, setLiAtPaste] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const refreshStatus = useCallback(async () => {
    const res = await fetch("/api/linkedin/status");
    if (!res.ok) return;
    const data = await res.json();
    setConnected(Boolean(data.connected));
    setSource(data.source ?? "none");
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  async function onConnect(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/linkedin/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          liAtPaste.trim()
            ? { liAt: liAtPaste.trim() }
            : { email, password }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Connection failed.");
        return;
      }
      setPassword("");
      setLiAtPaste("");
      setOpen(false);
      await refreshStatus();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  async function disconnect() {
    await fetch("/api/linkedin/disconnect", { method: "POST" });
    await refreshStatus();
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">LinkedIn session</p>
          <p className="text-xs text-slate-500">
            {connected
              ? source === "env"
                ? "Connected via server env (LINKEDIN_LI_AT)"
                : "Connected — browser mode can run searches"
              : "Connect so Logged-in browser can fetch jobs and posts"}
          </p>
        </div>
        <div className="flex gap-2">
          {connected && source !== "env" ? (
            <button
              type="button"
              onClick={disconnect}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700"
            >
              Disconnect
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg bg-[#0a66c2] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#004182]"
          >
            {connected ? "Reconnect" : "Connect LinkedIn"}
          </button>
        </div>
      </div>

      <p className="mt-2 text-[11px] text-slate-500">
        This is not the official “Sign in with LinkedIn” OAuth permission screen.
        We sign you in once with Playwright, store an encrypted session cookie on this
        server, and never store your password.
      </p>

      {open ? (
        <form onSubmit={onConnect} className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-slate-600">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                autoComplete="current-password"
              />
            </div>
          </div>
          <p className="text-center text-xs text-slate-400">or paste cookie</p>
          <div>
            <label className="text-xs font-medium text-slate-600">li_at cookie</label>
            <input
              type="password"
              value={liAtPaste}
              onChange={(e) => setLiAtPaste(e.target.value)}
              placeholder="If 2FA blocked login"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[#0a66c2] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Connecting…" : "Connect"}
          </button>
        </form>
      ) : null}
    </div>
  );
}