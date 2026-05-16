import Handlebars from "handlebars"

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
  | { sent: true }
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
    const errBody = await res.text().catch(() => "Unknown error")
    const retryAfter = res.headers.get("retry-after")
    return {
      sent: false,
      status: res.status,
      body: errBody,
      retryAfter: retryAfter ? parseInt(retryAfter, 10) || undefined : undefined,
    }
  }

  return { sent: true }
}
