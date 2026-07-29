/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";
import { AppConstants } from "resource://gre/modules/AppConstants.sys.mjs";

const SERVER_PATH = "/api/v1/create";

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  JsonSchema: "resource://gre/modules/JsonSchema.sys.mjs",
  PlacesUtils: "resource://gre/modules/PlacesUtils.sys.mjs",
  PrivateBrowsingUtils: "resource://gre/modules/PrivateBrowsingUtils.sys.mjs",
  setTimeout: "resource://gre/modules/Timer.sys.mjs",
  clearTimeout: "resource://gre/modules/Timer.sys.mjs",
  URILoadingHelper: "resource:///modules/URILoadingHelper.sys.mjs",
});
XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "CONTENT_SHARING_ENABLED",
  "browser.contentsharing.enabled",
  false
);
XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "CONTENT_SHARING_SERVER_URL",
  "browser.contentsharing.server.url",
  ""
);
XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "CONTENT_SHARING_LOGIN_TIMEOUT_MS",
  "browser.contentsharing.automation.detectLoginTimeoutMS",
  100
);

ChromeUtils.defineLazyGetter(lazy, "contentSharingL10n", () => {
  return new Localization(["browser/contentSharing.ftl"]);
});

export const MAX_ITEM_COUNT = 30;
// Delay for server retries. Lower in testing so the test doesn't time out.
const BASE_DELAY = Cu.isInAutomation ? 100 : 1000;
const MAX_REQUEST_ATTEMPTS = 5;

const CONTENT_SHARING_MODAL_URL =
  "chrome://browser/content/contentsharing/contentSharingModal.xhtml";

