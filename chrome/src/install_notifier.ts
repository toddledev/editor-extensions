let installedChromeVersion = chrome.runtime.getManifest().version

window.postMessage(
  {
    sender: 'toddle-extension',
    message_name: 'info',
    message: {
      installed: true,
      version: installedChromeVersion,
    },
  },
  '*',
)

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  window.postMessage(
    {
      sender: 'toddle-extension',
      message_name: 'cookies',
      message,
    },
    '*',
  )
  sendResponse()
  return true
})
