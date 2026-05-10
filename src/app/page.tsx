"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, TrendingUp, BarChart3, Target } from "lucide-react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { LoginForm } from "@/components/login-form"
import { RegisterForm } from "@/components/register-form"
import { APP_NAME } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { trpc } from "@/lib/trpc/client"

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered Campaigns",
    description:
      "Generate high-converting marketing content in seconds using advanced AI models.",
  },
  {
    icon: Target,
    title: "Precision Targeting",
    description:
      "Reach the right audience with data-driven segmentation and personalization.",
  },
  {
    icon: TrendingUp,
    title: "Performance Analytics",
    description:
      "Track ROI, engagement, and conversions with real-time dashboards.",
  },
  {
    icon: BarChart3,
    title: "Smart Optimization",
    description:
      "Automatically A/B test and optimize campaigns for maximum results.",
  },
]

export default function Page() {
  const [mode, setMode] = useState<"login" | "register">("login")
  const router = useRouter()

  const { data: registrationEnabled = true } =
    trpc.settings.getRegistrationEnabled.useQuery()

  function handleSuccess() {
    router.push("/dashboard")
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Left — Brand & Info */}
      <div className="relative hidden flex-col justify-between bg-muted/40 p-10 lg:flex">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {APP_NAME}
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            Supercharge your marketing with AI. Create, optimize, and analyze
            campaigns — all from one intelligent platform.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Icon className="size-4 text-primary" />
                <span className="text-xs font-medium">{title}</span>
              </div>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right — Auth Form */}
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>
              {mode === "login" ? "Welcome back" : "Create an account"}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Sign in to your account to continue."
                : "Enter your details to get started."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mode === "login" ? (
              <LoginForm onSuccess={handleSuccess} />
            ) : registrationEnabled ? (
              <RegisterForm onSuccess={handleSuccess} />
            ) : (
              <div className="rounded-none border bg-muted/30 px-4 py-6 text-center">
                <p className="text-sm font-medium">Registration Disabled</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  New account creation is currently unavailable.
                </p>
              </div>
            )}

            <div className="mt-4 text-center text-xs text-muted-foreground">
              {mode === "login" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <Button
                    variant="link"
                    type="button"
                    onClick={() => setMode("register")}
                  >
                    Sign up
                  </Button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <Button
                    variant="link"
                    type="button"
                    onClick={() => setMode("login")}
                  >
                    Sign in
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
