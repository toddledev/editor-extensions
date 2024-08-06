let firefoxVersion = browser.runtime.getManifest().version

var root = document.documentElement
root.classList.add('toddleExtension')
root.setAttribute('version', firefoxVersion)
