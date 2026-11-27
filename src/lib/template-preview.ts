import Handlebars from "handlebars"
import { faker } from "@faker-js/faker"
import { templateError } from "@/lib/template-check"

const fakeContext: Record<string, () => string> = {
  name: () => faker.person.fullName(),
  first_name: () => faker.person.firstName(),
  last_name: () => faker.person.lastName(),
  email: () => faker.internet.email(),
  phone: () => faker.phone.number(),
  message: () => faker.lorem.paragraph(),
  company: () => faker.company.name(),
  city: () => faker.location.city(),
  country: () => faker.location.country(),
  dashboard_url: () => faker.internet.url(),
  site_url: () => faker.internet.url(),
  unsubscribe_url: () => faker.internet.url(),
  preferences_url: () => faker.internet.url(),
  subject: () => faker.lorem.sentence(),
  date: () => faker.date.recent().toLocaleDateString(),
}

/** HTML for the editor preview: sample data filled in, never throws. */
export function fillTemplateVars(html: string): string {
  const error = templateError(html)
  if (error)
    return `<div style="font-family:system-ui,sans-serif;padding:16px;color:#b42318;background:#fef3f2;border:1px solid #fecdca;border-radius:8px;margin:16px;font-size:13px"><b>Template error</b><br>${error.replace(/</g, "&lt;")}<br><span style="color:#667085">Finish the {{ }} tag and the preview comes back.</span></div>`

  const ctx: Record<string, string> = {}
  for (const [key, fn] of Object.entries(fakeContext)) {
    ctx[key] = fn()
  }
  try {
    // %unsubscribe_url% is filled by Mailgun at send time, not Handlebars.
    return Handlebars.compile(html)(ctx).replaceAll(
      "%unsubscribe_url%",
      "#unsubscribe",
    )
  } catch (e) {
    return `<p style="font-family:system-ui,sans-serif;padding:16px;color:#b42318">Template error: ${String(e instanceof Error ? e.message : e).replace(/</g, "&lt;")}</p>`
  }
}
