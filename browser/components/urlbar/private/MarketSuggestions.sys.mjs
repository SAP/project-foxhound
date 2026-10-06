/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { RealtimeSuggestProvider } from "moz-src:///browser/components/urlbar/private/RealtimeSuggestProvider.sys.mjs";

/**
 * A feature that supports Market suggestions like stocks, indexes, and funds.
 */
export class MarketSuggestions extends RealtimeSuggestProvider {
  get realtimeType() {
    return "market";
  }

  get isSponsored() {
    return false;
  }

  get merinoProvider() {
    return "polygon";
  }

  getViewTemplateForDescriptionTop(_item, index) {
    return [
      {
        name: `name_${index}`,
        tag: "span",
        classList: ["urlbarView-market-name"],
      },
      {
        tag: "span",
        classList: ["urlbarView-realtime-description-separator-dot"],
      },
      {
        name: `ticker_${index}`,
        tag: "span",
      },
    ];
  }

  getViewTemplateForDescriptionBottom(_item, index) {
    return [
      {
        name: `todays_change_perc_${index}`,
        tag: "span",
        classList: ["urlbarView-market-todays-change-perc"],
      },
      {
        tag: "span",
        classList: ["urlbarView-realtime-description-separator-dot"],
      },
      {
        name: `last_price_${index}`,
        tag: "span",
        classList: ["urlbarView-market-last-price"],
      },
      {
        tag: "span",
        classList: ["urlbarView-realtime-description-separator-dot"],
      },
      {
        name: `exchange_${index}`,
        tag: "span",
        classList: ["urlbarView-market-exchange"],
      },
    ];
  }

  getViewUpdateForPayloadItem(item, index) {
    let arrowImageUri;
    let changeDescription;
    let changePercent = parseFloat(item.todays_change_perc);
    if (changePercent < 0) {
      changeDescription = "down";
      arrowImageUri = "chrome://browser/skin/urlbar/market-down.svg";
    } else if (changePercent > 0) {
      changeDescription = "up";
      arrowImageUri = "chrome://browser/skin/urlbar/market-up.svg";
    } else {
      changeDescription = "unchanged";
      arrowImageUri = "chrome://browser/skin/urlbar/market-unchanged.svg";
    }

    let imageUri = item.image_url;
    let isImageAnArrow = false;
    if (!imageUri) {
      isImageAnArrow = true;
      imageUri = arrowImageUri;
    }

    return {
      [`item_${index}`]: {
        attributes: {
          change: changeDescription,
        },
      },
      [`image_container_${index}`]: {
        attributes: {
          "is-arrow": isImageAnArrow ? "" : null,
        },
      },
      [`image_${index}`]: {
        attributes: {
          src: imageUri,
        },
      },
      [`name_${index}`]: {
        textContent: item.name,
      },
      [`ticker_${index}`]: {
        textContent: item.ticker,
      },
      [`todays_change_perc_${index}`]: {
        textContent: `${item.todays_change_perc}%`,
      },
      [`last_price_${index}`]: {
        textContent: item.last_price,
      },
      [`exchange_${index}`]: {
        textContent: item.exchange,
      },
    };
  }
}
