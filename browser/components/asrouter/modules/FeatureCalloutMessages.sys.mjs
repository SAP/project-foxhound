/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Eventually, make this a messaging system
// provider instead of adding these message
// into OnboardingMessageProvider.sys.mjs
const PDFJS_PREF = "browser.pdfjs.feature-tour";
// Empty screens are included as placeholders to ensure step
// indicator shows the correct number of total steps in the tour
const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

// Generate a JEXL targeting string based on the `complete` property being true
// in a given Feature Callout tour progress preference value (which is JSON).
const matchIncompleteTargeting = (prefName, defaultValue = false) => {
  // regExpMatch() is a JEXL filter expression. Here we check if 'complete'
  // exists in the pref's value, and returns true if the tour is incomplete.
  const prefVal = `'${prefName}' | preferenceValue`;
  // prefVal might be null if the preference doesn't exist. in this case, don't
  // try to pipe into regExpMatch.
  const completeMatch = `${prefVal} | regExpMatch('(?<=complete":)(.*)(?=})')`;
  return `((${prefVal}) ? ((${completeMatch}) ? (${completeMatch}[1] != "true") : ${String(
    defaultValue
  )}) : ${String(defaultValue)})`;
};

// Generate a JEXL targeting string based on the current screen id found in a
// given Feature Callout tour progress preference.
const matchCurrentScreenTargeting = (prefName, screenIdRegEx = ".*") => {
  // regExpMatch() is a JEXL filter expression. Here we check if 'screen' exists
  // in the pref's value, and if it matches the screenIdRegEx. Returns
  // null otherwise.
  const prefVal = `'${prefName}' | preferenceValue`;
  const screenMatch = `${prefVal} | regExpMatch('(?<=screen"\s*:)\s*"(${screenIdRegEx})(?="\s*,)')`;
  const screenValMatches = `(${screenMatch}) ? !!(${screenMatch}[1]) : false`;
  return `(${screenValMatches})`;
};

/**
 * add24HourImpressionJEXLTargeting -
 * Creates a "hasn't been viewed in > 24 hours"
 * JEXL string and adds it to each message specified
 *
 * @param {Array} messageIds - IDs of messages that the targeting string will be added to
 * @param {string} prefix - The prefix of messageIDs that will used to create the JEXL string
 * @param {Array} messages - The array of messages that will be edited
 * @returns {Array} - The array of messages with the appropriate targeting strings edited
 */
function add24HourImpressionJEXLTargeting(
  messageIds,
  prefix,
  uneditedMessages
) {
  let noImpressionsIn24HoursString = uneditedMessages
    .filter(message => message.id.startsWith(prefix))
    .map(
      message =>
        // If the last impression is null or if epoch time
        // of the impression is < current time - 24hours worth of MS
        `(messageImpressions.${message.id}[messageImpressions.${
          message.id
        } | length - 1] == null || messageImpressions.${
          message.id
        }[messageImpressions.${message.id} | length - 1] < ${
          Date.now() - ONE_DAY_IN_MS
        })`
    )
    .join(" && ");

  // We're appending the string here instead of using
  // template strings to avoid a recursion error from
  // using the 'messages' variable within itself
  return uneditedMessages.map(message => {
    if (messageIds.includes(message.id)) {
      message.targeting += `&& ${noImpressionsIn24HoursString}`;
    }

    return message;
  });
}

