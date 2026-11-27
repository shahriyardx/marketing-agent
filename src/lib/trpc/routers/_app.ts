import { router } from "../init"
import { apiKeysRouter } from "./api-keys"
import { campaignsRouter } from "./campaigns"
import { contactsRouter } from "./contacts"
import { importsRouter } from "./imports"
import { listsRouter } from "./lists"
import { mailgunRouter } from "./mailgun"
import { sendsRouter } from "./sends"
import { settingsRouter } from "./settings"
import { templatesRouter } from "./templates"

export const appRouter = router({
  apiKeys: apiKeysRouter,
  campaigns: campaignsRouter,
  contacts: contactsRouter,
  imports: importsRouter,
  lists: listsRouter,
  mailgun: mailgunRouter,
  sends: sendsRouter,
  settings: settingsRouter,
  templates: templatesRouter,
})

export type AppRouter = typeof appRouter
