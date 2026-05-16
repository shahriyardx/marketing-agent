import Handlebars from "handlebars"
import { faker } from "@faker-js/faker"

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

export function fillTemplateVars(html: string): string {
  const ctx: Record<string, string> = {}
  for (const [key, fn] of Object.entries(fakeContext)) {
    ctx[key] = fn()
  }

  const template = Handlebars.compile(html)
  return template(ctx)
}
