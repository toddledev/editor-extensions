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
      setCookies({
        responseHeaders: info.responseHeaders,
        requestUrl: info.url,
        setCookie: (cookie) => browser.cookies.set(cookie),
        notifyUser,
      })
    }
    return undefined
  },
  {
    // In the manifest.json we have declared the host permissions to
    // *.toddle.site therefore, it's okay to use <all_urls> here
    urls: ['<all_urls>'],
    types: ['xmlhttprequest'],
  },
  ['responseHeaders'],
)