// Exporting the about:firefoxview messages as a method here
// acts as a safety guard against mutations of the original objects
const MESSAGES = () => {
  let messages = [
    {
      weight: 100,
      id: "IP_PROTECTION_CALLOUT_MOZILLA_VPN_UPGRADE",
      template: "feature_callout",
      groups: ["cfr"],
      content: {
        id: "IP_PROTECTION_CALLOUT_MOZILLA_VPN_UPGRADE",
        template: "multistage",
        backdrop: "transparent",
        transitions: false,
        disableHistoryUpdates: true,
        screens: [
          {
            id: "IP_PROTECTION_CALLOUT_MOZILLA_VPN_UPGRADE",
            anchors: [
              {
                selector: "#ipprotection-button",
                panel_position: {
                  anchor_attachment: "bottomcenter",
                  callout_attachment: "topright",
                },
                no_open_on_anchor: true,
              },
            ],
            content: {
              position: "callout",
              width: "352px",
              padding: 16,
              logo: {
                imageURL:
                  "chrome://browser/content/ipprotection/assets/cfr-mozilla-vpn-light.svg",
                darkModeImageURL:
                  "chrome://browser/content/ipprotection/assets/cfr-mozilla-vpn-dark.svg",
                height: "175px",
                width: "320px",
              },
              title: {
                string_id: "ipprotection-bandwidth-upgrade-title",
                fontSize: "0.8125em",
                marginInline: "0 25px",
              },
              above_button_content: [
                {
                  type: "text",
                  text: {
                    string_id: "ipprotection-bandwidth-upgrade-text",
                    textAlign: "start",
                    fontSize: "0.8125em",
                    marginBlock: "-4px 0",
                  },
                },
              ],
              primary_button: {
                label: {
                  string_id: "upgrade-vpn-button",
                  fontSize: "0.8125em",
                  paddingBlock: "3px",
                  paddingInline: "14px",
                  lineHeight: "24px",
                },
                action: {
                  type: "OPEN_URL",
                  data: {
                    args: "https://www.mozilla.org/products/vpn/?utm_medium=firefox-desktop&utm_source=vpn-panel&utm_campaign=fx-vpn&utm_content=upgrade-button#pricing",
                    where: "tabshifted",
                  },
                  dismiss: true,
                },
              },
              secondary_button: {
                label: {
                  string_id:
                    "ipprotection-feature-introduction-button-secondary-not-now",
                  fontSize: "0.8125em",
                  paddingBlock: "3px",
                  paddingInline: "14px",
                  lineHeight: "24px",
                },
                action: {
                  dismiss: true,
                },
              },
            },
          },
        ],
      },
      targeting:
        "'browser.ipProtection.hasUpgraded' | preferenceValue == false && 'browser.ipProtection.bandwidthThreshold' | preferenceValue == 50 && !hasActiveEnterprisePolicies && !activeNotifications && previousSessionEnd && (messageImpressions.IP_PROTECTION_CALLOUT_MOZILLA_VPN_UPGRADE_SECONDARY || []) | length == 0",
      trigger: {
        id: "preferenceObserver",
        params: ["browser.ipProtection.bandwidthThreshold"],
      },
      frequency: {
        lifetime: 1,
      },
      skip_in_tests: "it's not tested in automation",
    },
    {
      weight: 100,
      id: "IP_PROTECTION_CALLOUT_MOZILLA_VPN_UPGRADE_SECONDARY",
      template: "feature_callout",
      groups: ["cfr"],
      content: {
        id: "IP_PROTECTION_CALLOUT_MOZILLA_VPN_UPGRADE_SECONDARY",
        template: "multistage",
        backdrop: "transparent",
        transitions: false,
        disableHistoryUpdates: true,
        screens: [
          {
            id: "IP_PROTECTION_CALLOUT_MOZILLA_VPN_UPGRADE_SECONDARY",
            anchors: [
              {
                selector: "#ipprotection-button",
                panel_position: {
                  anchor_attachment: "bottomcenter",
                  callout_attachment: "topright",
                },
                no_open_on_anchor: true,
              },
            ],
            content: {
              position: "callout",
              width: "352px",
              padding: 16,
              logo: {
                imageURL:
                  "chrome://browser/content/ipprotection/assets/cfr-mozilla-vpn-light.svg",
                darkModeImageURL:
                  "chrome://browser/content/ipprotection/assets/cfr-mozilla-vpn-dark.svg",
                height: "175px",
                width: "320px",
              },
              title: {
                string_id: "ipprotection-bandwidth-upgrade-title",
                fontSize: "0.8125em",
                marginInline: "0 25px",
              },
              above_button_content: [
                {
                  type: "text",
                  text: {
                    string_id: "ipprotection-bandwidth-upgrade-text",
                    textAlign: "start",
                    fontSize: "0.8125em",
                    marginBlock: "-4px 0",
                  },
                },
              ],
              primary_button: {
                label: {
                  string_id: "upgrade-vpn-button",
                  fontSize: "0.8125em",
                  paddingBlock: "3px",
                  paddingInline: "14px",
                  lineHeight: "24px",
                },
                action: {
                  type: "OPEN_URL",
                  data: {
                    args: "https://www.mozilla.org/products/vpn/?utm_medium=firefox-desktop&utm_source=vpn-panel&utm_campaign=fx-vpn&utm_content=upgrade-button#pricing",
                    where: "tabshifted",
                  },
                  dismiss: true,
                },
              },
              secondary_button: {
                label: {
                  string_id:
                    "ipprotection-feature-introduction-button-secondary-not-now",
                  fontSize: "0.8125em",
                  paddingBlock: "3px",
                  paddingInline: "14px",
                  lineHeight: "24px",
                },
                action: {
                  dismiss: true,
                },
              },
            },
          },
        ],
      },
      targeting:
        "'browser.ipProtection.hasUpgraded' | preferenceValue == false && 'browser.ipProtection.bandwidthThreshold' | preferenceValue == 50 && !hasActiveEnterprisePolicies && !activeNotifications && previousSessionEnd && (messageImpressions.IP_PROTECTION_CALLOUT_MOZILLA_VPN_UPGRADE || []) | length == 0",
      trigger: {
        id: "ipProtectionReady",
      },
      frequency: {
        lifetime: 1,
      },
      skip_in_tests: "it's not tested in automation",
    },
    {
      id: "IP_PROTECTION_BANDWIDTH_RESET_CALLOUT",
      template: "feature_callout",
      groups: [],
      content: {
        id: "IP_PROTECTION_BANDWIDTH_RESET_CALLOUT",
        template: "multistage",
        backdrop: "transparent",
        transitions: false,
        disableHistoryUpdates: true,
        screens: [
          {
            id: "IP_PROTECTION_BANDWIDTH_RESET_CALLOUT",
            anchors: [
              {
                selector: "#ipprotection-button",
                panel_position: {
                  anchor_attachment: "bottomcenter",
                  callout_attachment: "topright",
                },
                no_open_on_anchor: true,
              },
            ],
            content: {
              position: "callout",
              autohide: true,
              width: "352px",
              padding: 16,
              logo: {
                imageURL:
                  "chrome://browser/content/ipprotection/assets/cfr-vpn-bandwith-reset-light.svg",
                darkModeImageURL:
                  "chrome://browser/content/ipprotection/assets/cfr-vpn-bandwith-reset-dark.svg",
                height: "175px",
                width: "320px",
              },
              title: {
                string_id: "ipprotection-bandwidth-reset-title",
                args: {
                  maxUsage: "50",
                },
                fontSize: "0.8125em",
                marginInline: "0 25px",
              },
              above_button_content: [
                {
                  type: "text",
                  text: {
                    string_id: "ipprotection-bandwidth-reset-text",
                    textAlign: "start",
                    fontSize: "0.8125em",
                    marginBlock: "-4px 0",
                  },
                },
              ],
              primary_button: {
                label: {
                  string_id: "ipprotection-bandwidth-reset-button",
                  fontSize: "0.8125em",
                  paddingBlock: "3px",
                  paddingInline: "14px",
                  lineHeight: "24px",
                },
                action: {
                  dismiss: true,
                },
              },
            },
          },
        ],
      },
      targeting:
        "'browser.ipProtection.bandwidthThreshold' | preferenceValue == 0 && 'browser.ipProtection.userEnableCount' | preferenceValue > 0 && !hasActiveEnterprisePolicies && !activeNotifications && previousSessionEnd",
      trigger: {
        id: "preferenceObserver",
        params: ["browser.ipProtection.bandwidthThreshold"],
      },
      frequency: {
        lifetime: 2,
      },
      skip_in_tests: "it's not tested in automation",
    },
    {
      id: "TAB_GROUP_ONBOARDING_CALLOUT",
      template: "feature_callout",
      groups: ["cfr"],
      content: {
        id: "TAB_GROUP_ONBOARDING_CALLOUT",
        template: "multistage",
        backdrop: "transparent",
        transitions: false,
        screens: [
          {
            id: "TAB_GROUP_ONBOARDING_CALLOUT_HORIZONTAL",
            anchors: [
              {
                selector:
                  "#tabbrowser-tabs:not([overflow]) .tab-content[selected]:not([pinned])",
                panel_position: {
                  anchor_attachment: "bottomcenter",
                  callout_attachment: "topright",
                },
              },
              {
                selector:
                  "#tabbrowser-tabs:not([overflow]) tab:not([pinned]):last-of-type",
                panel_position: {
                  anchor_attachment: "bottomcenter",
                  callout_attachment: "topright",
                },
              },
              {
                selector:
                  "#tabbrowser-tabs:not([overflow]) #tabs-newtab-button",
                panel_position: {
                  anchor_attachment: "bottomcenter",
                  callout_attachment: "topright",
                },
              },
              {
                selector: "#tabbrowser-tabs",
                panel_position: {
                  anchor_attachment: "bottomcenter",
                  callout_attachment: "topright",
                },
              },
            ],
            content: {
              position: "callout",
              width: "333px",
              padding: 16,
              logo: {
                imageURL:
                  "chrome://browser/content/asrouter/assets/tabgroups/hort-animated-light.svg",
                darkModeImageURL:
                  "chrome://browser/content/asrouter/assets/tabgroups/hort-animated-dark.svg",
                reducedMotionImageURL:
                  "chrome://browser/content/asrouter/assets/tabgroups/hort-static-light.svg",
                darkModeReducedMotionImageURL:
                  "chrome://browser/content/asrouter/assets/tabgroups/hort-static-dark.svg",
                height: "172px",
                width: "300px",
              },
              title: {
                string_id: "tab-groups-onboarding-feature-callout-title",
              },
              subtitle: {
                string_id: "tab-groups-onboarding-feature-callout-subtitle",
              },
              dismiss_button: {
                action: {
                  dismiss: true,
                },
                background: true,
                size: "small",
                marginInline: "0 20px",
                marginBlock: "20px 0",
              },
            },
          },
        ],
      },
      targeting:
        "tabsClosedCount >= 1 && currentTabsOpen >= 8 && ('browser.tabs.groups.enabled' | preferenceValue) && (!'sidebar.verticalTabs' | preferenceValue) && currentTabGroups == 0 && savedTabGroups == 0 && !activeNotifications",
      trigger: {
        id: "nthTabClosed",
      },
      frequency: {
        lifetime: 1,
      },
      skip_in_tests: "it's not tested in automation",
    },
    {
      id: "TAB_GROUP_ONBOARDING_CALLOUT",
      template: "feature_callout",
      groups: ["cfr"],
      content: {
        id: "TAB_GROUP_ONBOARDING_CALLOUT",
        template: "multistage",
        backdrop: "transparent",
        transitions: false,
        screens: [
          {
            id: "TAB_GROUP_ONBOARDING_CALLOUT_VERTICAL",
            anchors: [
              {
                selector:
                  "#tabbrowser-tabs:not([overflow]) .tab-content[selected]:not([pinned])",
                panel_position: {
                  anchor_attachment: "rightcenter",
                  callout_attachment: "topleft",
                },
              },
              {
                selector:
                  "#tabbrowser-tabs:not([overflow]) tab:not([pinned]):last-of-type",
                panel_position: {
                  anchor_attachment: "rightcenter",
                  callout_attachment: "topleft",
                },
              },
              {
                selector:
                  "#tabbrowser-tabs:not([overflow]) #tabs-newtab-button",
                panel_position: {
                  anchor_attachment: "rightcenter",
                  callout_attachment: "topleft",
                },
              },
              {
                selector: "#tabbrowser-tabs",
                panel_position: {
                  anchor_attachment: "rightcenter",
                  callout_attachment: "topleft",
                },
              },
            ],
            content: {
              position: "callout",
              width: "333px",
              padding: 16,
              logo: {
                imageURL:
                  "chrome://browser/content/asrouter/assets/tabgroups/vert-animated-light.svg",
                darkModeImageURL:
                  "chrome://browser/content/asrouter/assets/tabgroups/vert-animated-dark.svg",
                reducedMotionImageURL:
                  "chrome://browser/content/asrouter/assets/tabgroups/vert-static-light.svg",
                darkModeReducedMotionImageURL:
                  "chrome://browser/content/asrouter/assets/tabgroups/vert-static-dark.svg",
                height: "172px",
                width: "300px",
              },
              title: {
                string_id: "tab-groups-onboarding-feature-callout-title",
              },
              subtitle: {
                string_id: "tab-groups-onboarding-feature-callout-subtitle",
              },
              dismiss_button: {
                action: {
                  dismiss: true,
                },
                background: true,
                size: "small",
                marginInline: "0 20px",
                marginBlock: "20px 0",
              },
            },
          },
        ],
      },
      targeting:
        "tabsClosedCount >= 1 && currentTabsOpen >= 8 && ('browser.tabs.groups.enabled' | preferenceValue) && ('sidebar.revamp' | preferenceValue) && ('sidebar.verticalTabs' | preferenceValue) && currentTabGroups == 0 && savedTabGroups == 0 && !activeNotifications",
      trigger: {
        id: "nthTabClosed",
      },
      frequency: {
        lifetime: 1,
      },
      skip_in_tests: "it's not tested in automation",
    },
    // Appears the first time a user uses the "save and close" action on a tab group,
    // anchored to the alltabs-button. Will only show if at least an hour has passed
    // since the CREATE_TAB_GROUP callout showed.
    {
      id: "SAVE_TAB_GROUP_ONBOARDING_CALLOUT",
      template: "feature_callout",
      groups: [],
      content: {
        id: "SAVE_TAB_GROUP_ONBOARDING_CALLOUT",
        template: "multistage",
        backdrop: "transparent",
        transitions: false,
        screens: [
          {
            id: "SAVE_TAB_GROUP_ONBOARDING_CALLOUT_ALLTABS_BUTTON",
            anchors: [
              {
                selector: "#alltabs-button",
                panel_position: {
                  anchor_attachment: "bottomcenter",
                  callout_attachment: "topright",
                },
              },
            ],
            content: {
              position: "callout",
              padding: 16,
              width: "330px",
              title_logo: {
                imageURL:
                  "chrome://browser/content/asrouter/assets/smiling-fox-icon.svg",
                width: "24px",
                height: "24px",
                marginInline: "0 16px",
                alignment: "top",
              },
              title: {
                string_id: "tab-groups-onboarding-saved-groups-title-3",
              },
              primary_button: {
                label: {
                  string_id: "tab-groups-onboarding-dismiss",
                },
                action: {
                  dismiss: true,
                },
              },
            },
          },
        ],
      },
      targeting:
        "('browser.tabs.groups.enabled' | preferenceValue) && userPrefs.cfrFeatures && (!messageImpressions.CREATE_TAB_GROUP_ONBOARDING_CALLOUT[messageImpressions.CREATE_TAB_GROUP_ONBOARDING_CALLOUT | length - 1] || messageImpressions.CREATE_TAB_GROUP_ONBOARDING_CALLOUT[messageImpressions.CREATE_TAB_GROUP_ONBOARDING_CALLOUT | length - 1] < currentDate|date - 3600000) && alltabsButtonAreaType != null",
      trigger: {
        id: "tabGroupSaved",
      },
      frequency: {
        lifetime: 1,
      },
      skip_in_tests: "it's not tested in automation",
    },
    // Appears the first time a user uses the "save and close" action on a tab group,
    // if the alltabs-button has been removed. Anchored to the urlbar. Will only show
    // if CREATE_TAB_GROUP callout has not shown, or at least an hour has passed since
    // the CREATE_TAB_GROUP callout showed.
    {
      id: "SAVE_TAB_GROUP_ONBOARDING_CALLOUT",
      template: "feature_callout",
      groups: [],
      content: {
        id: "SAVE_TAB_GROUP_ONBOARDING_CALLOUT",
        template: "multistage",
        backdrop: "transparent",
        transitions: false,
        screens: [
          {
            id: "SAVE_TAB_GROUP_ONBOARDING_CALLOUT_URLBAR",
            anchors: [
              {
                selector: ".urlbar-input-box",
                panel_position: {
                  anchor_attachment: "bottomcenter",
                  callout_attachment: "topcenter",
                },
              },
            ],
            content: {
              position: "callout",
              padding: 16,
              width: "330px",
              title_logo: {
                imageURL:
                  "chrome://browser/content/asrouter/assets/smiling-fox-icon.svg",
                width: "24px",
                height: "24px",
                marginInline: "0 16px",
                alignment: "top",
              },
              title: {
                string_id:
                  "tab-groups-onboarding-saved-groups-no-alltabs-button-title-2",
              },
              primary_button: {
                label: {
                  string_id: "tab-groups-onboarding-dismiss",
                },
                action: {
                  dismiss: true,
                },
              },
            },
          },
        ],
      },
      targeting:
        "('browser.tabs.groups.enabled' | preferenceValue) && userPrefs.cfrFeatures && (!messageImpressions.CREATE_TAB_GROUP_ONBOARDING_CALLOUT[messageImpressions.CREATE_TAB_GROUP_ONBOARDING_CALLOUT | length - 1] || messageImpressions.CREATE_TAB_GROUP_ONBOARDING_CALLOUT[messageImpressions.CREATE_TAB_GROUP_ONBOARDING_CALLOUT | length - 1] < currentDate|date - 3600000) && alltabsButtonAreaType == null",
      trigger: {
        id: "tabGroupSaved",
      },
      frequency: {
        lifetime: 1,
      },
      skip_in_tests: "it's not tested in automation",
    },
    // Appears the first time a user creates a tab group, after clicking the "Done"
    // button. Anchored to the alltabs-button. Will only show if the SAVE_TAB_GROUP
    // callout has not shown, or if at least an hour has passed
    // since the SAVE_TAB_GROUP callout showed.
    {
      id: "CREATE_TAB_GROUP_ONBOARDING_CALLOUT",
      template: "feature_callout",
      groups: [],
      content: {
        id: "CREATE_TAB_GROUP_ONBOARDING_CALLOUT",
        template: "multistage",
        backdrop: "transparent",
        transitions: false,
        screens: [
          {
            id: "CREATE_TAB_GROUP_ONBOARDING_CALLOUT_ALLTABS_BUTTON",
            anchors: [
              {
                selector: "#alltabs-button",
                panel_position: {
                  anchor_attachment: "bottomcenter",
                  callout_attachment: "topright",
                },
              },
            ],
            content: {
              position: "callout",
              padding: 16,
              width: "330px",
              title_logo: {
                imageURL:
                  "chrome://browser/content/asrouter/assets/smiling-fox-icon.svg",
                width: "24px",
                height: "24px",
                marginInline: "0 16px",
                alignment: "top",
              },
              title: {
                string_id: "tab-groups-onboarding-create-group-title-3",
              },
              primary_button: {
                label: {
                  string_id: "tab-groups-onboarding-dismiss",
                },
                action: {
                  dismiss: true,
                },
              },
            },
          },
        ],
      },
      targeting:
        "('browser.tabs.groups.enabled' | preferenceValue) && userPrefs.cfrFeatures && (!messageImpressions.SAVE_TAB_GROUP_ONBOARDING_CALLOUT[messageImpressions.SAVE_TAB_GROUP_ONBOARDING_CALLOUT | length - 1] || messageImpressions.SAVE_TAB_GROUP_ONBOARDING_CALLOUT[messageImpressions.SAVE_TAB_GROUP_ONBOARDING_CALLOUT | length - 1] < currentDate|date - 3600000) && alltabsButtonAreaType != null",
      trigger: {
        id: "tabGroupCreated",
      },
      frequency: {
        lifetime: 1,
      },
      skip_in_tests: "it's not tested in automation",
    },
    // Appears the first time a user creates a tab group, after clicking the "Done"
    // button, if the alltabs-button has been removed. Anchored to the urlbar. Will
    // only show if the SAVE_TAB_GROUP callout has not shown, or if at least an hour
    // has passed since the SAVE_TAB_GROUP callout showed.
    {
      id: "CREATE_TAB_GROUP_ONBOARDING_CALLOUT",
      template: "feature_callout",
      groups: [],
      content: {
        id: "CREATE_TAB_GROUP_ONBOARDING_CALLOUT",
        template: "multistage",
        backdrop: "transparent",
        transitions: false,
        screens: [
          {
            id: "CREATE_TAB_GROUP_ONBOARDING_CALLOUT_URLBAR",
            anchors: [
              {
                selector: ".urlbar-input-box",
                panel_position: {
                  anchor_attachment: "bottomcenter",
                  callout_attachment: "topcenter",
                },
              },
            ],
            content: {
              position: "callout",
              padding: 16,
              width: "330px",
              title_logo: {
                imageURL:
                  "chrome://browser/content/asrouter/assets/smiling-fox-icon.svg",
                width: "24px",
                height: "24px",
                marginInline: "0 16px",
                alignment: "top",
              },
              title: {
                string_id:
                  "tab-groups-onboarding-create-group-no-alltabs-button-title",
              },
              primary_button: {
                label: {
                  string_id: "tab-groups-onboarding-dismiss",
                },
                action: {
                  dismiss: true,
                },
              },
            },
          },
        ],
      },
      targeting:
        "('browser.tabs.groups.enabled' | preferenceValue) && userPrefs.cfrFeatures && (!messageImpressions.SAVE_TAB_GROUP_ONBOARDING_CALLOUT[messageImpressions.SAVE_TAB_GROUP_ONBOARDING_CALLOUT | length - 1] || messageImpressions.SAVE_TAB_GROUP_ONBOARDING_CALLOUT[messageImpressions.SAVE_TAB_GROUP_ONBOARDING_CALLOUT | length - 1] < currentDate|date - 3600000) && alltabsButtonAreaType == null",
      trigger: {
        id: "tabGroupCreated",
      },
      frequency: {
        lifetime: 1,
      },
      skip_in_tests: "it's not tested in automation",
    },
    // Appears after a browser restart if Session Restore is disabled, to direct
    // users to tab groups that were saved automatically. Anchored to the alltabs-button.
    {
      id: "SESSION_RESTORE_TAB_GROUP_CALLOUT",
      template: "feature_callout",
      groups: [],
      content: {
        id: "SESSION_RESTORE_TAB_GROUP_CALLOUT",
        template: "multistage",
        backdrop: "transparent",
        transitions: false,
        screens: [
          {
            id: "SESSION_RESTORE_TAB_GROUP_CALLOUT_ALLTABS_BUTTON",
            anchors: [
              {
                selector: "#alltabs-button",
                panel_position: {
                  anchor_attachment: "bottomcenter",
                  callout_attachment: "topright",
                },
              },
            ],
            content: {
              position: "callout",
              padding: 16,
              width: "330px",
              title_logo: {
                imageURL:
                  "chrome://browser/content/asrouter/assets/smiling-fox-icon.svg",
                width: "24px",
                height: "24px",
                marginInline: "0 16px",
                alignment: "top",
              },
              title: {
                string_id: "tab-groups-onboarding-session-restore-title-2",
              },
              primary_button: {
                label: {
                  string_id: "tab-groups-onboarding-dismiss",
                },
                action: {
                  dismiss: true,
                },
              },
            },
          },
        ],
      },
      targeting:
        "('browser.tabs.groups.enabled' | preferenceValue) && userPrefs.cfrFeatures && previousSessionEnd && ('browser.startup.page' | preferenceValue != 3) && savedTabGroups >= 1 && alltabsButtonAreaType != null",
      trigger: {
        id: "defaultBrowserCheck",
      },
      priority: 2,
      frequency: {
        lifetime: 1,
      },
      skip_in_tests: "not tested in automation",
    },
    // Appears after a browser restart if Session Restore is disabled, to direct
    // users to tab groups that were saved automatically, for users who have
    // removed the alltabs button. Anchored to the urlbar.
    {
      id: "SESSION_RESTORE_TAB_GROUP_CALLOUT",
      template: "feature_callout",
      groups: [],
      content: {
        id: "SESSION_RESTORE_TAB_GROUP_CALLOUT",
        template: "multistage",
        backdrop: "transparent",
        transitions: false,
        screens: [
          {
            id: "SESSION_RESTORE_TAB_GROUP_CALLOUT_URLBAR",
            anchors: [
              {
                selector: ".urlbar-input-box",
                panel_position: {
                  anchor_attachment: "bottomcenter",
                  callout_attachment: "topcenter",
                },
              },
            ],
            content: {
              position: "callout",
              padding: 16,
              width: "330px",
              title_logo: {
                imageURL:
                  "chrome://browser/content/asrouter/assets/smiling-fox-icon.svg",
                width: "24px",
                height: "24px",
                marginInline: "0 16px",
                alignment: "top",
              },
              title: {
                string_id:
                  "tab-groups-onboarding-saved-groups-no-alltabs-button-title-2",
              },
              primary_button: {
                label: {
                  string_id: "tab-groups-onboarding-dismiss",
                },
                action: {
                  dismiss: true,
                },
              },
            },
          },
        ],
      },
      targeting:
        "('browser.tabs.groups.enabled' | preferenceValue) && userPrefs.cfrFeatures && previousSessionEnd && ('browser.startup.page' | preferenceValue != 3) && savedTabGroups >= 1 && alltabsButtonAreaType == null",
      trigger: {
        id: "defaultBrowserCheck",
      },
      priority: 2,
      frequency: {
        lifetime: 1,
      },
      skip_in_tests: "not tested in automation",
    },
    {
      id: "ADDONS_STAFF_PICK_PT_2",
      template: "feature_callout",
      groups: ["cfr"],
      content: {
        id: "ADDONS_STAFF_PICK_PT_2",
        template: "multistage",
        backdrop: "transparent",
        transitions: false,
        screens: [
          {
            id: "ADDONS_STAFF_PICK_PT_2_A",
            anchors: [
              {
                selector: "#unified-extensions-button",
                panel_position: {
                  anchor_attachment: "bottomcenter",
                  callout_attachment: "topright",
                },
                arrow_width: "26.9",
              },
            ],
            content: {
              position: "callout",
              width: "310px",
              padding: 16,
              title_logo: {
                imageURL:
                  "chrome://browser/content/asrouter/assets/smiling-fox-icon.svg",
                width: "24px",
                height: "24px",
                marginInline: "4px 14px",
              },
              title: {
                raw: "Give your browsing a boost",
                marginInline: "0 48px",
              },
              subtitle: {
                raw: "Make browsing faster, safer, or just plain fun with Firefox add-ons. See what our staff recommends!",
                paddingInline: "34px 0",
              },
              primary_button: {
                label: {
                  raw: "Explore add-ons",
                },
                action: {
                  dismiss: true,
                  type: "OPEN_URL",
                  data: {
                    args: "https://addons.mozilla.org/en-US/firefox/collections/4757633/36d285535db74c6986abbeeed3e214/?page=1&collection_sort=added",
                    where: "tabshifted",
                  },
                },
              },
              dismiss_button: {
                action: {
                  dismiss: true,
                },
                size: "small",
                marginInline: "0 14px",
                marginBlock: "14px 0",
              },
            },
          },
        ],
      },
      targeting:
        "userPrefs.cfrAddons && userPrefs.cfrFeatures && localeLanguageCode == 'en' && ((currentDate|date - profileAgeCreated|date) / 86400000 < 28) && !screenImpressions.AW_AMO_INTRODUCE && !willShowDefaultPrompt && !activeNotifications && source == 'newtab' && previousSessionEnd",
      trigger: {
        id: "defaultBrowserCheck",
      },
      frequency: {
        lifetime: 1,
      },
    },
    {
      id: "PDFJS_FEATURE_TOUR_A",
      template: "feature_callout",
      content: {
        id: "PDFJS_FEATURE_TOUR",
        template: "multistage",
        backdrop: "transparent",
        transitions: false,
        disableHistoryUpdates: true,
        tour_pref_name: PDFJS_PREF,
        screens: [
          {
            id: "FEATURE_CALLOUT_1_A",
            anchors: [
              {
                selector: "hbox#browser",
                arrow_position: "top-end",
                absolute_position: { top: "43px", right: "51px" },
              },
            ],
            content: {
              position: "callout",
              title: {
                string_id: "callout-pdfjs-edit-title",
              },
              subtitle: {
                string_id: "callout-pdfjs-edit-body-a",
              },
              primary_button: {
                label: {
                  string_id: "callout-pdfjs-edit-button",
                },
                style: "secondary",
                action: {
                  type: "SET_PREF",
                  data: {
                    pref: {
                      name: PDFJS_PREF,
                      value: JSON.stringify({
                        screen: "FEATURE_CALLOUT_2_A",
                        complete: false,
                      }),
                    },
                  },
                },
              },
              dismiss_button: {
                action: {
                  type: "SET_PREF",
                  data: {
                    pref: {
                      name: PDFJS_PREF,
                      value: JSON.stringify({
                        screen: "",
                        complete: true,
                      }),
                    },
                  },
                },
              },
            },
          },
          {
            id: "FEATURE_CALLOUT_2_A",
            anchors: [
              {
                selector: "hbox#browser",
                arrow_position: "top-end",
                absolute_position: { top: "43px", right: "23px" },
              },
            ],
            content: {
              position: "callout",
              title: {
                string_id: "callout-pdfjs-draw-title",
              },
              subtitle: {
                string_id: "callout-pdfjs-draw-body-a",
              },
              primary_button: {
                label: {
                  string_id: "callout-pdfjs-draw-button",
                },
                style: "secondary",
                action: {
                  type: "SET_PREF",
                  data: {
                    pref: {
                      name: PDFJS_PREF,
                      value: JSON.stringify({
                        screen: "",
                        complete: true,
                      }),
                    },
                  },
                },
              },
              dismiss_button: {
                action: {
                  type: "SET_PREF",
                  data: {
                    pref: {
                      name: PDFJS_PREF,
                      value: JSON.stringify({
                        screen: "",
                        complete: true,
                      }),
                    },
                  },
                },
              },
            },
          },
        ],
      },
      priority: 1,
      targeting: `source == "open" && ${matchCurrentScreenTargeting(
        PDFJS_PREF,
        "FEATURE_CALLOUT_[0-9]_A"
      )} && ${matchIncompleteTargeting(PDFJS_PREF)}`,
      trigger: { id: "pdfJsFeatureCalloutCheck" },
    },
    {
      id: "PDFJS_FEATURE_TOUR_B",
      template: "feature_callout",
      content: {
        id: "PDFJS_FEATURE_TOUR",
        template: "multistage",
        backdrop: "transparent",
        transitions: false,
        disableHistoryUpdates: true,
        tour_pref_name: PDFJS_PREF,
        screens: [
          {
            id: "FEATURE_CALLOUT_1_B",
            anchors: [
              {
                selector: "hbox#browser",
                arrow_position: "top-end",
                absolute_position: { top: "43px", right: "51px" },
              },
            ],
            content: {
              position: "callout",
              title: {
                string_id: "callout-pdfjs-edit-title",
              },
              subtitle: {
                string_id: "callout-pdfjs-edit-body-b",
              },
              primary_button: {
                label: {
                  string_id: "callout-pdfjs-edit-button",
                },
                style: "secondary",
                action: {
                  type: "SET_PREF",
                  data: {
                    pref: {
                      name: PDFJS_PREF,
                      value: JSON.stringify({
                        screen: "FEATURE_CALLOUT_2_B",
                        complete: false,
                      }),
                    },
                  },
                },
              },
              dismiss_button: {
                action: {
                  type: "SET_PREF",
                  data: {
                    pref: {
                      name: PDFJS_PREF,
                      value: JSON.stringify({
                        screen: "",
                        complete: true,
                      }),
                    },
                  },
                },
              },
            },
          },
          {
            id: "FEATURE_CALLOUT_2_B",
            anchors: [
              {
                selector: "hbox#browser",
                arrow_position: "top-end",
                absolute_position: { top: "43px", right: "23px" },
              },
            ],
            content: {
              position: "callout",
              title: {
                string_id: "callout-pdfjs-draw-title",
              },
              subtitle: {
                string_id: "callout-pdfjs-draw-body-b",
              },
              primary_button: {
                label: {
                  string_id: "callout-pdfjs-draw-button",
                },
                style: "secondary",
                action: {
                  type: "SET_PREF",
                  data: {
                    pref: {
                      name: PDFJS_PREF,
                      value: JSON.stringify({
                        screen: "",
                        complete: true,
                      }),
                    },
                  },
                },
              },
              dismiss_button: {
                action: {
                  type: "SET_PREF",
                  data: {
                    pref: {
                      name: PDFJS_PREF,
                      value: JSON.stringify({
                        screen: "",
                        complete: true,
                      }),
                    },
                  },
                },
              },
            },
          },
        ],
      },
      priority: 1,
      targeting: `source == "open" && ${matchCurrentScreenTargeting(
        PDFJS_PREF,
        "FEATURE_CALLOUT_[0-9]_B"
      )} && ${matchIncompleteTargeting(PDFJS_PREF)}`,
      trigger: { id: "pdfJsFeatureCalloutCheck" },
    },
    // cookie banner reduction onboarding
    {
      id: "CFR_COOKIEBANNER",
      groups: ["cfr"],
      template: "feature_callout",
      content: {
        id: "CFR_COOKIEBANNER",
        template: "multistage",
        backdrop: "transparent",
        transitions: false,
        disableHistoryUpdates: true,
        screens: [
          {
            id: "COOKIEBANNER_CALLOUT",
            anchors: [
              {
                selector: "#tracking-protection-icon-container",
                panel_position: {
                  callout_attachment: "topleft",
                  anchor_attachment: "bottomcenter",
                },
              },
            ],
            content: {
              position: "callout",
              autohide: true,
              title: {
                string_id: "cookie-banner-blocker-onboarding-header",
                paddingInline: "12px 0",
              },
              subtitle: {
                string_id: "cookie-banner-blocker-onboarding-body",
                paddingInline: "34px 0",
              },
              title_logo: {
                alignment: "top",
                height: "20px",
                width: "20px",
                imageURL:
                  "chrome://browser/skin/controlcenter/3rdpartycookies-blocked.svg",
              },
              dismiss_button: {
                size: "small",
                action: { dismiss: true },
              },
              additional_button: {
                label: {
                  string_id: "cookie-banner-blocker-onboarding-learn-more",
                  marginInline: "34px 0",
                },
                style: "link",
                alignment: "start",
                action: {
                  type: "OPEN_URL",
                  data: {
                    args: "https://support.mozilla.org/1/firefox/%VERSION%/%OS%/%LOCALE%/cookie-banner-reduction",
                    where: "tabshifted",
                  },
                },
              },
            },
          },
        ],
      },
      frequency: {
        lifetime: 1,
      },
      skip_in_tests: "it's not tested in automation",
      trigger: {
        id: "cookieBannerHandled",
      },
      targeting: `'cookiebanners.ui.desktop.enabled'|preferenceValue == true && 'cookiebanners.ui.desktop.showCallout'|preferenceValue == true && 'browser.newtabpage.activity-stream.asrouter.userprefs.cfr.features' | preferenceValue != false`,
    },
    {
      id: "NEW_PROFILE_APP_MENU_TOUR",
      groups: [],
      profileScope: "single",
      targeting:
        "'browser.profiles.profile-name.updated' | preferenceValue == true && userPrefs.cfrFeatures",
      trigger: {
        id: "preferenceObserver",
        params: ["browser.profiles.profile-name.updated"],
      },
      frequency: {
        lifetime: 1,
      },
      skip_in_tests: "it's not tested in automation",
      template: "feature_callout",
      content: {
        id: "NEW_PROFILE_APP_MENU_TOUR",
        template: "multistage",
        backdrop: "transparent",
        transitions: false,
        disableHistoryUpdates: true,
        screens: [
          {
            id: "NEW_PROFILE_APP_MENU_TOUR",
            anchors: [
              {
                selector: "#PanelUI-button",
                panel_position: {
                  anchor_attachment: "leftcenter",
                  callout_attachment: "topright",
                },
              },
            ],
            content: {
              position: "callout",
              logo: {
                imageURL:
                  "chrome://browser/content/asrouter/assets/fox-with-profiles.svg",
                height: "100%",
                width: "100%",
              },
              title: {
                string_id: "profiles-appmenu-callout-tour-title",
                paddingBlock: "8px",
              },
              subtitle: {
                string_id: "profiles-appmenu-callout-tour-subtitle",
              },
              dismiss_button: {
                size: "small",
                background: true,
                marginInline: "0 21px",
                marginBlock: "21px 0",
                action: {
                  dismiss: true,
                },
              },
              primary_button: {
                label: {
                  string_id: "profiles-appmenu-callout-tour-primary-button",
                },
                action: {
                  navigate: true,
                  type: "HIGHLIGHT_FEATURE",
                  data: { args: "profilesAppMenuButton" },
                },
              },
            },
          },
        ],
      },
    },
    {
      id: "SMARTWINDOW_NEWTAB_CALLOUT",
      template: "feature_callout",
      groups: ["cfr"],
      content: {
        id: "SMARTWINDOW_NEWTAB_CALLOUT",
        template: "multistage",
        backdrop: "transparent",
        transitions: false,
        screens: [
          {
            id: "SMARTWINDOW_SWITCHER_BUTTON_CALLOUT",
            anchors: [
              {
                selector: "#ai-window-toggle > .toolbarbutton-icon",
                panel_position: {
                  anchor_attachment: "bottomcenter",
                  callout_attachment: "topright",
                },
                arrow_width: 23,
                arrow_corner_distance: 4,
              },
            ],
            content: {
              padding: 12,
              position: "callout",
              width: "248px",
              title: {
                string_id: "smartwindow-switcher-callout",
                fontSize: "15px",
                fontWeight: "400",
                letterSpacing: "normal",
                lineHeight: "normal",
                marginInline: "0 18px",
              },
              dismiss_button: {
                size: "x-small",
                marginBlock: "8px 0",
                marginInline: "0 8px",
                action: {
                  dismiss: true,
                },
              },
            },
          },
        ],
      },
      targeting:
        "isAIWindow && 'browser.smartwindow.firstrun.hasCompleted' | preferenceValue",
      skip_in_tests: "it's not tested in automation",
      trigger: {
        id: "smartWindowNewTab",
      },
      frequency: {
        lifetime: 1,
      },
    },
  ];
  messages = add24HourImpressionJEXLTargeting(
    ["FIREFOX_VIEW_TAB_PICKUP_REMINDER"],
    "FIREFOX_VIEW",
    messages
  );
  return messages;
};

export const FeatureCalloutMessages = {
  getMessages() {
    return MESSAGES();
  },
};
