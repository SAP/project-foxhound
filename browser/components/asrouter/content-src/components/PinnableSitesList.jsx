/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React, { useState } from "react";
import { Localized } from "./MSLocalized";
import { MultiStageUtils } from "../lib/multistage-utils.mjs";

// Per-item button states.
const IDLE = "idle";
const PENDING = "pending";
const PINNED = "pinned";

export const PinnableSitesList = ({ tile, messageId, handleAction }) => {
  const items = tile?.data;
  const pinButtonLabel = tile?.pinButtonLabel;
  const [itemStates, setItemStates] = useState(() =>
    Object.fromEntries((items ?? []).map(item => [item.id, IDLE]))
  );

  if (!items?.length) {
    return null;
  }

  const setItemState = (id, state) =>
    setItemStates(prev => ({ ...prev, [id]: state }));

  const handlePin = async (event, item) => {
    setItemState(item.id, PENDING);

    MultiStageUtils.sendActionTelemetry(messageId, item.id, "CLICK_BUTTON");

    const result = await handleAction(event, {
      type: "PIN_TASKBAR_TAB",
      needsAwait: true,
      data: { url: item.url, name: item.name, iconUrl: item.iconUrl },
    });

    let pinResultLabel;
    if (result === true) {
      pinResultLabel = "success";
    } else if (result === null) {
      pinResultLabel = "already_pinned";
    } else {
      pinResultLabel = "failure";
    }
    MultiStageUtils.sendActionTelemetry(messageId, item.id, "PIN_SITE", {
      result: pinResultLabel,
    });

    // Re-enable the button only on explicit failure so the user can retry.
    setItemState(item.id, result === false ? IDLE : PINNED);
  };

  return (
    <ul className="pinnable-sites-list">
      {items.map(item => {
        const nameId = `pinnable-site-name-${item.id}`;
        const state = itemStates[item.id] ?? IDLE;
        const isPendingOrPinned = state === PENDING || state === PINNED;
        return (
          <li key={item.id} className="pinnable-sites-item">
            <img className="pinnable-sites-icon" src={item.iconUrl} alt="" />
            <div className="pinnable-sites-text">
              <Localized text={item.title ?? item.name}>
                <span id={nameId} className="pinnable-sites-name" />
              </Localized>
              {item.description && (
                <Localized text={item.description}>
                  <span className="pinnable-sites-description" />
                </Localized>
              )}
            </div>
            {/* The button is hidden by default and revealed on row :hover /
                :focus-within via CSS; keeping it in the DOM (not conditionally
                rendered) ensures it stays visible and disabled after a
                successful pin. */}
            <button
              className="pinnable-sites-pin-button primary"
              disabled={isPendingOrPinned}
              onClick={e => handlePin(e, item)}
              aria-describedby={nameId}
            >
              {pinButtonLabel && (
                <Localized text={pinButtonLabel}>
                  <span />
                </Localized>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
};
