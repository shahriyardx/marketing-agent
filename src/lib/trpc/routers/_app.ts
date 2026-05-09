import { router } from "../init"
import { apiKeysRouter } from "./api-keys"
import { campaignsRouter } from "./campaigns"
import { contactsRouter } from "./contacts"
import { mailgunRouter } from "./mailgun"
import { settingsRouter } from "./settings"
import { templatesRouter } from "./templates"

export const appRouter = router({
  apiKeys: apiKeysRouter,
  campaigns: campaignsRouter,
  contacts: contactsRouter,
  mailgun: mailgunRouter,
  settings: settingsRouter,
  templates: templatesRouter,
})

export type AppRouter = typeof appRouter
