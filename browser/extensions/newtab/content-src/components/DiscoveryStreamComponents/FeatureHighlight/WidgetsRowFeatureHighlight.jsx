/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { useCallback } from "react";
import { useSelector } from "react-redux";
import { FeatureHighlight } from "./FeatureHighlight";

function WidgetsRowFeatureHighlight({ handleDismiss, handleBlock, dispatch }) {
  const { messageData } = useSelector(state => state.Messages);

  const onDismiss = useCallback(() => {
    handleDismiss();
    handleBlock();
  }, [handleDismiss, handleBlock]);

  return (
    <div className="widgets-row-feature-highlight">
      <FeatureHighlight
        position="inset-inline-center inset-block-end"
        arrowPosition="arrow-top-start"
        openedOverride={true}
        showButtonIcon={false}
        feature={messageData.content.feature}
        modalClassName="widgets-row-highlight-modal"
        message={
          <div className="widgets-row-highlight-content">
            {messageData.content.cardTitle ? (
              <h3 className="title">{messageData.content.cardTitle}</h3>
            ) : (
              <h3
                className="title"
                data-l10n-id={
                  messageData.content.title || "newtab-widget-message-title"
                }
              />
            )}
            {messageData.content.cardMessage ? (
              <p className="subtitle">{messageData.content.cardMessage}</p>
            ) : (
              <p
                className="subtitle"
                data-l10n-id={
                  messageData.content.subtitle || "newtab-widget-message-copy"
                }
              />
            )}
            <span className="button-wrapper">
              {messageData.content.cardCta ? (
                <moz-button
                  type="primary"
                  onClick={onDismiss}
                  label={messageData.content.cardCta}
                />
              ) : (
                <moz-button
                  type="primary"
                  onClick={onDismiss}
                  data-l10n-id={
                    messageData.content.cta ||
                    "newtab-wallpaper-feature-highlight-button"
                  }
                />
              )}
            </span>
          </div>
        }
        dispatch={dispatch}
        dismissCallback={onDismiss}
        outsideClickCallback={handleDismiss}
      />
    </div>
  );
}

export { WidgetsRowFeatureHighlight };
