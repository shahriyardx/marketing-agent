"use client"

import { trpc } from "@/lib/trpc/client"
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
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage application settings.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-none border p-4">
        <div>
          <h2 className="text-sm font-medium">Registration</h2>
          <p className="text-xs text-muted-foreground">
            Allow new users to create accounts.
          </p>
        </div>
        <Switch
          checked={registrationEnabled}
          onCheckedChange={(checked) => mutation.mutate({ enabled: checked })}
        />
      </div>
    </>
  )
}
