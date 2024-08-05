let chromeVersion = chrome.runtime.getManifest().version;

var root = document.documentElement;
root.classList.add("toddleExtension");
root.setAttribute("version", chromeVersion);
