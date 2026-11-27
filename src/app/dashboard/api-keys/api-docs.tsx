"use client"

import { useEffect, useState } from "react"
import { CheckIcon, CopyIcon, DownloadIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { wordpressPluginPhp } from "@/lib/wordpress-plugin"
import { Button } from "@/components/ui/button"

/** This app's address; read after mount so server and client HTML match. */
function useOrigin() {
  const [origin, setOrigin] = useState("https://your-domain.com")
  useEffect(() => setOrigin(window.location.origin), [])
  return origin
}

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [done, setDone] = useState(false)
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={done ? "Copied" : "Copy"}
      className={className}
      onClick={() => {
        navigator.clipboard.writeText(text)
        setDone(true)
        setTimeout(() => setDone(false), 1500)
      }}
    >
      {done ? <CheckIcon className="text-success" /> : <CopyIcon />}
    </Button>
  )
}

function Code({
  code,
  className,
  bare,
}: {
  code: string
  className?: string
  /** no frame of its own, for use inside a card */
  bare?: boolean
}) {
  return (
    <div className={cn("relative", className)}>
      <pre
        className={cn(
          "max-h-96 overflow-auto p-3 pr-12 font-mono text-xs leading-relaxed",
          !bare && "rounded-lg border bg-background",
        )}
      >
        {code}
      </pre>
      <CopyButton text={code} className="absolute top-1.5 right-1.5" />
    </div>
  )
}

function Fold({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <details className="group rounded-xl border bg-card">
      <summary className="flex cursor-pointer list-none items-center px-4 py-3 font-medium select-none [&::-webkit-details-marker]:hidden">
        {title}
        <span className="ml-auto text-muted-foreground transition-transform group-open:rotate-90">
          ›
        </span>
      </summary>
      <div className="space-y-3 border-t px-4 py-4">{children}</div>
    </details>
  )
}

// ------------------------------------------------------------- WordPress

const WP_FORMS = [
  ["WPForms", "Works as is"],
  ["Gravity Forms", "Works as is"],
  [
    "Contact Form 7",
    "Name fields first-name, last-name (or your-name), your-email, phone, your-message",
  ],
  [
    "Elementor Pro",
    "Set each field's ID to first_name, last_name (or name), email, phone, message",
  ],
]

