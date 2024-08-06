// The .js extension is necessary for Chrome to pickup the import correctly
import { setCookies } from "../../shared/setCookies.js";

console.log("toddle extension loaded");

const RULE_ID = 18112022;

chrome.webNavigation.onBeforeNavigate.addListener(
  async (event) => {
    // remove existing rules. This is to prevents the rules from being applied to iframes outside toddle.dev
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [RULE_ID],
    });

    if (event.parentFrameId < 0) {
      return;
    }
    // check the parent frame so we only override cookies if we are on toddle.dev
    const parentFrame = await chrome.webNavigation.getFrame({
      documentId: event.parentDocumentId,
      frameId: event.parentFrameId,
    });

    if (!parentFrame) {
      return;
    }

    const parentUrl = new URL(parentFrame.url);
    if (parentUrl.host.endsWith("toddle.dev") === false) {
      return;
    }

    // Get the cookies for the .toddle.site domain
    const url = new URL(event.url);
    const domainCookies = await chrome.cookies.getAll({
      domain: url.host,
    });

    if (domainCookies.length > 0) {
      const cookieValue =
        domainCookies.map((c) => `${c.name}=${c.value}`).join("; ") + ";";

      await chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: [RULE_ID],
        addRules: [
          {
            id: RULE_ID,
            condition: {},
            action: {
              type: "modifyHeaders",
              requestHeaders: [
                {
                  header: "Cookie",
                  operation: "set",
                  value: cookieValue,
                },
              ],
            },
          },
        ],
      });
    }
  },
  {
    url: [{ hostContains: ".toddle.site" }],
  }
);

chrome.webRequest.onHeadersReceived.addListener(
  (info) => {
    if (info.responseHeaders) {
      setCookies({
        responseHeaders: info.responseHeaders,
        requestUrl: info.url,
        setCookie: (cookie) => chrome.cookies.set(cookie),
      });
    }
    return undefined;
  },
  {
    // In the manifest.json we have declared the host permissions to
    // *.toddle.site therefore, it's okay to use <all_urls> here
    urls: ["<all_urls>"],
    types: ["xmlhttprequest"],
  },
  // extraHeaders is necessary to read set-cookie headers
  ["responseHeaders", "extraHeaders"]
);
