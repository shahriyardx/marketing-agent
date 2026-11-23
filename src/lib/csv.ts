// Streaming CSV reader: handles quoted fields, escaped quotes, CRLF and a BOM
// without ever holding the whole file in memory. Yields rows in batches.
export async function* readCsvRows(
  stream: ReadableStream<Uint8Array>,
  batchSize = 2000,
): AsyncGenerator<string[][]> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()

  let batch: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false
  let pendingQuote = false // saw a quote inside a quoted field, may be an escape
  let first = true

  const endField = () => {
    row.push(field)
    field = ""
  }
  const endRow = () => {
    endField()
    if (!(row.length === 1 && row[0] === "")) batch.push(row)
    row = []
  }

  function* consume(text: string): Generator<string[][]> {
    for (let i = 0; i < text.length; i++) {
      const ch = text[i]

      if (pendingQuote) {
        pendingQuote = false
        if (ch === '"') {
          field += '"'
          continue
        }
        inQuotes = false
      }

      if (inQuotes) {
        if (ch === '"') pendingQuote = true
        else field += ch
      } else if (ch === '"' && field === "") {
        inQuotes = true
      } else if (ch === ",") {
        endField()
      } else if (ch === "\n") {
        endRow()
        if (batch.length >= batchSize) {
          yield batch
          batch = []
        }
      } else if (ch !== "\r") {
        field += ch
      }
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    let text = done ? decoder.decode() : decoder.decode(value, { stream: true })
    if (first && text) {
      if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
      first = false
    }
    for (const full of consume(text)) yield full
    if (done) break
  }

  if (field !== "" || row.length > 0) endRow()
  if (batch.length > 0) yield batch
}
