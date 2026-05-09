import { router } from "../init"
import { mailgunRouter } from "./mailgun"
import { settingsRouter } from "./settings"

export const appRouter = router({
  mailgun: mailgunRouter,
  settings: settingsRouter,
})

export type AppRouter = typeof appRouter
