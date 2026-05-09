# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# Tools
- Use bun instead of npm for package management. Confidence: 0.65
- For shadcn/ui forms with react-hook-form, use Controller directly with Field/FieldLabel/FieldError/FieldGroup components (not FormProvider/FormField wrapping). Confidence: 0.80

# Code-Style
- Avoid "Built with X" or marketing-style footer text in UI components. Keep copy professional and product-focused. Confidence: 0.75
- Extract forms into individual separate component files (e.g., login-form.tsx, register-form.tsx) — do not combine multiple form components in a single file, and do not inline forms into page components. Confidence: 0.75

# Env
- For Next.js env management, use @t3-oss/env-nextjs instead of dotenv. Confidence: 0.65

