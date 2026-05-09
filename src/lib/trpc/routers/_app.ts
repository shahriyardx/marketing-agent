import { router } from "../init"
import { apiKeysRouter } from "./api-keys"
import { mailgunRouter } from "./mailgun"
import { settingsRouter } from "./settings"
import { templatesRouter } from "./templates"

export const appRouter = router({
  apiKeys: apiKeysRouter,
  mailgun: mailgunRouter,
  settings: settingsRouter,
  templates: templatesRouter,
})

export type AppRouter = typeof appRouter
