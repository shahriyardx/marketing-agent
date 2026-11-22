import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
  },
  // Docker build sets this; real values are checked at runtime.
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
})
