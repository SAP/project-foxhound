/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { SelectableProfileService } from "resource:///modules/profiles/SelectableProfileService.sys.mjs";
import { ProfileAge } from "resource://gre/modules/ProfileAge.sys.mjs";
import { AppConstants } from "resource://gre/modules/AppConstants.sys.mjs";

const lazy = {};

// Bug 1922374: Move themes to remote settings
const PROFILE_THEMES_MAP = new Map([
  [
    "firefox-compact-light@mozilla.org",
    {
      dataL10nId: "profiles-gray-theme",
      dataL10nTitle: "profiles-gray-theme-title",
      colors: {
        light: {
          chromeColor: "rgb(234, 234, 237)", // frame
          toolbarColor: "rgb(255, 255, 255)", // sidebar?
          contentColor: "#F9F9FB", // ntp_background
        },
      },
      isDark: false,
      useInAutomation: true,
    },
  ],
  [
    "firefox-compact-dark@mozilla.org",
    {
      dataL10nId: "profiles-gray-theme",
      dataL10nTitle: "profiles-gray-theme-title",
      colors: {
        dark: {
          chromeColor: "rgb(28, 27, 34)",
          toolbarColor: "rgb(28, 27, 34)",
          contentColor: "rgb(43, 42, 51)",
        },
      },
      isDark: true,
      useInAutomation: true,
    },
  ],
  [
    "{cd6791f7-4b6d-47b4-8877-1d4c82c6699d}",
    {
      dataL10nId: "profiles-yellow-theme",
      dataL10nTitle: "profiles-yellow-theme-title",
      downloadURL:
        "https://addons.mozilla.org/firefox/downloads/file/4552782/profiles_yellow-1.0.xpi",
      colors: {
        light: {
          chromeColor: "rgb(255, 230, 153)",
          toolbarColor: "rgb(255, 255, 255)",
          contentColor: "rgb(255, 244, 208)",
        },
        dark: {
          chromeColor: "rgb(39, 16, 0)",
          toolbarColor: "rgb(22, 22, 22)",
          contentColor: "rgb(66, 27, 0)",
        },
      },
    },
  ],
  [
    "{7a301b7b-c3e2-40bf-a06b-6d517bbf138b}",
    {
      dataL10nId: "profiles-orange-theme",
      dataL10nTitle: "profiles-orange-theme-title",
      downloadURL:
        "https://addons.mozilla.org/firefox/downloads/file/4552788/profiles_orange-1.0.xpi",
      colors: {
        light: {
          chromeColor: "rgb(255, 205, 158)",
          toolbarColor: "rgb(255, 255, 255)",
          contentColor: "rgb(255, 237, 214)",
        },
        dark: {
          chromeColor: "rgb(39, 15, 0)",
          toolbarColor: "rgb(22, 22, 22)",
          contentColor: "rgb(72, 18, 0)",
        },
      },
    },
  ],
  [
    "{8de5f8c3-bfc2-443b-9913-7bbadbd1ba0d}",
    {
      dataL10nId: "profiles-red-theme",
      dataL10nTitle: "profiles-red-theme-title",
      downloadURL:
        "https://addons.mozilla.org/firefox/downloads/file/4552785/profiles_red-1.0.xpi",
      colors: {
        light: {
          chromeColor: "rgb(255, 195, 201)",
          toolbarColor: "rgb(255, 255, 255)",
          contentColor: "rgb(255, 232, 234)",
        },
        dark: {
          chromeColor: "rgb(41, 11, 15)",
          toolbarColor: "rgb(22, 22, 22)",
          contentColor: "rgb(76, 5, 22)",
        },
      },
    },
  ],
  [
    "{2b0fadbf-238d-43db-aa9d-e06c9a7e000b}",
    {
      dataL10nId: "profiles-pink-theme",
      dataL10nTitle: "profiles-pink-theme-title",
      downloadURL:
        "https://addons.mozilla.org/firefox/downloads/file/4552787/profiles_pink-1.0.xpi",
      colors: {
        light: {
          chromeColor: "rgb(255, 194, 219)",
          toolbarColor: "rgb(255, 255, 255)",
          contentColor: "rgb(255, 232, 244)",
        },
        dark: {
          chromeColor: "rgb(39, 11, 21)",
          toolbarColor: "rgb(22, 22, 22)",
          contentColor: "rgb(73, 6, 36)",
        },
      },
    },
  ],
  [
    "{1d73a1eb-128d-4e9e-83f8-c0c51f8c5fd3}",
    {
      dataL10nId: "profiles-purple-theme",
      dataL10nTitle: "profiles-purple-theme-title",
      downloadURL:
        "https://addons.mozilla.org/firefox/downloads/file/4552786/profiles_purple-1.0.xpi",
      colors: {
        light: {
          chromeColor: "rgb(247, 202, 255)",
          toolbarColor: "rgb(255, 255, 255)",
          contentColor: "rgb(255, 236, 255)",
        },
        dark: {
          chromeColor: "rgb(30, 14, 37)",
          toolbarColor: "rgb(22, 22, 22)",
          contentColor: "rgb(56, 17, 71)",
        },
      },
    },
  ],
  [
    "{aab1adac-5449-47fd-b836-c2f43dc28f3f}",
    {
      dataL10nId: "profiles-violet-theme",
      dataL10nTitle: "profiles-violet-theme-title",
      downloadURL:
        "https://addons.mozilla.org/firefox/downloads/file/4552784/profiles_violet-1.0.xpi",
      colors: {
        light: {
          chromeColor: "rgb(221, 207, 255)",
          toolbarColor: "rgb(255, 255, 255)",
          contentColor: "rgb(244, 240, 255)",
        },
        dark: {
          chromeColor: "rgb(22, 17, 43)",
          toolbarColor: "rgb(22, 22, 22)",
          contentColor: "rgb(40, 25, 83)",
        },
      },
    },
  ],
  [
    "{4223a94a-d3f9-40e9-95dd-99aca80ea04b}",
    {
      dataL10nId: "profiles-blue-theme",
      dataL10nTitle: "profiles-blue-theme-title",
      downloadURL:
        "https://addons.mozilla.org/firefox/downloads/file/4551961/profiles_blue-1.0.xpi",
      colors: {
        light: {
          chromeColor: "rgb(171, 223, 255)",
          toolbarColor: "rgb(255, 255, 255)",
          contentColor: "rgb(226, 247, 255)",
        },
        dark: {
          chromeColor: "rgb(8, 21, 44)",
          toolbarColor: "rgb(22, 22, 22)",
          contentColor: "rgb(4, 35, 86)",
        },
      },
    },
  ],
  [
    "{7063abff-a690-4b87-a548-fc32d3ce5708}",
    {
      dataL10nId: "profiles-green-theme",
      dataL10nTitle: "profiles-green-theme-title",
      downloadURL:
        "https://addons.mozilla.org/firefox/downloads/file/4552789/profiles_green-1.0.xpi",
      colors: {
        light: {
          chromeColor: "rgb(181, 240, 181)",
          toolbarColor: "rgb(255, 255, 255)",
          contentColor: "rgb(225, 255, 225)",
        },
        dark: {
          chromeColor: "rgb(5, 28, 7)",
          toolbarColor: "rgb(22, 22, 22)",
          contentColor: "rgb(0, 50, 0)",
        },
      },
    },
  ],
  [
    "{0683b144-0d4a-4815-963e-55a8ec8d386b}",
    {
      dataL10nId: "profiles-cyan-theme",
      dataL10nTitle: "profiles-cyan-theme-title",
      downloadURL:
        "https://addons.mozilla.org/firefox/downloads/file/4552790/profiles_cyan-1.0.xpi",
      colors: {
        light: {
          chromeColor: "rgb(166, 236, 244)",
          toolbarColor: "rgb(255, 255, 255)",
          contentColor: "rgb(207, 255, 255)",
        },
        dark: {
          chromeColor: "rgb(0, 31, 43)",
          toolbarColor: "rgb(22, 22, 22)",
          contentColor: "rgb(0, 50, 61)",
        },
      },
    },
  ],
  [
    "default-theme@mozilla.org",
    {
      dataL10nId: "profiles-system-theme",
      dataL10nTitle: "profiles-system-theme-title",
      colors: {},
    },
  ],
]);

