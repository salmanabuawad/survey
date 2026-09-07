"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/field";

export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(body?.message ?? "تعذر تسجيل الدخول");
      }
      router.replace("/admin/dashboard");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تسجيل الدخول");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md items-center px-4">
      <Card className="w-full">
        <CardContent className="space-y-5 pt-7">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-ink-800">لوحة التحكم</h1>
            <p className="text-sm text-ink-500">
              نتائج استبيان المعلمات في رياض الأطفال
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="admin-password" className="block text-sm font-medium">
                كلمة المرور
              </label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "admin-password-error" : undefined}
              />
            </div>

            {error ? (
              <p
                id="admin-password-error"
                role="alert"
                className="text-sm font-medium text-coral-600"
              >
                {error}
              </p>
            ) : null}

            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "جارٍ التحقق…" : "دخول"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
