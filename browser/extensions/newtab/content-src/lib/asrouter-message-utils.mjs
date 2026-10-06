/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

export const ASROUTER_NEWTAB_MESSAGE_POSITIONS = Object.freeze({
  ABOVE_TOPSITES: "ABOVE_TOPSITES",
  ABOVE_WIDGETS: "ABOVE_WIDGETS",
  ABOVE_CONTENT_FEED: "ABOVE_CONTENT_FEED",
});

/**
 * Returns true if the Messages state has a visible message whose messageType
 * matches componentId.
 *
 * @param {object} messagesProp - The Messages slice of Redux state ({ messageData, isVisible }).
 * @param {string} componentId - The messageType value to match against.
 * @returns {boolean}
 */
export function shouldShowOMCHighlight(messagesProp, componentId) {
  const messageData = messagesProp?.messageData;
  const isVisible = messagesProp?.isVisible;
  if (!messageData || Object.keys(messageData).length === 0 || !isVisible) {
    return false;
  }
  return messageData?.content?.messageType === componentId;
}

/**
 * Returns true if the Messages state has a visible ASRouterNewTabMessage whose
 * configured position matches currentPosition.  When no position is set on the
 * message, it defaults to ABOVE_TOPSITES.
 *
 * @param {object} messagesProps - The Messages slice of Redux state ({ messageData, isVisible }).
 * @param {string} componentId - The messageType value to match against (e.g. "ASRouterNewTabMessage").
 * @param {string} currentPosition - One of the ASROUTER_NEWTAB_MESSAGE_POSITIONS values.
 * @returns {boolean}
 */
export function shouldShowASRouterNewTabMessage(
  messagesProps,
  componentId,
  currentPosition
) {
  const messageData = messagesProps?.messageData;
  if (!messageData) {
    return false;
  }

  const configuredPosition =
    messageData.content?.position ??
    ASROUTER_NEWTAB_MESSAGE_POSITIONS.ABOVE_TOPSITES;

  if (configuredPosition === currentPosition) {
    return shouldShowOMCHighlight(messagesProps, componentId);
  }

  return false;
}
