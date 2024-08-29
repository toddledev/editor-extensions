export interface SetCookiesArguments {
  requestUrl: string
  responseHeaders:
    | Array<chrome.webRequest.HttpHeaders[0]> // type hack
    | browser.webRequest.HttpHeaders
  setCookie: (cookie: ParsedCookie & { url: string }) => void
  notifyUser: (requestedUrl: string) => void
}

export function setCookies({
  requestUrl,
  responseHeaders,
  setCookie,
  notifyUser,
}: SetCookiesArguments) {
  const cookies = responseHeaders
    // We only care about set-cookie headers
    .filter(
      (
        h,
      ): h is RequireFields<
        chrome.webRequest.HttpHeaders[0] | browser.webRequest.HttpHeaders[0],
        'value'
      > => typeof h.value === 'string' && h.name.toLowerCase() === 'set-cookie',
    )
    .map((c) => parseCookie(c.value))
    .filter((c): c is ParsedCookie => !!c)
  cookies.forEach(
    ({
      name,
      value,
      secure,
      httpOnly,
      path,
      sameSite,
      expirationDate,
      domain,
    }) => {
      const requestedUrl = new URL(requestUrl)
      let url = requestedUrl.origin

      try {
        if (typeof domain === 'string') {
          const domainUrl = domain.startsWith('https://')
            ? domain
            : 'https://' + domain
          const parsedUrl = new URL(domainUrl)
          url = parsedUrl.origin
        }
        // eslint-disable-next-line no-empty
      } catch {}
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      setCookie({
        name,
        value,
        url,
        secure,
        httpOnly,
        path,
        sameSite,
        expirationDate,
        domain,
      })
      try {
        notifyUser(url)
      } catch {}
    },
  )
}

/**
 * Parses a set-cookie header string into a ParsedCookie object
 * if possible
 * Example input:
 * access_token=xyz; Expires=Mon, 06 Nov 2023 15:53:30 GMT; Secure; HttpOnly; SameSite=Lax; Domain=my-page.toddle.site; Path=/;
 */
const parseCookie = (cookie: string): ParsedCookie | undefined => {
  const validString = (s: any): s is string =>
    typeof s === 'string' && s.trim().length > 0

  const [identifier, ...rest] = cookie.split(`;`)
  if (!validString(identifier)) {
    return
  }
  const [name, value] = identifier.split(`=`)
  if (!validString(name) || !validString(value)) {
    return
  }
  const parsedCookie: ParsedCookie = { name, value }
  rest.forEach((c) => {
    const [name, ...rest] = c.split(`=`)
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!validString(name)) {
      return
    }
    const value = rest.join(`=`).trim()
    const property = name.toLowerCase().trim()
    switch (property) {
      case 'expires':
        try {
          const date = new Date(value)
          if (date.toString() !== 'Invalid Date') {
            parsedCookie.expirationDate = date.getTime() / 1000
          }
          // eslint-disable-next-line no-empty
        } catch {}
        break
      case 'max-age': {
        // Max-Age takes presedence over Expires
        // see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#max-agenumber
        const maxAge = Number(value)
        if (!isNaN(maxAge)) {
          parsedCookie.expirationDate = Date.now() / 1000 + maxAge
        }
        break
      }
      case 'domain':
        if (validString(value)) {
          parsedCookie.domain = value
        }
        break
      case 'path':
        if (validString(value)) {
          parsedCookie.path = value
        }
        break
      case 'samesite':
        switch (value.toLowerCase()) {
          case 'strict':
            parsedCookie.sameSite = 'strict'
            break
          case 'lax':
            parsedCookie.sameSite = 'lax'
            break
          case 'none':
            parsedCookie.sameSite = 'no_restriction'
            break
        }
        break
      case 'httponly':
        parsedCookie.httpOnly = true
        break
      case 'secure':
        parsedCookie.secure = true
        break
    }
  })
  return parsedCookie
}

interface ParsedCookie {
  name: string
  value: string
  expirationDate?: number
  secure?: boolean
  httpOnly?: boolean
  path?: string
  sameSite?: browser.cookies.SameSiteStatus
  domain?: string
}

export type RequireFields<T, K extends keyof T> = Omit<T, K> & {
  [P in K]-?: NonNullable<T[P]>
}
