import { z } from "zod"
import { protectedProcedure, publicProcedure, router } from "../init"

export const settingsRouter = router({
  getRegistrationEnabled: publicProcedure.query(async ({ ctx }) => {
    const setting = await ctx.prisma.appSetting.findUnique({
      where: { key: "registration_enabled" },
    })

    return setting ? setting.value === "true" : true
  }),

  setRegistrationEnabled: protectedProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.appSetting.upsert({
        where: { key: "registration_enabled" },
        create: {
          key: "registration_enabled",
          value: String(input.enabled),
        },
        update: {
          value: String(input.enabled),
        },
      })

      return input.enabled
    }),
})
