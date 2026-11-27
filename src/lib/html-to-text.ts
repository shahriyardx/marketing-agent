// Plain-text copy of an HTML email, sent alongside the HTML. Spam filters
// score HTML-only mail worse, and some clients show only the text part.
// ponytail: regex converter, good for template-style email HTML; swap for a
// real parser if templates get exotic (nested tables of lists, etc).

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  copy: "©",
  reg: "®",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  pound: "£",
  euro: "€",
}

function decode(text: string) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n =
        code[1].toLowerCase() === "x"
          ? Number.parseInt(code.slice(2), 16)
          : Number.parseInt(code.slice(1), 10)
      return Number.isFinite(n) ? String.fromCodePoint(n) : m
    }
    return ENTITIES[code.toLowerCase()] ?? m
  })
}

export function htmlToText(html: string) {
  let s = html
    // things that are never visible text
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(head|style|script|title)\b[\s\S]*?<\/\1>/gi, "")
    // hidden preheaders and other display:none blocks (non-nested)
    .replace(
      /<(div|span|p|td)\b[^>]*display\s*:\s*none[^>]*>[\s\S]*?<\/\1>/gi,
      "",
    )
    // links: "label (url)", or just the url when the label is the url
    .replace(
      /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
      (_, href: string, label: string) => {
        const text = label.replace(/<[^>]+>/g, "").trim()
        if (!text || href.startsWith("#")) return text
        return text === href || href.startsWith("mailto:")
          ? text
          : `${text} (${href})`
      },
    )
    .replace(/<img\b[^>]*alt\s*=\s*["']([^"']*)["'][^>]*>/gi, "$1")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n- ")
    .replace(/<hr\b[^>]*>/gi, "\n----------\n")
    .replace(
      /<\/?(p|div|h[1-6]|tr|table|ul|ol|blockquote|section)\b[^>]*>/gi,
      "\n",
    )
    .replace(/<\/t[dh]>/gi, " ")
    .replace(/<[^>]+>/g, "")

  s = decode(s)
  return s
    .split("\n")
    .map((line) => line.replace(/[ \t ]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
