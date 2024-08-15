type SetCookiesArguments =
  import('../../shared/setCookies.js').SetCookiesArguments
console.info('toddle extension loaded')

let setCookies: (args: SetCookiesArguments) => void | undefined
const setup = async () => {
  const { setCookies: _setCookies } = await import('../../shared/setCookies.js')
  setCookies = _setCookies
}
setup()

browser.webRequest.onBeforeSendHeaders.addListener(
  async (event) => {
    const domainCookies = await browser.cookies.getAll({
      url: event.url,
    })
    if (event.parentFrameId === -1) {
      // This means we're not in an iframe
      return {}
    }
    const tab = browser.tabs.query({
      active: true,
      lastFocusedWindow: true,
    })

    const url = new URL(event.url)
    const domain = url.host
    let requestedUrl = url.origin

    try {
      if (typeof domain === 'string') {
        const domainUrl = domain.startsWith('https://')
          ? domain
          : 'https://' + domain
        const parsedUrl = new URL(domainUrl)
        requestedUrl = parsedUrl.origin
      }
      // eslint-disable-next-line no-empty
    } catch {}

    // Don't return the value for the http cookies and include the requested url
    const cookies = domainCookies.map((c) =>
      c.httpOnly
        ? { ...c, url: requestedUrl, value: undefined }
        : { ...c, url: requestedUrl },
    )

    tab.then(([t]) => {
      if (t && t.id) {
        chrome.tabs.sendMessage(t.id, cookies)
      }
    })

    const requestHeaders = [
      ...(event.requestHeaders ?? []),
      {
        name: 'Cookie',
        value: domainCookies
          .map((cookie) => cookie.name + '=' + cookie.value)
          .join(' ;'),
      },
    ]
    return { requestHeaders }
  },
  { urls: ['https://*.toddle.site/*'], types: ['sub_frame'] },
  ['blocking', 'requestHeaders'],
)

browser.webRequest.onHeadersReceived.addListener(
  (info) => {
    if (info.responseHeaders) {
      setCookies({
        responseHeaders: info.responseHeaders,
        requestUrl: info.url,
        setCookie: (cookie) => browser.cookies.set(cookie),
        notifyUser: async (requestedUrl) => {
          const url = new URL(info.url)
          const domainCookies = await chrome.cookies.getAll({
            domain: url.host,
          })
          // Don't return the value for the http cookies and include the requested url
          const cookies = domainCookies.map((c) =>
            c.httpOnly
              ? { ...c, url: requestedUrl, value: undefined }
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
        },
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
