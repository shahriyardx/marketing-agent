import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../generated/prisma/client"
import { faker } from "@faker-js/faker"
import { env } from "../src/lib/env"

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

function randomDate(daysAgo: number) {
  return faker.date.between({
    from: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
    to: new Date(),
  })
}

async function main() {
  console.log("Seeding fake data...")

  // Clean existing data
  await prisma.campaign.deleteMany()
  await prisma.emailTemplate.deleteMany()
  await prisma.mailgunAccount.deleteMany()

  // Create 10 mailgun accounts
  const mailgunAccounts = []
  for (let i = 0; i < 10; i++) {
    mailgunAccounts.push(
      await prisma.mailgunAccount.create({
        data: {
          name: `Mailgun ${["Prod", "Staging", "Dev", "US West", "US East", "EU", "Asia", "Backup", "Test", "Legacy"][i]}`,
          apiKey: `key-${crypto.randomUUID().replace(/-/g, "")}`,
          domain: `mg.${["primary", "secondary", "backup", "marketing", "transactional", "newsletter", "notifications", "updates", "promotions", "alerts"][i]}.com`,
          enabled: i < 7,
          createdAt: randomDate(30),
        },
      }),
    )
  }
  console.log(`Created ${mailgunAccounts.length} mailgun accounts`)

  // Create 10 templates
  const templates = []
  for (let i = 0; i < 10; i++) {
    templates.push(
      await prisma.emailTemplate.create({
        data: {
          name: [
            "Welcome Email",
            "Password Reset",
            "Weekly Newsletter",
            "Order Confirmation",
            "Abandoned Cart",
            "Product Launch",
            "Holiday Sale",
            "Customer Survey",
            "Re-engagement",
            "Thank You",
          ][i],
          subject: [
            "Welcome to {{name}}!",
            "Reset your password",
            "Your weekly update from {{company}}",
            "Order #{{order_id}} confirmed",
            "You left something in your cart",
            "Introducing {{product_name}}",
            "🎉 Holiday sale is live!",
            "We'd love your feedback",
            "We miss you, {{name}}",
            "Thanks for being a customer",
          ][i],
          html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f4f4f4;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="margin: 0 auto; background: #ffffff; border-radius: 8px;">
          <tr>
            <td style="padding: 40px; text-align: center; background: #1a1a2e; border-radius: 8px 8px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">{{company}}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="color: #333; font-size: 16px; line-height: 1.5;">Hi {{name}},</p>
              <p style="color: #666; font-size: 14px; line-height: 1.6;">This is a sample email template number ${i + 1}. Each template has unique styling to test our campaign system.</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="{{dashboard_url}}" style="display: inline-block; padding: 12px 32px; background: #1a1a2e; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 14px;">Get Started</a>
                  </td>
                </tr>
              </table>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
              <p style="color: #999; font-size: 12px;">If you no longer wish to receive these emails, <a href="{{unsubscribe_url}}" style="color: #666;">unsubscribe here</a>.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim(),
          createdAt: randomDate(20),
        },
      }),
    )
  }
  console.log(`Created ${templates.length} templates`)

  // Create 10 campaigns
  for (let i = 0; i < 10; i++) {
    await prisma.campaign.create({
      data: {
        name: [
          "Summer Sale 2026",
          "New User Onboarding",
          "Weekly Digest",
          "Product Launch Q3",
          "Cart Recovery",
          "Holiday Campaign",
          "Customer Feedback",
          "Re-engagement Blast",
          "Beta Announcement",
          "Year-end Review",
        ][i],
        mailgunAccountId: mailgunAccounts[i % mailgunAccounts.length].id,
        templateId: templates[i].id,
        enabled: i < 8,
        createdAt: randomDate(10),
      },
    })
  }
  console.log(`Created 10 campaigns`)

  console.log("Seeding complete!")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
