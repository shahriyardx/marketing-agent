"use client"

import { trpc } from "@/lib/trpc/client"
import { PageBody, PageHeader } from "@/components/page-header"
import { Switch } from "@/components/ui/switch"

export default function SettingsPage() {
  const utils = trpc.useUtils()
  const { data: registrationEnabled = true } =
    trpc.settings.getRegistrationEnabled.useQuery()
  const mutation = trpc.settings.setRegistrationEnabled.useMutation({
    onSuccess: () => utils.settings.getRegistrationEnabled.invalidate(),
  })

  return (
    <>
      <PageHeader title="Settings" />
      <PageBody>
        <section className="max-w-3xl overflow-hidden rounded-xl border bg-card">
          <h2 className="border-b px-4 py-3 font-heading text-sm font-semibold">
            Access
          </h2>
          <div className="flex items-center gap-4 px-4 py-3.5">
            <div className="flex-1">
              <p className="font-medium">Allow sign-ups</p>
              <p className="text-muted-foreground">
                Anyone with the link can create an account. Turn off once your
                team has joined.
              </p>
            </div>
            <Switch
              aria-label={"Allow sign-ups"}
              checked={registrationEnabled}
              onCheckedChange={(checked) =>
                mutation.mutate({ enabled: checked })
              }
            />
          </div>
        </section>
      </PageBody>
    </>
  )
}
