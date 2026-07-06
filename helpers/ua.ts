export interface UserAgentDetails {
  browser: string
  os: string
  device: string
}

export function parseUserAgent(uaString: string | null): UserAgentDetails {
  if (!uaString) {
    return { browser: "Desconhecido", os: "Desconhecido", device: "Desconhecido" }
  }

  let browser = "Desconhecido"
  let os = "Desconhecido"
  let device = "Desktop"

  const lower = uaString.toLowerCase()

  // Browser detection
  if (lower.includes("edg/")) {
    browser = "Edge"
  } else if (lower.includes("chrome") || lower.includes("crios")) {
    // Chrome UA also contains Safari, so check chrome first
    browser = "Chrome"
  } else if (lower.includes("firefox") || lower.includes("fxios")) {
    browser = "Firefox"
  } else if (lower.includes("safari") && !lower.includes("chrome")) {
    browser = "Safari"
  } else if (lower.includes("opera") || lower.includes("opr/")) {
    browser = "Opera"
  }

  // OS detection
  if (lower.includes("windows")) {
    os = "Windows"
  } else if (lower.includes("iphone") || lower.includes("ipad")) {
    os = "iOS"
  } else if (lower.includes("android")) {
    os = "Android"
  } else if (lower.includes("macintosh") || lower.includes("mac os")) {
    os = "macOS"
  } else if (lower.includes("linux")) {
    os = "Linux"
  }

  // Device detection
  if (lower.includes("iphone") || (lower.includes("mobile") && lower.includes("android"))) {
    device = "Mobile"
  } else if (lower.includes("ipad") || lower.includes("tablet") || (lower.includes("android") && !lower.includes("mobile"))) {
    device = "Tablet"
  }

  return { browser, os, device }
}
