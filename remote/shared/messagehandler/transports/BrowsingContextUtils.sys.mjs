/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  error: "chrome://remote/content/shared/messagehandler/Errors.sys.mjs",
  PollPromise: "chrome://remote/content/shared/Sync.sys.mjs",
});

/**
 * @typedef {object} BrowsingContextDetails
 *
 * @property {number} browserId
 *     Browser id for this browsing context.
 * @property {number} browsingContextId
 *     Internal id of the browsing context.
 * @property {boolean} isTopBrowsingContext
 *     Flag that indicates if the browsing context is top-level.
 * @property {boolean} isContent
 *     Flag that indicates if it is a content or a chrome browsing context.
 */

/**
 * A browsing context might be replaced before reaching the parent process,
 * instead we serialize enough information to retrieve the navigable in the
 * parent process.
 *
 * If the browsing context is top level, then the browserId can be used to
 * find the browser element and the new browsing context.
 * Otherwise (frames) the browsing context should not be replaced and the
 * browsing context id should be enough to find the browsing context.
 *
 * Should be used when preparing an event payload from the content to the
 * parent process.
 *
 * @param {BrowsingContext} browsingContext
 *     The browsing context for which we want to get details.
 *
 * @returns {BrowsingContextDetails}
 *     Details of the browsing context.
 */
export function getBrowsingContextDetails(browsingContext) {
  return {
    browserId: browsingContext.browserId,
    browsingContextId: browsingContext.id,
    isContent: browsingContext.isContent,
    isTopBrowsingContext: browsingContext.parent === null,
  };
}

function isExtensionContext(browsingContext) {
  let principal;
  try {
    if (CanonicalBrowsingContext.isInstance(browsingContext)) {
      principal = browsingContext.currentWindowGlobal.documentPrincipal;
    } else {
      principal = browsingContext.window.document.nodePrincipal;
    }
  } catch (e) {
    throw new Error(
      `Could not retrieve principal for browsingContext (${e.message})`
    );
  }

  // In practice, note that the principal will never be an expanded principal.
  // The are only used for content scripts executed in a Sandbox, and do not
  // have a browsing context on their own.
  // But we still use this flag because there is no isAddonPrincipal flag.
  return principal.isAddonOrExpandedAddonPrincipal;
}

function isParentProcess(browsingContext) {
  if (CanonicalBrowsingContext.isInstance(browsingContext)) {
    return browsingContext.currentWindowGlobal.osPid === -1;
  }

  // If `browsingContext` is not a `CanonicalBrowsingContext`, then we are
  // necessarily in a content process page.
  return false;
}

/**
 * Check if the provided browsing context is currently displaying its initial
 * document. For top level browsing contexts, this is usually the initial
 * about:blank.
 *
 * @param {BrowsingContext} browsingContext
 *     The browsing context to check.
 *
 * @returns {boolean}
 *     True if the browsing context is on the initial document, false otherwise.
 */
export function isInitialDocument(browsingContext) {
  if (!browsingContext.currentWindowGlobal) {
    // Right after a browsing context has been attached it could happen that
    // no window global has been set yet. Consider this as nothing has been
    // loaded yet.
    return true;
  }

  return browsingContext.currentWindowGlobal.isInitialDocument;
}

/**
 * Check if the provided browsing context is currently displaying its initial
 * document. For top level browsing contexts, this is usually the initial
 * about:blank which will be replaced soon.
 *
 * @param {BrowsingContext} browsingContext
 *     The browsing context to check.
 *
 * @returns {boolean}
 *     True if the browsing context is on the initial document, false otherwise.
 */
export function isUncommittedInitialDocument(browsingContext) {
  if (!browsingContext.currentWindowGlobal) {
    // Right after a browsing context has been attached it could happen that
    // no window global has been set yet. Consider this as nothing has been
    // loaded yet.
    return true;
  }

  return browsingContext.currentWindowGlobal.isUncommittedInitialDocument;
}

/**
 * Check if the given browsing context is valid for the message handler
 * to use.
 *
 * @param {BrowsingContext} browsingContext
 *     The browsing context to check.
 * @param {object=} options
 * @param {string=} options.browserId
 *    The id of the browser to filter the browsing contexts by (optional).
 * @param {string=} options.userContext
 *    The id of the user context to filter the browsing contexts by (optional).
 *
 * @returns {boolean}
 *     True if the browsing context is valid, false otherwise.
 */
export function isBrowsingContextCompatible(browsingContext, options = {}) {
  const { browserId, userContext } = options;

  if (!BrowsingContext.isInstance(browsingContext)) {
    return false;
  }

  // If a browserId was provided, skip browsing contexts which are not
  // associated with this browserId.
  if (browserId !== undefined && browsingContext.browserId !== browserId) {
    return false;
  }

  // If a userContext was provided, skip browsing contexts which are not
  // associated with this userContext.
  if (
    userContext !== undefined &&
    browsingContext.originAttributes.userContextId !== userContext
  ) {
    return false;
  }

  // If this is a CanonicalBrowsingContext but the currentWindowGlobal is not
  // attached yet, skip it.
  if (
    CanonicalBrowsingContext.isInstance(browsingContext) &&
    !browsingContext.currentWindowGlobal
  ) {
    return false;
  }

  // Skip:
  // - extension contexts until we support debugging webextensions, see Bug 1755014.
  // - privileged contexts until we support debugging Chrome context, see Bug 1713440.
  return (
    !isExtensionContext(browsingContext) && !isParentProcess(browsingContext)
  );
}

/**
 * Wait until `currentWindowGlobal` is available on a browsing context. When a
 * browsing context has just been created, the `currentWindowGlobal` might not
 * be attached yet.
 *
 * @param {CanonicalBrowsingContext} browsingContext
 *     The browsing context to wait for.
 *
 * @returns {Promise}
 *     Promise which resolves when `currentWindowGlobal` is available.
 *
 * @throws DiscardedBrowsingContextError
 *     Browsing context is discarded or still no
 *     `currentWindowGlobal` set after 100ms.
 */
export async function waitForCurrentWindowGlobal(browsingContext) {
  await lazy.PollPromise(
    (resolve, reject) => {
      if (browsingContext.currentWindowGlobal || browsingContext.isDiscarded) {
        // If the browsing context is discarded while checking for
        // the current window global, return early to avoid waiting
        // unnecessarily until the timeout expires.
        resolve();
      } else {
        reject();
      }
    },
    {
      timeout: 100,
    }
  );

  if (!browsingContext.currentWindowGlobal) {
    throw new lazy.error.DiscardedBrowsingContextError(
      `BrowsingContext does no longer exist`
    );
  }
}
