import { faker } from "@faker-js/faker"

const defaultMap: Record<string, () => string> = {
  name: () => faker.person.fullName(),
  first_name: () => faker.person.firstName(),
  last_name: () => faker.person.lastName(),
  email: () => faker.internet.email(),
  company: () => faker.company.name(),
  city: () => faker.location.city(),
  country: () => faker.location.country(),
  phone: () => faker.phone.number(),
  dashboard_url: () => faker.internet.url(),
  site_url: () => faker.internet.url(),
  unsubscribe_url: () => faker.internet.url(),
  preferences_url: () => faker.internet.url(),
  subject: () => faker.lorem.sentence(),
  message: () => faker.lorem.paragraph(),
  date: () => faker.date.recent().toLocaleDateString(),
}

export function fillTemplateVars(html: string): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    if (defaultMap[key]) {
      return defaultMap[key]()
    }

    return faker.lorem.word()
  })
}
