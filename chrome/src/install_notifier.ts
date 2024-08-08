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

chrome.runtime.onMessage.addListener((message) => {
  window.postMessage(
    {
      sender: 'toddle-extension',
      message_name: 'cookie',
      message,
    },
    '*',
  )
  return true
})
