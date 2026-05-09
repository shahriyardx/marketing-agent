"use client"

import { useParams, useRouter } from "next/navigation"
import { trpc } from "@/lib/trpc/client"
import { TemplateForm } from "@/components/template-form"

export default function EditTemplatePage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const utils = trpc.useUtils()
  const { data: existing } = trpc.templates.getById.useQuery({ id })
  const updateMutation = trpc.templates.update.useMutation({
    onSuccess: () => {
      utils.templates.getAll.invalidate()
      router.push("/dashboard/templates")
    },
  })

  function onSubmit(values: { name: string; subject: string; html: string }) {
    updateMutation.mutate({ id, ...values })
  }

  if (!existing) return null

  return (
    <>
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Edit Template
        </h1>
        <p className="text-sm text-muted-foreground">
          Update your email template.
        </p>
      </div>
      <TemplateForm
        defaultValues={{
          name: existing.name,
          subject: existing.subject,
          html: existing.html,
        }}
        onSubmit={onSubmit}
        isPending={updateMutation.isPending}
        submitLabel="Save Changes"
      />
    </>
  )
}