const SCHEMA_MAP = new Map();
async function loadContentSharingSchema() {
  if (SCHEMA_MAP.has("CONTENT_SHARING_SCHEMA")) {
    return SCHEMA_MAP.get("CONTENT_SHARING_SCHEMA");
  }

  const url =
    "chrome://browser/content/contentsharing/contentsharing.schema.json";
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load schema: ${response.statusText}`);
  }

  const schema = await response.json();
  SCHEMA_MAP.set("CONTENT_SHARING_SCHEMA", schema);
  return schema;
}

export const ERRORS = Object.freeze({
  GENERIC: "generic-error",
  MAX_RETRY_ATTEMPTS: "max-retry-attempts-error",
  UNAUTHORIZED: "unauthorized-error",
  DISABLED: "disabled-error",
  INVALID_SCHEMA: "invalid-schema-error",
});

export const WARNINGS = Object.freeze({
  TOO_MANY_LINKS: "too-many-links-warning",
});

/**
 * @typedef {object} ShareResult
 * @property {object|null} share The share object to send to the server.
 * @property {string|null} error A single error from {@link ERRORS}, if any.
 * @property {string|null} warning A single warning from {@link WARNINGS}, if any.
 * @property {string|null} url The share URL returned by the server on success.
 * @property {boolean|null} isSchemaValid Whether the share passed schema validation.
 * @property {boolean|null} isSignedIn Whether the user is signed in.
 */

export function makeShareResult({ share = null } = {}) {
  return {
    share,
    error: null,
    warning: null,
    url: null,
    isSchemaValid: null,
    isSignedIn: null,
  };
}

/**
 * Class for interacting with Content Sharing features, such as sharing bookmarks, tab groups, and tabs.
 */
class ContentSharingUtilsClass {
  #validator = null;

  get isEnabled() {
    let isPrivate = lazy.PrivateBrowsingUtils.isWindowPrivate(
      Services.wm.getMostRecentBrowserWindow()
    );
    return lazy.CONTENT_SHARING_ENABLED && !isPrivate;
  }

  get serverURL() {
    return lazy.CONTENT_SHARING_SERVER_URL;
  }

  get redirectURL() {
    return this.serverURL + "/auth-complete";
  }

  disable() {
    Services.prefs.setBoolPref("browser.contentsharing.enabled", false);
    Services.prefs.setStringPref("browser.contentsharing.server.url", "");
  }

  async getValidator() {
    if (this.#validator) {
      return this.#validator;
    }

    const schema = await loadContentSharingSchema();
    this.#validator = new lazy.JsonSchema.Validator(schema);
    return this.#validator;
  }

  /**
   * Handles sharing bookmarks by building a share object and opening the
   * content sharing modal. bookmarkFolderGuids can be 1 or more bookmark
   * folder guids. If more than 1, the first guid will be treated as the parent
   * folder and the rest will be nested inside it.
   *
   * @param {Array<string>} bookmarkFolderGuids An array of bookmark folder guids
   */
  async createShareableLinkFromBookmarkFolders(bookmarkFolderGuids) {
    let shareResult;
    try {
      shareResult =
        await this.buildShareFromBookmarkFolders(bookmarkFolderGuids);
    } catch (e) {
      console.error("ContentSharingUtils: failed to share bookmarks", e);
    }
    if (shareResult) {
      await this.#createLinkAndOpenModal(shareResult, "bookmarks");
    }
  }

  /**
   * Shares the multi-selected tabs
   *
   * @param {MozTabbrowserTab[]} tabs
   */
  async handleShareTabs(tabs) {
    if (!tabs.length) {
      return;
    }

    const title = "tab share title";

    const shareObject = {
      type: "tabs",
      title,
      children: tabs.map(t => ({
        uri: t.linkedBrowser.currentURI.spec,
        title: t.label,
      })),
    };
    const result = this.buildShare(shareObject);

    result.share.title = await lazy.contentSharingL10n.formatValue(
      "content-sharing-tabs-title",
      {
        count: this.countItems(result.share),
      }
    );
    await this.#createLinkAndOpenModal(result, "tabs");
  }

  /**
   * Handles sharing a tab group by building a share object and opening the
   * content sharing modal.
   *
   * @param {MozTabbrowserTabGroup} tabGroup The tab group element to share
   */
  async handleShareTabGroup(tabGroup) {
    let title = tabGroup.label;
    if (!title) {
      title = await tabGroup.ownerDocument.l10n.formatValue(
        "tab-group-name-default"
      );
    }
    const shareObject = {
      title,
      type: "tab_group",
      children: tabGroup.tabs.map(t => {
        return {
          uri: t.linkedBrowser.currentURI.displaySpec,
          title: t.label,
        };
      }),
    };
    const result = this.buildShare(shareObject);
    await this.#createLinkAndOpenModal(result, "tab_group");
  }

  /**
   * Builds a share object from bookmark folder guids. It first builds out the
   * bookmark tree and then builds a share object from that tree, returning an
   * object to be validated against contentsharing.schema.json and sent to the
   * content sharing server. bookmarkFolderGuids must be 1 or more folder guids.
   * If more than 1, the first guid will be treated as the parent folder and
   * the rest will be nested inside it.
   *
   * @param {Array<string>} bookmarkFolderGuids An array of bookmark folder guids
   * @returns {Promise<object>} The built share object that will be validated against
   * the contentsharing.schema.json
   */
  async buildShareFromBookmarkFolders(bookmarkFolderGuids) {
    if (!bookmarkFolderGuids.length) {
      return null;
    }

    let bookmark;
    if (bookmarkFolderGuids.length === 1) {
      bookmark = await lazy.PlacesUtils.promiseBookmarksTree(
        bookmarkFolderGuids[0]
      );
    } else {
      // More than one folder selected: first folder is the parent, rest are children.
      bookmark = await lazy.PlacesUtils.promiseBookmarksTree(
        bookmarkFolderGuids[0]
      );
      bookmark.children = bookmark.children ?? [];

      for (let guid of bookmarkFolderGuids.slice(1)) {
        bookmark.children.push(
          await lazy.PlacesUtils.promiseBookmarksTree(guid)
        );
      }
    }

    bookmark.type = "bookmarks";

    return this.buildShare(bookmark);
  }

  /**
   * Takes an object with a uri and optional title and returns an object with
   * a url and title that is valid according the content sharing schema.
   *
   * @param {object} linkObject An object that must contain a uri and should
   * contain a title.
   * @returns {object|null} A link object with a url and a title. If the uri is
   * missing or not valid, returns null. If the title is too long, it will be
   * truncated to 100 characters.
   */
  makeValidLink(linkObject) {
    if (!linkObject.uri) {
      return null;
    }

    const httpsRegex = new RegExp("^https?://.*$");
    if (!linkObject.uri.match(httpsRegex)) {
      return null;
    }

    let url;
    try {
      url = new URL(linkObject.uri);
    } catch (e) {
      // This throws if the uri is not valid.
      return null;
    }

    return {
      url: url.toString().slice(0, 4000),
      title: linkObject.title?.slice(0, 100) ?? "",
    };
  }

  /**
   * Builds a share object from a given bookmark tree/tab group/selected tabs.
   * The share object is a simplified version of the bookmark tree that only
   * includes the necessary information for sharing (e.g. title and url).
   * For bookmarks, the share object will have a type of "bookmarks" and will
   * include the title of the bookmark folder and an array of links, where each
   * link can either be a bookmark (with a url and optional title) or a nested
   * folder (with its own title and array of links). Nested folders will
   * recursively call this function to build their share objects.
   * For tab groups, the share object will have the type "tab_group" and will
   * take the title of the tab group.
   * For selected tabs, the share object will have the type "tabs" and the
   * title will be the number of tabs selected.
   * Both tab groups and selected tabs will include an array of links, where
   * each link will have a url and title.
   *
   * @param {object} shareObject The bookmark tree to share.
   * @param {object} currentCount The current count of links in the share
   * object. The object only has a "value" property that is the count of the
   * number of items in the share.
   * @returns {ShareResult} An object containing the share object that will be
   * validated against the contentsharing.schema.json and any warnings if
   * present
   */
  buildShare(shareObject, currentCount = {}) {
    // Using an object for currentCount so that it can be passed by reference
    // and updated across recursive calls.
    currentCount.value = currentCount.value ?? 0;

    const shareResult = makeShareResult();
    const share = {
      type: shareObject.type ?? "bookmarks",
      title: shareObject.title.slice(0, 100),
    };

    let links = [];
    for (let linkOrNestShare of shareObject.children ?? []) {
      if (currentCount.value >= MAX_ITEM_COUNT) {
        shareResult.warning = WARNINGS.TOO_MANY_LINKS;
        break;
      }

      if (linkOrNestShare.uri) {
        const validLink = this.makeValidLink(linkOrNestShare);
        if (validLink) {
          links.push(validLink);
          currentCount.value += 1;
        }
      } else if (linkOrNestShare.children) {
        linkOrNestShare.type = "bookmarks";

        currentCount.value += 1;
        links.push(this.buildShare(linkOrNestShare, currentCount).share);
      }
    }

    share.links = links;
    shareResult.share = share;

    return shareResult;
  }

  /**
   * Validate the share object, attempt to create a shareable link by sending
   * the share to the server. If login is needed, wait up to 2 minutes for the
   * user to log in or sign up, and then attempt to create the share and
   * open a new tab at the share URL.
   *
   * @param {ShareResult} shareResult An object containing the share object and any warnings
   * @param {string} context Used in error logging (e.g. "tabs", "tab_group")
   */
  async #createLinkAndOpenModal(shareResult, context) {
    let resolveLoading;
    const loadingPromise = new Promise(resolve => {
      resolveLoading = resolve;
    });

    let window = Services.wm.getMostRecentBrowserWindow();

    window.gDialogBox.open(CONTENT_SHARING_MODAL_URL, {
      shareResult,
      loadingPromise,
      size: window.innerWidth,
    });

    // Note: the result object contains either the URL or an error. It's safe
    // to pass into the modal, which handles error UI as needed.
    try {
      shareResult = await this.createShareableLink(shareResult);
      shareResult.isSignedIn =
        this.isSignedIn() && shareResult.error !== ERRORS.UNAUTHORIZED;
    } finally {
      // Resolve with a new object so Lit detects the shareResult change
      resolveLoading({
        shareResult,
        loadingPromise: null,
        size: window.innerWidth,
      });
    }

    if (shareResult.error && !shareResult.isSignedIn) {
      console.error(
        `ContentSharingUtils: failed to share ${context}`,
        shareResult.error
      );
    }

    Glean.collectionShare.dialogOpen.record({
      signed_in: shareResult.isSignedIn,
      share_type: context,
    });

    // After the dialog box closes, attempt login if needed.
    if (shareResult.isSignedIn) {
      return;
    }

    try {
      await this.detectLogin();

      // Now that we are logged in, try to create again.
      shareResult = await this.createShareableLink(shareResult);
      if (shareResult.error) {
        console.error(
          "ContentSharingUtils: something went wrong after login: ",
          shareResult.error
        );
        return;
      }

      // If we're able to find the auth-complete tab, reuse it.
      let foundTab = lazy.URILoadingHelper.switchToTabHavingURI(
        window,
        this.redirectURL,
        false,
        { ignoreQueryString: true }
      );
      window = Services.wm.getMostRecentBrowserWindow();

      // Borrowing a hack from unexpectedScriptLoad.js, which we use to ensure
      // opened tabs are foregrounded. To be fixed in bug 2040823.
      window.top.document.documentElement.removeAttribute("window-modal-open");

      window.openWebLinkIn(shareResult.url, foundTab ? "current" : "tab");
    } catch (ex) {
      // Either we timed out waiting for the cookie to be set, or something
      // else went wrong. The user will have to try again.
      console.error("ContentSharingUtils: login failed ", ex);
    }
  }

  /**
   * This function will attempt to send a post request to the content sharing
   * server to create a share. If the request is unsuccessful, this function
   * will attempt to retry the request if possible using randomized exponential
   * backoff. It still unsuccessful, an error will be thrown. If successful,
   * the successful response is returned.
   *
   * @param {ShareResult} shareResult The share result containing the share
   * object to send to the server
   * @returns {Promise<ShareResult>} An share object with the url set if
   * successful otherwise the share result with errors set
   */
  async #doRequest(shareResult) {
    const serverEndpoint = this.serverURL + SERVER_PATH;
    const maxDelay = 30 * BASE_DELAY;
    let canRetry = true;
    let attempts = 0;
    let response;

    if (!this.serverURL) {
      console.error("ContentSharingUtils: server URL is not set");
      shareResult.error = ERRORS.GENERIC;
      Glean.collectionShare.error.record({ error_type: ERRORS.GENERIC });
      return shareResult;
    }

    // Only allow insecure http connections in automation and in local builds.
    if (
      !Cu.isInAutomation &&
      AppConstants.MOZILLA_OFFICIAL &&
      !this.serverURL.startsWith("https://")
    ) {
      console.error("ContentSharingUtils: server URL must be HTTPS");
      shareResult.error = ERRORS.GENERIC;
      return shareResult;
    }

    if (!this.isSignedIn()) {
      shareResult.error = ERRORS.UNAUTHORIZED;
      return shareResult;
    }

    while (canRetry) {
      if (attempts >= MAX_REQUEST_ATTEMPTS) {
        console.error(
          "ContentSharingUtils: tried to request the server the maximum number times"
        );
        shareResult.error = ERRORS.MAX_REQUEST_ATTEMPTS;
        break;
      }

      if (attempts > 0) {
        const random = Math.random() * (5 * BASE_DELAY); // add up to 5 seconds of random jitter
        const delay =
          Math.min(maxDelay, Math.pow(2, attempts) * BASE_DELAY) + random;
        await new Promise(resolve => lazy.setTimeout(resolve, delay));
      }

      try {
        response = await fetch(serverEndpoint, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(shareResult.share),
        });

        if (!response.ok) {
          Glean.collectionShare.error.record({
            status_code: response.status,
          });
        }

        if (!response.ok && response.status >= 500) {
          canRetry = true;
        } else if (!response.ok && response.status >= 400) {
          canRetry = false;
          if (response.status === 401) {
            shareResult.error = ERRORS.UNAUTHORIZED;
          } else if (response.status === 410) {
            shareResult.error = ERRORS.DISABLED;
            this.disable();
          } else {
            shareResult.error = ERRORS.GENERIC;
          }
        } else if (
          response.ok &&
          (response.status === 201 || response.status === 200)
        ) {
          // Success!
          break;
        }
      } catch (error) {
        console.error(error);
        canRetry = false;
        shareResult.error = ERRORS.MAX_RETRY_ATTEMPTS;
        Glean.collectionShare.error.record({
          error_type: ERRORS.MAX_RETRY_ATTEMPTS,
        });
      }

      attempts += 1;
    }

    if (shareResult.error) {
      return shareResult;
    }

    try {
      let { url } = await response.json();

      // Validate the URL returned from the server before using it.
      const shareURL = URL.parse(url);
      const serverOrigin = URL.parse(this.serverURL)?.origin;
      if (!shareURL || !serverOrigin || shareURL.origin !== serverOrigin) {
        console.error(
          `ContentSharingUtils: share URL ${url} does not match configured server origin`
        );
        shareResult.error = ERRORS.GENERIC;
        return shareResult;
      }

      shareResult.url = url;
    } catch (error) {
      console.error(error);
      shareResult.error = ERRORS.GENERIC;
    }

    return shareResult;
  }

  async createShareableLink(shareResult) {
    shareResult.error = null;
    await this.validateSchema(shareResult);
    if (shareResult.error) {
      return shareResult;
    }
    return this.#doRequest(shareResult);
  }

  countItems(share) {
    if (!share.links || share.links.length === 0) {
      return 0;
    }

    let count = 0;
    for (let item of share.links) {
      if (item.links) {
        count += this.countItems(item);
      }
      // Always count the current item
      count += 1;
    }

    return count;
  }

  async validateSchema(shareResult) {
    const validator = await this.getValidator();
    const result = validator.validate(shareResult.share);

    shareResult.isSchemaValid = result.valid;
    if (!result.valid || this.countItems(shareResult.share) > MAX_ITEM_COUNT) {
      shareResult.error = ERRORS.INVALID_SCHEMA;
      Glean.collectionShare.error.record({ error_type: ERRORS.INVALID_SCHEMA });
    }

    return shareResult;
  }

  getCookie() {
    let hostname;
    try {
      let serverURL = new URL(lazy.CONTENT_SHARING_SERVER_URL);

      // Cookies are port-insensitive, but our test server sets a port number.
      // Just use the hostname part of the URL for cookie lookup.
      hostname = serverURL.hostname;
    } catch (ex) {
      console.error(
        "ContentSharingUtils: failed to get cookie because server URL is unset or malformed",
        ex
      );
      return false;
    }
    const cookies = Services.cookies.getCookiesFromHost(hostname, {});

    // Filter on host because parent domain cookies are returned when getting
    // cookies from a subdomain.
    // Check for the special "auth" cookie which is only set by the server
    // when oauth login is complete.
    let authCookie = cookies.find(
      cookie =>
        cookie.host == hostname &&
        cookie.name == "auth" &&
        cookie.expiry > Date.now()
    );
    return authCookie?.value;
  }

  isSignedIn() {
    return !!this.getCookie();
  }

  /**
   * Waits 2 minutes (100 milliseconds in automation) for the user to complete
   * sign up / log in.
   *
   * @returns {Promise} a promise that resolves if the cookie is detected
   * before the timeout, or rejects if the timeout is reached.
   */
  async detectLogin() {
    if (this.observingCookieChange) {
      return this.cookieChangePromise;
    }

    const COOKIE_DETECTION_TIMEOUT = Cu.isInAutomation
      ? lazy.CONTENT_SHARING_LOGIN_TIMEOUT_MS
      : 120 * 1000;

    let { promise, resolve, reject } = Promise.withResolvers();
    this.observingCookieChange = true;

    this.cookieChangeObserver = {
      // eslint-disable-next-line no-unused-vars
      observe: (subject, topic, data) => {
        if (this.isSignedIn()) {
          resolve();
        }
      },
    };
    Services.obs.addObserver(this.cookieChangeObserver, "cookie-changed");

    this.cookieChangeTimer = lazy.setTimeout(() => {
      reject(new Error("ContentSharingUtils: timed out waiting for login"));
    }, COOKIE_DETECTION_TIMEOUT);

    const wrapped = promise.finally(() => {
      this.observingCookieChange = false;
      Services.obs.removeObserver(this.cookieChangeObserver, "cookie-changed");
      lazy.clearTimeout(this.cookieChangeTimer);
    });
    this.cookieChangePromise = wrapped;
    return wrapped;
  }
}

const ContentSharingUtils = new ContentSharingUtilsClass();
export { ContentSharingUtils };
