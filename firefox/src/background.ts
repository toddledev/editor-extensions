type SetCookiesArguments =
  import('../../shared/setCookies.js').SetCookiesArguments

console.info('toddle extension loaded')

let setCookies: (args: SetCookiesArguments) => void | undefined
const setup = async () => {
  const { setCookies: _setCookies } = await import('../../shared/setCookies.js')
  setCookies = _setCookies
}
// Workaround for Firefox to actually include the shared code
setup()

/**
 * Used to send notifications to the toddle editor about which cookies are set
 */
const notifyUser = async (requestedUrl: string) => {
  try {
    const url = new URL(requestedUrl)
    const domainCookies = await browser.cookies.getAll({
      domain: url.host,
    })
    const cookies = domainCookies.map((c) =>
      c.httpOnly
        ? // Don't return the value for http cookies, but include the requested url
          { ...c, url: requestedUrl, value: undefined }
        : { ...c, url: requestedUrl },
    )
    const tab = browser.tabs.query({
      active: true,
      lastFocusedWindow: true,
    })

    tab.then(([t]) => {
      if (t && t.id) {
        browser.tabs.sendMessage(t.id, cookies)
      }
    })
  } catch {}
}

/**
 * This listener is used to intercept all request headers from the iframe
 * and add all cookies for the iframe's domain
 */
browser.webRequest.onBeforeSendHeaders.addListener(
  async (event) => {
    if (event.parentFrameId === -1) {
      // This means we're not in an iframe
      return {}
    }
    const domainCookies = await browser.cookies.getAll({
      url: event.url,
    })
    if (domainCookies.length === 0) {
      return { requestHeaders: event.requestHeaders }
    }
    await notifyUser(event.url)
    const requestHeaders = [
      ...(event.requestHeaders ?? []),
      // Add all cookies for the iframe's domain
      {
        name: 'Cookie',
        value: domainCookies
          .map((cookie) => cookie.name + '=' + cookie.value)
          .join(' ;'),
      },
    ]
    return { requestHeaders }
  },
  {
    urls: ['https://*.toddle.site/*'],
    types: ['sub_frame', 'xmlhttprequest'],
  },
  // Necessary permissions to alter request headers
  ['blocking', 'requestHeaders'],
)

/**
 * Parse set-cookie headers on xmlhttprequest responses and set the cookies
 */
browser.webRequest.onHeadersReceived.addListener(
  (info) => {
    if (info.responseHeaders) {
      const setCookieHeader = info.responseHeaders.find(
        (h) => h.name.toLowerCase() === 'set-cookie',
      )
      const setCookieHeaders = setCookieHeader?.value
        // Firefox returns a string with all set-cookie cookies separated by newline \n
        ?.split('\n')
        .filter(Boolean)
      if (!setCookieHeaders || setCookieHeaders.length === 0) {
        return
      }
      setCookies({
        setCookieHeaders,
        requestUrl: info.url,
        setCookie: (cookie) => browser.cookies.set(cookie),
        removeCookie: (cookie) => browser.cookies.remove(cookie),
        notifyUser,
      })
    }
    return undefined
  },
  {
    // We need to specify the allowed url here because it looks like
    // it's not picking it up from the host permissions in manifest
    urls: ['https://*.toddle.site/*'],
    types: ['xmlhttprequest'],
  },
  ['responseHeaders'],
)
