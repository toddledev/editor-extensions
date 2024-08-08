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

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  window.postMessage(
    {
      sender: 'toddle-extension',
      message_name: 'cookie',
      message,
    },
    '*',
  )
  sendResponse();
  return true;
})
