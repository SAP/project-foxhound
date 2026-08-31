/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// eslint-disable-next-line no-unused-vars
import React from "react";
import { actionCreators as ac, actionTypes as at } from "common/Actions.mjs";

const USER_ACTION_TYPES = {
  CHANGE_LIVE_MATCH: "change_live_match",
};

// Arrow icons are mirrored under RTL via :dir(rtl) CSS.
function LivePagination({
  dispatch,
  liveIndex,
  liveCount,
  size,
  widgetSize,
  handleInteraction,
}) {
  const buttonSize = size === "medium" ? "small" : undefined;
  const goTo = nextIndex => {
    if (nextIndex === liveIndex) {
      return;
    }
    dispatch(
      ac.OnlyToMain({
        type: at.WIDGETS_USER_EVENT,
        data: {
          widget_name: "sports",
          widget_source: "widget",
          user_action: USER_ACTION_TYPES.CHANGE_LIVE_MATCH,
          action_value: String(nextIndex + 1),
          widget_size: widgetSize,
        },
      })
    );
    dispatch(
      ac.AlsoToMain({
        type: at.WIDGETS_SPORTS_CHANGE_LIVE_INDEX,
        data: nextIndex,
      })
    );
    handleInteraction();
  };
  const goPrev = () => goTo((liveIndex - 1 + liveCount) % liveCount);
  const goNext = () => goTo((liveIndex + 1) % liveCount);

  return (
    <div className="sports-live-pagination" role="group">
      <moz-button
        type="ghost"
        size={buttonSize}
        className="sports-live-pagination-prev"
        iconSrc="chrome://global/skin/icons/arrow-left.svg"
        data-l10n-id="newtab-sports-widget-pagination-previous"
        onClick={goPrev}
      ></moz-button>
      <div className="sports-live-pagination-dots">
        {Array.from({ length: liveCount }, (_, i) => (
          <button
            key={i}
            type="button"
            className={`sports-live-pagination-dot${i === liveIndex ? " is-active" : ""}`}
            aria-current={i === liveIndex ? "true" : undefined}
            data-l10n-id="newtab-sports-widget-pagination-dot"
            data-l10n-args={JSON.stringify({
              index: i + 1,
              total: liveCount,
            })}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
      <moz-button
        type="ghost"
        size={buttonSize}
        className="sports-live-pagination-next"
        iconSrc="chrome://global/skin/icons/arrow-right.svg"
        data-l10n-id="newtab-sports-widget-pagination-next"
        onClick={goNext}
      ></moz-button>
    </div>
  );
}

export { LivePagination };
