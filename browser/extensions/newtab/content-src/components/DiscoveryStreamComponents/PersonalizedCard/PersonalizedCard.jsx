/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React, { useCallback } from "react";
import { SafeAnchor } from "../SafeAnchor/SafeAnchor";
import { actionCreators as ac, actionTypes as at } from "common/Actions.mjs";

export const PersonalizedCard = ({
  dispatch,
  handleDismiss,
  handleClick,
  handleBlock,
  messageData,
}) => {
  const kitFox = "chrome://newtab/content/data/content/assets/kit.png";

  const onDismiss = useCallback(() => {
    handleDismiss();
    handleBlock();
  }, [handleDismiss, handleBlock]);

  const onToggleClick = useCallback(
    elementId => {
      dispatch({ type: at.SHOW_PERSONALIZE });
      dispatch(ac.UserEvent({ event: "SHOW_PERSONALIZE" }));
      handleClick(elementId);
    },
    [dispatch, handleClick]
  );

  return (
    <aside className="personalized-card-wrapper">
      <div className="personalized-card-dismiss">
        <moz-button
          type="icon ghost"
          iconSrc="chrome://global/skin/icons/close.svg"
          onClick={onDismiss}
          data-l10n-id="newtab-card-dismiss-button"
        ></moz-button>
      </div>
      <div className="personalized-card-inner">
        <img src={kitFox} alt="" />
        <h2>{messageData.content.cardTitle}</h2>
        <p>{messageData.content.cardMessage}</p>
        <div className="personalized-card-cta-wrapper">
          <moz-button
            type="primary"
            class="personalized-card-cta"
            onClick={() => onToggleClick("open-personalization-panel")}
          >
            {messageData.content.ctaText}
          </moz-button>
          <SafeAnchor
            className="personalized-card-link"
            dispatch={dispatch}
            url={messageData.content.linkUrl || "https://support.mozilla.org/"}
            onLinkClick={() => {
              handleClick("link-click");
            }}
          >
            {messageData.content.linkText}
          </SafeAnchor>
        </div>
      </div>
    </aside>
  );
};
