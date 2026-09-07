/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { useSelector } from "react-redux";
import { FeatureHighlight } from "./FeatureHighlight";

function WidgetsFeatureHighlight({ handleDismiss, handleBlock, dispatch }) {
  // Extract the strings and feature ID from OMC
  const { messageData } = useSelector(state => state.Messages);

  return (
    <FeatureHighlight
      position="inset-inline-end inset-block-end"
      arrowPosition="arrow-top-start"
      openedOverride={true}
      showButtonIcon={false}
      feature={messageData?.content?.feature}
      modalClassName={`widget-highlight-wrapper${messageData.content?.hideImage ? " no-image" : ""}`}
      message={
        <div className="widget-highlight">
          {!messageData.content?.hideImage && (
            <img
              src={
                messageData.content?.imageURL ||
                "chrome://newtab/content/data/content/assets/widget-message.png"
              }
              alt=""
            />
          )}
          {messageData.content?.cardTitle ? (
            <h3 className="title">{messageData.content.cardTitle}</h3>
          ) : (
            <h3
              className="title"
              data-l10n-id={
                messageData.content.title || "newtab-widget-message-title"
              }
            />
          )}
          {messageData.content?.cardMessage ? (
            <p className="subtitle">{messageData.content.cardMessage}</p>
          ) : (
            <p
              className="subtitle"
              data-l10n-id={
                messageData.content.subtitle || "newtab-widget-message-copy"
              }
            />
          )}
        </div>
      }
      dispatch={dispatch}
      dismissCallback={() => {
        handleDismiss();
        handleBlock();
      }}
      outsideClickCallback={handleDismiss}
    />
  );
}

export { WidgetsFeatureHighlight };
