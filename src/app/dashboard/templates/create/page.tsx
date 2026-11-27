"use client"

import { useRouter } from "next/navigation"
import { trpc } from "@/lib/trpc/client"
import { TemplateForm } from "@/components/template-form"

export default function CreateTemplatePage() {
  const router = useRouter()
  const utils = trpc.useUtils()
  const createMutation = trpc.templates.create.useMutation({
    onSuccess: () => {
      utils.templates.getAll.invalidate()
      router.push("/dashboard/templates")
    },
  })

  function onSubmit(values: { name: string; subject: string; html: string }) {
    createMutation.mutate(values)
  }

  return (
    <TemplateForm
      title="New template"
      onSubmit={onSubmit}
      isPending={createMutation.isPending}
      error={createMutation.error?.message}
      submitLabel="Create template"
    />
  )
}
