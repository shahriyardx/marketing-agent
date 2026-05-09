# UX
- For contact management, the user-submitted message is read-only — edit dialogs should only allow editing of name, email, and phone fields. Confidence: 0.65
- For HTML editor with preview, use shadcn Tabs with \"HTML\" and \"Preview\" as the tab labels directly (no separate label element) — when preview tab is active, the HTML editor is hidden, and vice versa. Confidence: 0.70
- Use shadcn Dialog for delete/destructive action confirmations instead of performing the action immediately on click. Confidence: 0.75
- For data tables on mobile, show all columns and let the table auto-scroll horizontally — do not hide columns with hidden/responsive classes. Confidence: 0.70
- Dashboard admin pages (API Keys, Mailgun, Settings, etc.) should have visually distinct layouts rather than reusing the same card-grid pattern — each page should feel purpose-built. Confidence: 0.70
- Display API key usage instructions in "Authorization: Bearer <key>" format so users know how to use the key in requests. Confidence: 0.70
