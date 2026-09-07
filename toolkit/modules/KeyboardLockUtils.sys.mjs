/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export const KeyboardLockUtils = {
  /**
   * Requests reply from content process first for `aEvent`, if `document` is
   * in fullscreen and has keyboard locked.
   *
   * Used by frontend code that needs to check if keyboard lock is active. Function
   * returns true if a reply was requested, indicating that the caller must handle
   * the event only when it gets re-fired.
   *
   * @param {Event} aEvent
   * @returns {boolean} Returns true if caller should wait for response.
   */
  mustWaitForKeyboardLockRequestedReply(aEvent) {
    // Event is a reply, and we should process it now
    if (aEvent.isReplyEventFromRemoteContent) {
      return false;
    }

    // Event has been requested a reply for already.
    if (aEvent.isWaitingReplyFromRemoteContent) {
      return true;
    }

    const doc = aEvent.target.ownerDocument;

    // Keyboard lock in fullscreen is active and we must
    // request reply for event.
    if (
      doc.fullscreenElement &&
      doc.fullscreenKeyboardLock == "browser" &&
      aEvent.target?.isRemoteBrowser === true
    ) {
      aEvent.requestReplyFromRemoteContent();
      return true;
    }
    return false;
  },
};
