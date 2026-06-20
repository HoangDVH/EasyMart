export function buildLoginPath(returnTo: string) {
  return `/auth/login?next=${encodeURIComponent(returnTo)}`
}

export function resolvePostLoginPath(search: string, stateFromPathname?: string) {
  const nextParam = new URLSearchParams(search).get('next')
  if (nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')) {
    return nextParam
  }
  if (stateFromPathname?.startsWith('/')) {
    return stateFromPathname
  }
  return '/'
}
