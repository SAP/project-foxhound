/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React, { useCallback } from "react";
import { FeatureHighlight } from "./FeatureHighlight";

export function ShortcutFeatureHighlight({
  dispatch,
  feature,
  handleBlock,
  handleDismiss,
  messageData,
  position,
}) {
  const onDismiss = useCallback(() => {
    handleDismiss();
    handleBlock();
  }, [handleDismiss, handleBlock]);

  return (
    <div
      className={`shortcut-feature-highlight ${messageData.content?.darkModeDismiss ? "is-inverted-dark-dismiss-button" : ""}`}
    >
      <FeatureHighlight
        position={position}
        feature={feature}
        dispatch={dispatch}
        message={
          <div className="shortcut-feature-highlight-content">
            <picture className="follow-section-button-highlight-image">
              <source
                srcSet={
                  messageData.content?.darkModeImageURL ||
                  "chrome://newtab/content/data/content/assets/highlights/omc-newtab-shortcuts.svg"
                }
                media="(prefers-color-scheme: dark)"
              />
              <source
                srcSet={
                  messageData.content?.imageURL ||
                  "chrome://newtab/content/data/content/assets/highlights/omc-newtab-shortcuts.svg"
                }
                media="(prefers-color-scheme: light)"
              />
              <img width="320" height="195" alt="" />
            </picture>
            <div className="shortcut-feature-highlight-copy">
              {messageData.content?.cardTitle ? (
                <p className="title">{messageData.content.cardTitle}</p>
              ) : (
                <p
                  className="title"
                  data-l10n-id="newtab-shortcuts-highlight-title"
                />
              )}
              {messageData.content?.cardMessage ? (
                <p className="subtitle">{messageData.content.cardMessage}</p>
              ) : (
                <p
                  className="subtitle"
                  data-l10n-id="newtab-shortcuts-highlight-subtitle"
                />
              )}
            </div>
          </div>
        }
        openedOverride={true}
        showButtonIcon={false}
        dismissCallback={onDismiss}
        outsideClickCallback={handleDismiss}
      />
    </div>
  );
}
