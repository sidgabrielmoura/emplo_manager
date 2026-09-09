/**
 * Higieniza o nome de arquivo removendo acentos, caracteres perigosos (#, ?, &, etc.)
 * e truncando a base do nome para evitar estouro de URL ou nomes excessivamente longos.
 */
export function sanitizeFileName(name: string): string {
  if (!name) return `documento_${Date.now()}`

  // Normaliza caracteres Unicode removendo acentos (ex: 'ç' -> 'c', 'ã' -> 'a')
  const clean = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  const extMatch = clean.match(/\.([a-zA-Z0-9]+)$/)
  const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : ""
  const baseName = clean.replace(/\.[^.]+$/, "")

  // Mantém somente letras, números, hífen e underscore
  const safeBase = baseName
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 80)

  return `${safeBase || "documento"}${ext}`
}

/**
 * Infere o MIME Type adequado com base na extensão caso o navegador envie vazio ou octet-stream.
 */
export function inferContentType(fileName: string, providedType?: string): string {
  if (providedType && providedType !== "application/octet-stream" && providedType.trim() !== "") {
    return providedType
  }
  const ext = fileName.split(".").pop()?.toLowerCase()
  switch (ext) {
    case "pdf":
      return "application/pdf"
    case "png":
      return "image/png"
    case "jpg":
    case "jpeg":
      return "image/jpeg"
    case "webp":
      return "image/webp"
    case "svg":
      return "image/svg+xml"
    case "doc":
      return "application/msword"
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    case "xls":
      return "application/vnd.ms-excel"
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    case "csv":
      return "text/csv"
    case "txt":
      return "text/plain"
    default:
      return "application/octet-stream"
  }
}
