/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React, { useCallback } from "react";
import { useSelector } from "react-redux";
import { MessageWrapper } from "content-src/components/MessageWrapper/MessageWrapper";
import { FeatureHighlight } from "./FeatureHighlight";
import { HighlightPopoverBody } from "./HighlightPopoverBody";
import {
  DISMISS_MODES,
  SHELLS,
  getRegistryEntry,
} from "./OMCHighlightRegistry.mjs";

const PopoverShell = ({ entry, content, handleDismiss, handleBlock }) => {
  const dismissCallback = useCallback(() => {
    handleDismiss?.();
    if (entry.dismiss === DISMISS_MODES.BLOCK) {
      handleBlock?.();
    }
  }, [entry.dismiss, handleDismiss, handleBlock]);

  return (
    <FeatureHighlight
      position={entry.chrome.position}
      arrowPosition={entry.chrome.arrowPosition}
      modalClassName={entry.chrome.modalClassName}
      openedOverride={true}
      showButtonIcon={false}
      message={<HighlightPopoverBody body={entry.body} content={content} />}
      dismissCallback={dismissCallback}
      outsideClickCallback={handleDismiss}
    />
  );
};

export const OMCHighlightSlot = ({ slot, dispatch }) => {
  const { messageData } = useSelector(state => state.Messages);
  const content = messageData?.content;
  const entry = getRegistryEntry(content?.messageType);

  if (!entry || entry.slot !== slot) {
    return null;
  }

  if (entry.shell === SHELLS.POPOVER) {
    return (
      <MessageWrapper dispatch={dispatch} wrapperClassName="omc-highlight-slot">
        <PopoverShell entry={entry} content={content} />
      </MessageWrapper>
    );
  }

  return null;
};
