"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function AppShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <Link href="/dashboard" className="group inline-flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0a66c2] text-sm font-bold text-white shadow-sm">
                in
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900 group-hover:text-[#0a66c2]">
                  JobFinder
                </p>
                <p className="text-xs text-slate-500">LinkedIn job postings</p>
              </div>
            </Link>
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 max-w-2xl text-sm text-slate-600">{subtitle}</p>
          ) : null}
        </div>
        {children}
      </main>
    </div>
  );
}