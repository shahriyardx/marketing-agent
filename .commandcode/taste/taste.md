# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# Tools
- Use bun instead of npm for package management. Confidence: 0.65
- For shadcn/ui forms with react-hook-form, use Controller directly with Field/FieldLabel/FieldError/FieldGroup components (not FormProvider/FormField wrapping). Confidence: 0.80

# Code-Style
- Avoid "Built with X" or marketing-style footer text in UI components. Keep copy professional and product-focused. Confidence: 0.75
- Extract forms into individual separate component files (e.g., login-form.tsx, register-form.tsx) — do not combine multiple form components in a single file, and do not inline forms into page components. Confidence: 0.75
- Always use the shadcn Button component instead of raw HTML <button> elements. Confidence: 0.70

# Env
- For Next.js env management, use @t3-oss/env-nextjs instead of dotenv. Confidence: 0.65

# API
- Use tRPC for API routes instead of plain Next.js route handlers. Confidence: 0.65

# Architecture
- Components should fetch their own data via authClient/client hooks instead of receiving data through props. Confidence: 0.70
- Navigation/menu components should have items hardcoded inline as direct JSX rather than using data arrays with .map() looping. Confidence: 0.70

# Security
- Mask sensitive API keys in the UI by showing only the first 6 and last 4 characters with a separator (e.g., "key-12…abcd"), never display full keys in plain text. Confidence: 0.65

# UX
- Use shadcn Dialog for delete/destructive action confirmations instead of performing the action immediately on click. Confidence: 0.70

# Data
- Store boolean app settings as actual boolean values in the database, not as strings like "true"/"false". Confidence: 0.75

