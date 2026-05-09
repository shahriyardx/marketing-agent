# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# Tools
- Use bun instead of npm for package management. Confidence: 0.65
- For shadcn/ui forms with react-hook-form, use Controller directly with Field/FieldLabel/FieldError/FieldGroup components (not FormProvider/FormField wrapping). Confidence: 0.80

# Code-Style
- Avoid "Built with X" or marketing-style footer text in UI components. Keep copy professional and product-focused. Confidence: 0.75
- Extract forms into individual separate component files (e.g., login-form.tsx, register-form.tsx) — do not combine multiple form components in a single file, and do not inline forms into page components. Confidence: 0.75
- Always use the shadcn Button component instead of raw HTML <button> elements. Confidence: 0.70
- Use shadcn/ui components (Select, Table, etc.) instead of raw HTML elements — prioritize consistency with the design system across all pages. Confidence: 0.75

# Env
- For Next.js env management, use @t3-oss/env-nextjs instead of dotenv. Confidence: 0.65

# API
- Use tRPC for API routes instead of plain Next.js route handlers. Confidence: 0.65

# Architecture
- Components should fetch their own data via authClient/client hooks instead of receiving data through props. Confidence: 0.70
- Navigation/menu components should have items hardcoded inline as direct JSX rather than using data arrays with .map() looping. Confidence: 0.70
- Administrative configuration like API keys (e.g., Mailgun) should be stored at the system level, not scoped to individual users — any authenticated user should access the same shared settings. Confidence: 0.70

# Security
- Mask sensitive API keys at the tRPC router/API level before returning to the client — not in the frontend UI. The API response itself should contain masked keys ("*******asjk" format, only last 4 chars visible), so the raw key never reaches the browser. Confidence: 0.75

# Forms
- Share the same form component and validation schema between create and edit workflows — don't duplicate schemas/forms when the fields are nearly identical. Use conditional validation (e.g., required for create, optional for edit) within a single schema rather than maintaining separate schemas. Confidence: 0.80
- When a form field doesn't fit neatly into the zod schema (e.g., an API key with conditional validation), use react-hook-form's form.setError() instead of managing separate useState error variables. Confidence: 0.75

# Code-Editor
- Use Monaco Editor (@monaco-editor/react) for code editing — include line numbers, glyph margin, and folding enabled, no minimap, theme synced to the site's dark/light mode, and padding on all sides (not just top). Confidence: 0.80
- Enable autoClosingTags, autoClosingQuotes, and autoClosingBrackets in Monaco editor options (all set to "always"). Confidence: 0.65

# UX
See [ux/taste.md](ux/taste.md)
# Data
- Store boolean app settings as actual boolean values in the database, not as strings like "true"/"false". Confidence: 0.75
- For API keys, hard-delete the record rather than soft-delete (revokedAt). Confidence: 0.70
- When a related entity (mailgun account, template) is deleted or disabled, do not cascade-delete dependent campaigns — instead auto-disable the campaign (set enabled=false), prevent re-enabling via the switch, allow only editing to fix the missing reference, show a yellow border with precise messaging ("Template is missing", "Mailgun is missing", or "Mailgun is disabled"), and hide the template/mailgun names from the card when unavailable. Confidence: 0.85

# Templates
- Use Handlebars for email template variable replacement ({{variable}} syntax). Confidence: 0.70
- Use faker.js to populate template variables with realistic fake data in preview mode instead of showing raw {{variable}} placeholders. Confidence: 0.70
- Template edit should be a separate page from template create — do not share the same page component for both workflows. Confidence: 0.70

# Git
- Do not include Co-authored-by (or similar) trailers in commit messages — keep commit messages clean without bot attribution lines. Confidence: 0.85

# Data
- When seeding data for sorting-dependent features, use explicit distinct timestamps (e.g., random dates via faker or sequential dates) instead of Promise.all concurrent creation — identical createdAt values cause non-deterministic sort order in PostgreSQL. Confidence: 0.65

# Navigation
- When a page already has a visible action button (e.g., "New Template" on templates page), do not create a sidebar submenu for that action — keep the nav item as a single link to the main page. Confidence: 0.65

