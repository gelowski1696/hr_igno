"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpRight, Eye, EyeOff, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APP_BRAND } from "@/lib/brand";
import { defaultPathForRole } from "@/lib/navigation";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const router = useRouter();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function submit(values: LoginValues) {
    setError(null);
    try {
      const user = await login(values);
      router.replace(defaultPathForRole(user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f6fb] text-ink">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden lg:block">
          <img
            src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1900&q=80"
            alt="People collaborating in a modern office"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0b1324]/85 via-[#13203c]/72 to-[#1c2d55]/65" />
          <div className="absolute inset-x-0 bottom-0 px-12 pb-14">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100/90">
              {APP_BRAND.shortName}
            </p>
            <h2 className="mt-4 max-w-xl font-slab text-5xl font-bold leading-[1.02] text-white">
              Run every workday with one clear view.
            </h2>
            <p className="mt-4 max-w-lg text-base leading-7 text-blue-50/90">
              Attendance, people records, and approvals in one calm workspace.
            </p>
          </div>
        </section>

        <section className="relative flex items-center justify-center px-4 py-8 sm:px-8 sm:py-10 lg:px-12">
          <div className="w-full max-w-[440px]">
            <div className="mb-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">
                {APP_BRAND.fullName}
              </p>
              <h1 className="mt-3 font-slab text-[30px] font-bold leading-9 text-ink sm:text-[36px] sm:leading-10">
                Welcome back
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Sign in to continue.
              </p>
            </div>

            <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
              <label className="block">
                <span className="sr-only">Username</span>
                <Input
                  className="h-12 rounded-lg border-line bg-white px-4 text-[15px] font-medium placeholder:text-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15"
                  autoComplete="username"
                  placeholder="Username"
                  {...form.register("username")}
                />
                {form.formState.errors.username?.message ? (
                  <span className="mt-1 block text-xs text-signal-red">
                    ! {form.formState.errors.username.message}
                  </span>
                ) : null}
              </label>

              <label className="block">
                <span className="sr-only">Password</span>
                <div className="relative">
                  <Input
                    className="h-12 rounded-lg border-line bg-white px-4 pr-12 text-[15px] font-medium placeholder:text-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Password"
                    {...form.register("password")}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-ink"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {form.formState.errors.password?.message ? (
                  <span className="mt-1 block text-xs text-signal-red">
                    ! {form.formState.errors.password.message}
                  </span>
                ) : null}
              </label>

              {error ? (
                <div className="rounded-lg border border-signal-red/40 bg-red-50 px-3 py-2.5 text-sm font-medium text-signal-red">
                  {error}
                </div>
              ) : null}

              <Button
                className="h-12 w-full rounded-lg text-[15px]"
                type="submit"
                icon={<LogIn className="h-4 w-4" />}
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Please wait" : "Continue"}
              </Button>
            </form>

            <div className="mt-6 flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">Need to clock in?</p>
              <Link
                className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
                href="/remote-clock"
              >
                Open remote clock
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
