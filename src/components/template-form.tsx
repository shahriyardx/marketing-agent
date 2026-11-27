"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Editor, { type BeforeMount } from "@monaco-editor/react"

import { templateError } from "@/lib/template-check"
import { fillTemplateVars } from "@/lib/template-preview"
import { PageBody, PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  subject: z.string().min(1, "Subject is required"),
  html: z.string().min(1, "HTML content is required"),
})

type FormValues = z.infer<typeof schema>

const FORM_ID = "template-form"
const VARIABLES = [
  "name",
  "first_name",
  "last_name",
  "email",
  "phone",
  "message",
]

const editorOptions = {
  minimap: { enabled: false },
  fontSize: 12,
  fontFamily: "var(--font-mono), ui-monospace, monospace",
  lineNumbers: "on" as const,
  scrollBeyondLastLine: false,
  wordWrap: "on" as const,
  padding: { top: 12, bottom: 12 },
  folding: true,
  lineDecorationsWidth: 8,
  lineNumbersMinChars: 3,
  renderLineHighlight: "line" as const,
  autoClosingQuotes: "always" as const,
  autoClosingBrackets: "always" as const,
}

// Editor colours that match the app's dark theme.
const defineTheme: BeforeMount = (monaco) => {
  monaco.editor.defineTheme("midnight", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#11141b",
      "editor.lineHighlightBackground": "#161a23",
      "editor.lineHighlightBorder": "#00000000",
      "editorLineNumber.foreground": "#4a5163",
      "editorLineNumber.activeForeground": "#8b93a4",
      "editorGutter.background": "#11141b",
      "editor.selectionBackground": "#9b8cff40",
      "editorCursor.foreground": "#9b8cff",
    },
  })
}

export function TemplateForm({
  title,
  defaultValues,
  onSubmit,
  isPending,
  submitLabel,
  error,
}: {
  title: string
  /** server error from saving, shown above the form */
  error?: string
  defaultValues?: FormValues
  onSubmit: (values: FormValues) => void
  isPending: boolean
  submitLabel: string
}) {
  const router = useRouter()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? { name: "", subject: "", html: "" },
  })
  const html = useWatch({ control: form.control, name: "html" })
  const syntaxError = html ? templateError(html) : null

  useEffect(() => {
    if (defaultValues) form.reset(defaultValues)
  }, [defaultValues, form])

  const text = (
    name: "name" | "subject",
    label: string,
    placeholder: string,
  ) => (
    <Controller
      name={name}
      control={form.control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={`tpl-${name}`}>{label}</FieldLabel>
          <Input
            {...field}
            id={`tpl-${name}`}
            placeholder={placeholder}
            aria-invalid={fieldState.invalid}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )

  return (
    <>
      <PageHeader title={title}>
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/templates")}
        >
          Cancel
        </Button>
        <Button type="submit" form={FORM_ID} disabled={isPending}>
          {isPending ? "Saving…" : submitLabel}
        </Button>
      </PageHeader>
      <PageBody>
        <form
          id={FORM_ID}
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive">
              {error}
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {text("name", "Template name", "Welcome email")}
            {text("subject", "Subject", "Welcome, {{first_name}}!")}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <section className="flex flex-col overflow-hidden rounded-xl border bg-card">
              <div className="flex flex-wrap items-center gap-1.5 border-b px-3 py-2">
                <span className="mr-1 font-heading text-sm font-semibold">
                  HTML
                </span>
                {VARIABLES.map((v) => (
                  <code
                    key={v}
                    className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
                  >{`{{${v}}}`}</code>
                ))}
                <code
                  title="Unsubscribe link, filled in by Mailgun. Use as href."
                  className="rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[11px] text-primary"
                >
                  %unsubscribe_url%
                </code>
              </div>
              <Controller
                name="html"
                control={form.control}
                render={({ field, fieldState }) => (
                  <>
                    <Editor
                      height="calc(100dvh - 260px)"
                      language="html"
                      value={field.value}
                      onChange={(v) => field.onChange(v ?? "")}
                      beforeMount={defineTheme}
                      theme="midnight"
                      options={editorOptions}
                    />
                    {(fieldState.invalid || syntaxError) && (
                      <div className="border-t px-3 py-2">
                        {syntaxError ? (
                          <p className="text-xs text-destructive">
                            {syntaxError}
                          </p>
                        ) : (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </div>
                    )}
                  </>
                )}
              />
            </section>

            <section className="flex flex-col overflow-hidden rounded-xl border bg-card">
              <div className="flex items-center border-b px-3 py-2">
                <span className="font-heading text-sm font-semibold">
                  Preview
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  Filled with sample data
                </span>
              </div>
              <iframe
                srcDoc={
                  html
                    ? fillTemplateVars(html)
                    : "<p style='font-family:sans-serif;color:#888;padding:16px'>Start typing HTML to see a preview.</p>"
                }
                title="Email preview"
                className="w-full bg-white"
                style={{ height: "calc(100dvh - 260px)", border: "none" }}
                sandbox=""
              />
            </section>
          </div>
        </form>
      </PageBody>
    </>
  )
}
