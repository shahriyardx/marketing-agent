import Handlebars from "handlebars"
import { htmlToText } from "@/lib/html-to-text"

type ContactData = {
  firstName: string
  lastName: string
  email: string
  phone: string | null
  message: string | null
}

type MailgunAccountData = {
  apiKey: string
  fromEmail: string
  domain: string
  name: string
}

type TemplateData = {
  subject: string
  html: string
}

export type SendInput = {
  campaign: {
    id: string
    name: string
    template: TemplateData
    mailgunAccount: MailgunAccountData
  }
  contact: ContactData
}

export type SendResult =
  | { sent: true; messageId: string | null }
  | { sent: false; status: number; body: string; retryAfter?: number }

function renderVars(text: string, contact: ContactData) {
  const template = Handlebars.compile(text)
  return template({
    name: `${contact.firstName} ${contact.lastName}`,
    first_name: contact.firstName,
    last_name: contact.lastName,
    email: contact.email,
    phone: contact.phone ?? "",
    message: contact.message ?? "",
  })
}

const STATUS_HINTS: Record<number, string> = {
  401: "the API key is invalid or revoked",
  403: "the API key isn't allowed to send for this domain (wrong key, domain-restricted key, or the domain/account is disabled or unverified)",
  404: "the domain isn't in this Mailgun account (or is in the EU region)",
}

function describeError(res: Response, raw: string, domain: string) {
  let detail = raw.trim()
  try {
    const json = JSON.parse(raw)
    detail = json.message ?? json.error ?? detail
  } catch {}

  const hint = STATUS_HINTS[res.status]
  return [
    `Mailgun ${res.status} ${res.statusText}`.trim(),
    detail && `"${detail}"`,
    `domain ${domain}`,
    hint && `- ${hint}`,
  ]
    .filter(Boolean)
    .join(" ")
}

export async function sendMailgunEmail(input: SendInput): Promise<SendResult> {
  const { campaign, contact } = input
  const { mailgunAccount, template } = campaign

  const html = renderVars(template.html, contact)
  const subject = renderVars(template.subject, contact)

  const encoded = Buffer.from(`api:${mailgunAccount.apiKey}`).toString("base64")

  const params: Record<string, string> = {
    from: `${mailgunAccount.name} <${mailgunAccount.fromEmail || "noreply"}@${mailgunAccount.domain}>`,
    to: contact.email,
    subject,
    html,
    text: htmlToText(html),
    "h:Reply-To": `contact@${mailgunAccount.domain}`,
  }

  const body = new URLSearchParams(params)

  const res = await fetch(
    `https://api.mailgun.net/v3/${mailgunAccount.domain}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${encoded}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  )

  if (!res.ok) {
    const errBody = await res.text().catch(() => "")
    const retryAfter = res.headers.get("retry-after")
    return {
      sent: false,
      status: res.status,
      body: describeError(res, errBody, mailgunAccount.domain),
      retryAfter: retryAfter
        ? parseInt(retryAfter, 10) || undefined
        : undefined,
    }
  }

  // Mailgun answers {"id":"<...@domain>","message":"Queued. Thank you."}
  const json = (await res.json().catch(() => ({}))) as { id?: string }
  return { sent: true, messageId: json.id?.replace(/^<|>$/g, "") ?? null }
}
