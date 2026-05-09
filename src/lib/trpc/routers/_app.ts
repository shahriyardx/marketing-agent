import { router } from "../init"
import { mailgunRouter } from "./mailgun"

export const appRouter = router({
  mailgun: mailgunRouter,
})

export type AppRouter = typeof appRouter
