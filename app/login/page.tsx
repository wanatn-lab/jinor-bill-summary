"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Older releases cached the login page in the PWA service worker. Remove
  // that obsolete worker so a previously opened device immediately uses the
  // current authentication code.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) =>
        Promise.all(registrations.map((registration) => registration.unregister())),
      )
      .catch(() => undefined);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        body: JSON.stringify({ username: username.trim(), password }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setErrorMessage(result.error ?? "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
        return;
      }
    } catch {
      setErrorMessage("ไม่สามารถเชื่อมต่อระบบเข้าสู่ระบบได้");
      return;
    } finally {
      setIsLoading(false);
    }

    const next = new URLSearchParams(window.location.search).get("next");
    const destination =
      next === "/admin" || next?.startsWith("/admin/") ? next : "/admin";

    router.replace(destination);
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <form
        className="w-full max-w-sm space-y-5 rounded-2xl bg-white p-6 shadow-lg"
        onSubmit={handleSubmit}
      >
        <div>
          <p className="text-sm font-semibold text-orange-600">Jinko & Kim Ngek</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Admin Login</h1>
          <p className="mt-1 text-sm text-slate-500">
            เข้าสู่ระบบเพื่อดูข้อมูลของร้าน
          </p>
        </div>

        <label className="block text-sm font-medium text-slate-700">
          ชื่อผู้ใช้
          <input
            autoCapitalize="none"
            autoComplete="username"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            disabled={isLoading}
            onChange={(event) => setUsername(event.target.value)}
            required
            type="text"
            value={username}
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          รหัสผ่าน
          <input
            autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            disabled={isLoading}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>

        {errorMessage ? (
          <p className="text-sm text-red-600" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <button
          className="w-full rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>

      </form>
    </main>
  );
}