export function WordPressGuide({ onCreateKey }: { onCreateKey: () => void }) {
  const origin = useOrigin()
  const steps = [
    {
      title: "Download the plugin",
      text: "It already knows this app's address.",
      action: (
        <Button asChild>
          <a href="/api/wordpress-plugin" download>
            <DownloadIcon />
            Download .zip
          </a>
        </Button>
      ),
    },
    {
      title: "Install it",
      text: "In WordPress: Plugins › Add New › Upload Plugin, then Activate.",
    },
    {
      title: "Connect",
      text: "Settings › Marketing Agent. Paste an API key and save. It shows Connected.",
      action: (
        <Button variant="outline" onClick={onCreateKey}>
          Create a key
        </Button>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <ol className="grid gap-3 md:grid-cols-3">
        {steps.map((s, i) => (
          <li
            key={s.title}
            className="flex flex-col gap-2 rounded-xl border bg-card p-4"
          >
            <span className="font-mono text-xs text-muted-foreground">
              Step {i + 1}
            </span>
            <h3 className="font-heading text-sm font-semibold">{s.title}</h3>
            <p className="flex-1 text-muted-foreground">{s.text}</p>
            {s.action && <div className="pt-1">{s.action}</div>}
          </li>
        ))}
      </ol>

      <section className="overflow-hidden rounded-xl border bg-card">
        <h3 className="border-b px-4 py-3 font-heading text-sm font-semibold">
          Supported form plugins
        </h3>
        <ul>
          {WP_FORMS.map(([name, note]) => (
            <li
              key={name}
              className="flex flex-wrap gap-x-4 gap-y-0.5 border-b border-border/60 px-4 py-2.5 last:border-0"
            >
              <span className="w-32 font-medium">{name}</span>
              <span className="text-muted-foreground">{note}</span>
            </li>
          ))}
        </ul>
        <p className="border-t px-4 py-2.5 text-xs text-muted-foreground">
          Every form is sent by default. To pick forms, use Forms in the plugin
          settings.
        </p>
      </section>

      <Fold title="Install by hand instead">
        <p className="text-muted-foreground">
          Create{" "}
          <code className="font-mono text-xs">
            wp-content/plugins/marketing-agent-connector/marketing-agent-connector.php
          </code>{" "}
          with this code, then activate it.
        </p>
        <Code code={wordpressPluginPhp(origin)} />
      </Fold>
      <Fold title="Keep the key out of the database">
        <p className="text-muted-foreground">
          Add this to <code className="font-mono text-xs">wp-config.php</code>.
          It overrides the key on the settings page.
        </p>
        <Code code="define( 'MARKETING_AGENT_API_KEY', 'YOUR_API_KEY' );" />
      </Fold>
    </div>
  )
}

// ------------------------------------------------------------- Developers

const FIELDS = [
  ["firstName", true, "First name"],
  ["lastName", true, "Last name"],
  ["email", true, "Must be unique"],
  ["phone", false, "Phone number"],
  ["message", false, "Free text"],
] as const

const RESPONSES = [
  ["200", "Created; returns the contact"],
  ["400", "Invalid body; returns field errors"],
  ["401", "Missing or wrong API key"],
  ["409", "Email already exists"],
]

const LANGS = ["cURL", "Node.js", "PHP"] as const

export function DeveloperDocs() {
  const origin = useOrigin()
  const [lang, setLang] = useState<(typeof LANGS)[number]>("cURL")
  const url = `${origin}/api/v1/add-contact`

  const code = {
    cURL: `curl -X POST ${url} \\
  -H "Authorization: Bearer $MARKETING_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"firstName":"Jane","lastName":"Doe","email":"jane@example.com"}'`,
    "Node.js": `const res = await fetch("${url}", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.MARKETING_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ firstName, lastName, email, phone, message }),
})
if (!res.ok) console.error(await res.json())`,
    PHP: `$ch = curl_init("${url}");
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => [
    "Authorization: Bearer " . getenv("MARKETING_API_KEY"),
    "Content-Type: application/json",
  ],
  CURLOPT_POSTFIELDS => json_encode([
    "firstName" => $_POST["firstName"],
    "lastName"  => $_POST["lastName"],
    "email"     => $_POST["email"],
  ]),
]);
$response = curl_exec($ch);`,
  }[lang]

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[11px] font-medium text-primary">
            POST
          </span>
          <code className="font-mono text-xs whitespace-nowrap">{url}</code>
          <CopyButton text={url} className="ml-auto" />
        </div>
        <p className="text-muted-foreground">
          Adds a contact, then sends it one active campaign. Send{" "}
          <code className="font-mono text-xs text-foreground">
            Authorization: Bearer YOUR_API_KEY
          </code>
          . Call it from your server only; a key in browser code is public.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="flex flex-col gap-4">
          <section className="overflow-hidden rounded-xl border bg-card">
            <h3 className="border-b px-4 py-3 font-heading text-sm font-semibold">
              Body (JSON)
            </h3>
            <ul>
              {FIELDS.map(([name, required, note]) => (
                <li
                  key={name}
                  className="flex items-center gap-3 border-b border-border/60 px-4 py-2 last:border-0"
                >
                  <code className="w-24 font-mono text-xs">{name}</code>
                  <span className="flex-1 text-muted-foreground">{note}</span>
                  <span
                    className={cn(
                      "text-xs",
                      required ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {required ? "Required" : "Optional"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section className="overflow-hidden rounded-xl border bg-card">
            <h3 className="border-b px-4 py-3 font-heading text-sm font-semibold">
              Responses
            </h3>
            <ul>
              {RESPONSES.map(([status, note]) => (
                <li
                  key={status}
                  className="flex gap-3 border-b border-border/60 px-4 py-2 last:border-0"
                >
                  <code className="w-10 font-mono text-xs">{status}</code>
                  <span className="text-muted-foreground">{note}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="flex min-w-0 flex-col rounded-xl border bg-card">
          <div className="flex items-center gap-1 border-b px-2 py-1.5">
            {LANGS.map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={lang === l}
                onClick={() => setLang(l)}
                className={cn(
                  "h-7 rounded-md px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground",
                  lang === l && "bg-muted text-foreground",
                )}
              >
                {l}
              </button>
            ))}
          </div>
          <Code code={code} bare className="px-1 py-2" />
          <p className="mt-auto border-t px-4 py-2.5 text-xs text-muted-foreground">
            Test a key:{" "}
            <code className="font-mono">GET {origin}/api/v1/hello</code>
          </p>
        </section>
      </div>
    </div>
  )
}
