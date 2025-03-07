export interface updateSessionRulesArguments {
  domainCookies: chrome.cookies.Cookie[]
  RULE_ID: number
}

export async function updateSessionRules({
  domainCookies,
  RULE_ID,
}: updateSessionRulesArguments) {
  const cookieValue =
    domainCookies.map((c) => `${c.name}=${c.value}`).join('; ') + ';'

  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [RULE_ID],
    addRules: [
      {
        id: RULE_ID,
        condition: {},
        action: {
          type: 'modifyHeaders',
          requestHeaders: [
            {
              header: 'Cookie',
              operation: 'set',
              value: cookieValue,
            },
          ],
        },
      },
    ],
  })
}
