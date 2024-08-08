let firefoxVersion = browser.runtime.getManifest().version

window.postMessage(
  {
    sender: 'toddle-extension',
    message_name: 'info',
    message: {
      installed: true,
      version: firefoxVersion,
    },
  },
  '*',
)

browser.runtime.onMessage.addListener((message) => {
  window.postMessage(
    {
      sender: 'toddle-extension',
      message_name: 'cookie',
      message,
    },
    '*',
  )
})
