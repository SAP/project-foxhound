/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React, { useCallback } from "react";
import { useDispatch } from "react-redux";
import { actionCreators as ac, actionTypes as at } from "common/Actions.mjs";
import { useIntersectionObserver } from "../../../lib/utils";

const PREF_PROMO_CARD_DISMISSED = "discoverystream.promoCard.visible";

/**
 * The PromoCard component displays a promotional message.
 * It is used next to the AdBanner component in a four-column layout.
 */

const PromoCard = () => {
  const dispatch = useDispatch();

  const onCtaClick = useCallback(() => {
    dispatch(
      ac.AlsoToMain({
        type: at.PROMO_CARD_CLICK,
      })
    );
  }, [dispatch]);

  const onDismissClick = useCallback(() => {
    dispatch(
      ac.AlsoToMain({
        type: at.PROMO_CARD_DISMISS,
      })
    );
    dispatch(ac.SetPref(PREF_PROMO_CARD_DISMISSED, false));
  }, [dispatch]);

  const handleIntersection = useCallback(() => {
    dispatch(
      ac.AlsoToMain({
        type: at.PROMO_CARD_IMPRESSION,
      })
    );
  }, [dispatch]);

  const ref = useIntersectionObserver(handleIntersection);

  return (
    <div
      className="promo-card-wrapper"
      ref={el => {
        ref.current = [el];
      }}
    >
      <div className="promo-card-dismiss-button">
        <moz-button
          type="icon ghost"
          size="small"
          data-l10n-id="newtab-promo-card-dismiss-button"
          iconsrc="chrome://global/skin/icons/close.svg"
          onClick={onDismissClick}
          onKeyDown={onDismissClick}
        />
      </div>
      <div className="promo-card-inner">
        <div className="img-wrapper">
          <img
            src="chrome://newtab/content/data/content/assets/puzzle-fox.svg"
            alt=""
          />
        </div>
        <span
          className="promo-card-title"
          data-l10n-id="newtab-promo-card-title"
        />
        <span
          className="promo-card-body"
          data-l10n-id="newtab-promo-card-body"
        />
        <span className="promo-card-cta-wrapper">
          <a
            href="https://support.mozilla.org/kb/sponsor-privacy"
            data-l10n-id="newtab-promo-card-cta"
            target="_blank"
            rel="noreferrer"
            onClick={onCtaClick}
          ></a>
        </span>
      </div>
    </div>
  );
};

export { PromoCard };
