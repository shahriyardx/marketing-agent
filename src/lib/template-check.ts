import Handlebars from "handlebars"

/**
 * Checks a template's {{ }} syntax. Returns a short error message, or null
 * when it compiles. Used by the editor preview and before saving, so a broken
 * template never reaches a send.
 */
export function templateError(text: string): string | null {
  try {
    Handlebars.precompile(text)
    return null
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    // Handlebars: "Parse error on line 3:\n<snippet>\n---^\nExpecting ..."
    const line = msg.match(/on line (\d+)/)?.[1]
    const expecting = msg.match(/Expecting ([^\n]+)/)?.[1]
    if (line)
      return `Unfinished or broken {{ }} on line ${line}${expecting ? ` (expecting ${expecting.split(",")[0]})` : ""}`
    return msg.split("\n")[0]
  }
}