ChromeUtils.defineESModuleGetters(lazy, {
  EveryWindow: "resource:///modules/EveryWindow.sys.mjs",
  formAutofillStorage: "resource://autofill/FormAutofillStorage.sys.mjs",
  LoginHelper: "resource://gre/modules/LoginHelper.sys.mjs",
  PlacesDBUtils: "resource://gre/modules/PlacesDBUtils.sys.mjs",
  PlacesUtils: "resource://gre/modules/PlacesUtils.sys.mjs",
  AddonManager: "resource://gre/modules/AddonManager.sys.mjs",
});

/**
 * Actor implementation for the profile about pages.
 */
export class ProfilesParent extends JSWindowActorParent {
  get tab() {
    const gBrowser = this.browsingContext.topChromeWindow.gBrowser;
    const tab = gBrowser.getTabForBrowser(this.browsingContext.embedderElement);
    return tab;
  }

  async #getProfileContent(isDark) {
    await SelectableProfileService.init();
    let currentProfile = SelectableProfileService.currentProfile;
    let profileAge = await ProfileAge();
    let profiles = await SelectableProfileService.getAllProfiles();
    let themes = await this.getSafeForContentThemes(isDark);
    return {
      currentProfile: await currentProfile.toContentSafeObject(),
      isInAutomation: Cu.isInAutomation,
      hasDesktopShortcut: currentProfile.hasDesktopShortcut(),
      platform: AppConstants.platform,
      profiles: await Promise.all(profiles.map(p => p.toContentSafeObject())),
      profileCreated: await profileAge.created,
      themes,
    };
  }

  async receiveMessage(message) {
    let gBrowser = this.browsingContext.topChromeWindow?.gBrowser;
    let source = this.browsingContext.embedderElement?.currentURI.displaySpec;
    switch (message.name) {
      case "Profiles:DeleteProfile": {
        if (source === "about:newprofile") {
          Glean.profilesNew.closed.record({ value: "delete" });
          GleanPings.profiles.submit();
        } else if (source === "about:deleteprofile") {
          Glean.profilesDelete.confirm.record();
        }

        // Notify windows that a quit has been requested.
        let cancelQuit = Cc["@mozilla.org/supports-PRBool;1"].createInstance(
          Ci.nsISupportsPRBool
        );
        Services.obs.notifyObservers(cancelQuit, "quit-application-requested");

        if (cancelQuit.data) {
          // Something blocked our attempt to quit.
          return null;
        }

        try {
          await SelectableProfileService.deleteCurrentProfile();

          // Finally, exit.
          Services.startup.quit(Ci.nsIAppStartup.eAttemptQuit);
        } catch (e) {
          // This is expected in tests.
          console.error(e);
        }
        break;
      }
      case "Profiles:CancelDelete": {
        Glean.profilesDelete.cancel.record();
        if (gBrowser.tabs.length === 1) {
          // If the profiles tab is the only open tab,
          // open a new tab first so the browser doesn't close
          gBrowser.addTrustedTab("about:newtab");
        }
        gBrowser.removeTab(this.tab);
        break;
      }
      case "Profiles:GetNewProfileContent": {
        Glean.profilesNew.displayed.record();
        let isDark = gBrowser.selectedBrowser.ownerGlobal.matchMedia(
          "(-moz-system-dark-theme)"
        ).matches;
        return this.#getProfileContent(isDark);
      }
      case "Profiles:GetEditProfileContent": {
        Glean.profilesExisting.displayed.record();
        let isDark = gBrowser.selectedBrowser.ownerGlobal.matchMedia(
          "(-moz-system-dark-theme)"
        ).matches;
        return this.#getProfileContent(isDark);
      }
      case "Profiles:MoreThemes": {
        if (message.data.source === "about:editprofile") {
          Glean.profilesExisting.learnMore.record();
        } else if (message.data.source === "about:newprofile") {
          Glean.profilesNew.learnMore.record();
        }
        break;
      }
      case "Profiles:OpenDeletePage": {
        Glean.profilesExisting.deleted.record();
        this.browsingContext.embedderElement.loadURI(
          Services.io.newURI("about:deleteprofile"),
          {
            triggeringPrincipal:
              Services.scriptSecurityManager.getSystemPrincipal(),
          }
        );
        break;
      }
      case "Profiles:PageHide": {
        if (source === "about:editprofile") {
          Glean.profilesExisting.closed.record({ value: "pagehide" });
        } else if (source === "about:newprofile") {
          Glean.profilesNew.closed.record({ value: "pagehide" });
        }
        break;
      }
      case "Profiles:UpdateProfileName": {
        if (source === "about:editprofile") {
          Glean.profilesExisting.name.record();
        } else if (source === "about:newprofile") {
          Glean.profilesNew.name.record();
        }
        let profileObj = message.data;
        SelectableProfileService.currentProfile.name = profileObj.name;
        break;
      }
      case "Profiles:SetDesktopShortcut": {
        let profile = SelectableProfileService.currentProfile;
        let { shouldEnable } = message.data;
        if (shouldEnable) {
          await profile.ensureDesktopShortcut();
          Glean.profilesExisting.shortcut.record({ value: "create" });
        } else {
          await profile.removeDesktopShortcut();
          Glean.profilesExisting.shortcut.record({ value: "delete" });
        }
        return {
          hasDesktopShortcut: profile.hasDesktopShortcut(),
        };
      }
      case "Profiles:GetDeleteProfileContent": {
        // Make sure SelectableProfileService is initialized
        await SelectableProfileService.init();
        Glean.profilesDelete.displayed.record();
        let profileObj =
          await SelectableProfileService.currentProfile.toContentSafeObject();
        let windowCount = lazy.EveryWindow.readyWindows.length;
        let tabCount = lazy.EveryWindow.readyWindows
          .flatMap(win => win.gBrowser.openTabs.length)
          .reduce((total, current) => total + current);
        let loginCount = (await lazy.LoginHelper.getAllUserFacingLogins())
          .length;

        let db = await lazy.PlacesUtils.promiseDBConnection();
        let bookmarksQuery = `SELECT count(*) FROM moz_bookmarks b
                    JOIN moz_bookmarks t ON t.id = b.parent
                    AND t.parent <> :tags_folder
                    WHERE b.type = :type_bookmark`;
        let bookmarksQueryParams = {
          tags_folder: lazy.PlacesUtils.tagsFolderId,
          type_bookmark: lazy.PlacesUtils.bookmarks.TYPE_BOOKMARK,
        };
        let bookmarkCount = (
          await db.executeCached(bookmarksQuery, bookmarksQueryParams)
        )[0].getResultByIndex(0);

        let stats = await lazy.PlacesDBUtils.getEntitiesStatsAndCounts();
        let visitCount = stats.find(
          item => item.entity == "moz_historyvisits"
        ).count;
        let cookieCount = Services.cookies.cookies.length;
        let historyCount = visitCount + cookieCount;

        await lazy.formAutofillStorage.initialize();
        let autofillCount =
          lazy.formAutofillStorage.addresses._data.length +
          lazy.formAutofillStorage.creditCards?._data.length;

        return {
          profile: profileObj,
          windowCount,
          tabCount,
          bookmarkCount,
          historyCount,
          autofillCount,
          loginCount,
        };
      }
      case "Profiles:UpdateProfileAvatar": {
        let { avatarOrFile } = message.data;
        await SelectableProfileService.currentProfile.setAvatar(avatarOrFile);
        let value = SelectableProfileService.currentProfile.hasCustomAvatar
          ? "custom"
          : avatarOrFile;

        if (source === "about:editprofile") {
          Glean.profilesExisting.avatar.record({ value });
        } else if (source === "about:newprofile") {
          Glean.profilesNew.avatar.record({ value });
        }
        let profileObj =
          await SelectableProfileService.currentProfile.toContentSafeObject();
        return profileObj;
      }
      case "Profiles:UpdateProfileTheme": {
        let themeId = message.data;
        // Where the theme was installed from
        let telemetryInfo = {
          method: "url",
          source,
        };
        await this.enableTheme(themeId, telemetryInfo);
        if (source === "about:editprofile") {
          Glean.profilesExisting.theme.record({ value: themeId });
        } else if (source === "about:newprofile") {
          Glean.profilesNew.theme.record({ value: themeId });
        }

        // The enable theme promise resolves after the
        // "lightweight-theme-styling-update" observer so we know the profile
        // theme is up to date at this point.
        return SelectableProfileService.currentProfile.toContentSafeObject();
      }
      case "Profiles:CloseProfileTab": {
        if (source === "about:editprofile") {
          Glean.profilesExisting.closed.record({ value: "done_editing" });
        } else if (source === "about:newprofile") {
          Glean.profilesNew.closed.record({ value: "done_editing" });
        }
        if (gBrowser.tabs.length === 1) {
          // If the profiles tab is the only open tab,
          // open a new tab first so the browser doesn't close
          gBrowser.addTrustedTab("about:newtab");
        }
        gBrowser.removeTab(this.tab);
        break;
      }
    }
    return null;
  }

  async enableTheme(themeId, telemetryInfo) {
    let theme = await lazy.AddonManager.getAddonByID(themeId);
    if (!theme) {
      let themeUrl = PROFILE_THEMES_MAP.get(themeId).downloadURL;
      let themeInstall = await lazy.AddonManager.getInstallForURL(themeUrl, {
        telemetryInfo,
      });
      await themeInstall.install();
      theme = await lazy.AddonManager.getAddonByID(themeId);
    }

    await theme.enable();
  }

  async getSafeForContentThemes(isDark) {
    let lightDark = isDark ? "dark" : "light";
    let themes = [];
    for (let [themeId, themeObj] of PROFILE_THEMES_MAP) {
      if (Object.hasOwn(themeObj, "isDark") && themeObj.isDark !== isDark) {
        continue;
      }

      let theme = await lazy.AddonManager.getAddonByID(themeId);
      themes.push({
        id: themeId,
        dataL10nId: themeObj.dataL10nId,
        dataL10nTitle: themeObj.dataL10nTitle,
        isActive: theme?.isActive ?? false,
        ...themeObj.colors[lightDark],
        useInAutomation: themeObj?.useInAutomation,
      });
    }

    let activeAddons = await lazy.AddonManager.getActiveAddons(["theme"]);
    let currentTheme = activeAddons.addons[0];

    // Only add the current theme if it's not one of the default 10 themes.
    if (!themes.find(t => t.id === currentTheme.id)) {
      let safeCurrentTheme = {
        id: currentTheme.id,
        name: currentTheme.name,
        dataL10nTitle: "profiles-custom-theme-title",
        isActive: currentTheme.isActive,
        chromeColor: SelectableProfileService.currentProfile.theme.themeBg,
        toolbarColor: SelectableProfileService.currentProfile.theme.themeFg,
      };

      themes.push(safeCurrentTheme);
    }

    return themes;
  }
}
