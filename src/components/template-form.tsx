"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Editor from "@monaco-editor/react"

import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { fillTemplateVars } from "@/lib/template-preview"

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  subject: z.string().min(1, "Subject is required"),
  html: z.string().min(1, "HTML content is required"),
})

type FormValues = z.infer<typeof schema>

const editorOptions = {
  minimap: { enabled: false },
  fontSize: 12,
  fontFamily: "var(--font-mono), ui-monospace, monospace",
  lineNumbers: "on" as const,
  scrollBeyondLastLine: false,
  wordWrap: "on" as const,
  padding: { top: 12, bottom: 12 },
  glyphMargin: true,
  folding: true,
  lineDecorationsWidth: 0,
  lineNumbersMinChars: 0,
  autoClosingQuotes: "always" as const,
  autoClosingBrackets: "always" as const,
}

export function TemplateForm({
  defaultValues,
  onSubmit,
  isPending,
  submitLabel,
}: {
  defaultValues?: FormValues
  onSubmit: (values: FormValues) => void
  isPending: boolean
  submitLabel: string
}) {
  const router = useRouter()
  const { resolvedTheme } = useTheme()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? { name: "", subject: "", html: "" },
  })

  useEffect(() => {
    if (defaultValues) {
      form.reset(defaultValues)
    }
  }, [defaultValues, form])

  return (
    <>
      <div className="rounded-none border bg-muted/30 px-4 py-3">
        <p className="text-xs font-medium">Template Variables</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Use Handlebars variables like{" "}
          <code className="rounded-none bg-muted px-1">{`{{name}}`}</code>,{" "}
          <code className="rounded-none bg-muted px-1">{`{{email}}`}</code>,{" "}
          <code className="rounded-none bg-muted px-1">{`{{first_name}}`}</code>
          . Conditionals and helpers also supported.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FieldGroup>
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="tpl-name">Template Name</FieldLabel>
                <Input
                  {...field}
                  id="tpl-name"
                  placeholder="Welcome Email"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <Controller
            name="subject"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="tpl-subject">Subject</FieldLabel>
                <Input
                  {...field}
                  id="tpl-subject"
                  placeholder="Welcome, {{name}}!"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <Controller
            name="html"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <Tabs defaultValue="html">
                  <TabsList>
                    <TabsTrigger value="html">HTML</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                  </TabsList>
                  <TabsContent value="html">
                    <div
                      className={
                        fieldState.invalid
                          ? "overflow-hidden rounded-none border-2 border-destructive/50"
                          : "overflow-hidden rounded-none border"
                      }
                    >
                      <Editor
                        height="400px"
                        language="html"
                        value={field.value}
                        onChange={(v) => field.onChange(v ?? "")}
                        theme={resolvedTheme === "dark" ? "vs-dark" : "vs"}
                        options={editorOptions}
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="preview">
                    <div className="overflow-hidden rounded-none border bg-white">
                      <iframe
                        srcDoc={
                          field.value
                            ? fillTemplateVars(field.value)
                            : "<p>Nothing to preview</p>"
                        }
                        title="Preview"
                        className="w-full"
                        style={{ height: 400, border: "none" }}
                        sandbox=""
                      />
                    </div>
                  </TabsContent>
                </Tabs>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </FieldGroup>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/templates")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving…" : submitLabel}
          </Button>
        </div>
      </form>
    </>
  )
}
