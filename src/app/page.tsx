"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MailIcon } from "lucide-react"

import { LoginForm } from "@/components/login-form"
import { RegisterForm } from "@/components/register-form"
import { APP_NAME } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { trpc } from "@/lib/trpc/client"

export default function Page() {
  const [mode, setMode] = useState<"login" | "register">("login")
  const router = useRouter()

  const { data: registrationEnabled = true } =
    trpc.settings.getRegistrationEnabled.useQuery()

  function handleSuccess() {
    router.push("/dashboard")
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <MailIcon className="size-4" strokeWidth={2.4} />
          </span>
          <span className="font-heading text-[15px] font-semibold">
            {APP_NAME}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-xl font-semibold">
            {mode === "login" ? "Sign in" : "Create an account"}
          </h1>
          <p className="text-muted-foreground">
            {mode === "login"
              ? "Use your work email and password."
              : "Set up your login for this workspace."}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          {mode === "login" ? (
            <LoginForm onSuccess={handleSuccess} />
          ) : registrationEnabled ? (
            <RegisterForm onSuccess={handleSuccess} />
          ) : (
            <div className="py-4 text-center">
              <p className="font-medium">Sign-ups are closed</p>
              <p className="mt-1 text-muted-foreground">
                Ask an admin to turn them on in Settings.
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-muted-foreground">
          {mode === "login" ? "No account yet?" : "Already have an account?"}{" "}
          <Button
            variant="link"
            type="button"
            className="h-auto px-0"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Create one" : "Sign in"}
          </Button>
        </p>
      </div>
    </main>
  )
}
