/** Avatar Google thường đến từ googleusercontent / ggusercontent. */
export function isGoogleAvatarUrl(url: string | null | undefined): boolean {
  if (!url) return false
  try {
    const host = new URL(url).hostname.toLowerCase()
    return (
      host.includes('googleusercontent.com') ||
      host.includes('ggpht.com') ||
      host.endsWith('google.com')
    )
  } catch {
    return /googleusercontent|ggpht\.com/i.test(url)
  }
}

export function getUserInitials(fullName: string | null | undefined, email: string | null | undefined) {
  const name = fullName?.trim()
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }
  const mail = email?.trim() ?? ''
  return mail.slice(0, 2).toUpperCase() || '?'
}
