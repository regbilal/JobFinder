import { LoginForm } from "@/components/LoginForm";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
            JF
          </div>
          <h1 className="text-xl font-semibold text-slate-900">JobFinder</h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in with your deployment access password.
          </p>
        </div>
        <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
          <LoginForm />
        </Suspense>
        <p className="mt-6 text-center text-xs text-slate-400">
          Set <code className="rounded bg-slate-100 px-1 py-0.5">APP_PASSWORD</code>{" "}
          in your environment (see <code className="rounded bg-slate-100 px-1 py-0.5">.env.example</code>).
        </p>
      </div>
    </div>
  );
}