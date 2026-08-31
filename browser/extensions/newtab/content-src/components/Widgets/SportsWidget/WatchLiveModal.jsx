/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// eslint-disable-next-line no-unused-vars
import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { actionCreators as ac, actionTypes as at } from "common/Actions.mjs";

// Stream URLs come from an untrusted backend, so only allow http(s) through to
// the href; anything else (e.g. javascript:) renders as a non-navigating link.
function safeStreamUrl(url) {
  try {
    return ["http:", "https:"].includes(new URL(url).protocol) ? url : "";
  } catch (e) {
    return "";
  }
}

// Map known backend entitlement strings to localized tag IDs. Anything not in
// this map falls back to the raw string from `stream.entitlement`.
const ENTITLEMENT_L10N_IDS = {
  free: "newtab-sports-widget-watch-stream-free",
  "free trial": "newtab-sports-widget-watch-stream-free-trial",
  "free and paid": "newtab-sports-widget-watch-stream-free-paid",
  paid: "newtab-sports-widget-watch-stream-paid",
  "select games only": "newtab-sports-widget-watch-stream-select-games-only",
};

const WIDGET_NAME = "sports";
const WIDGET_SOURCE = "widget";
const USER_ACTION_TYPES = {
  OPEN: "open",
  DISMISS: "dismiss",
  STREAM_CLICK: "stream_click",
};

function StreamRow({ stream, dispatch, widgetSize }) {
  const entitlementL10nId =
    ENTITLEMENT_L10N_IDS[stream.entitlement?.toLowerCase()];
  const handleClick = () => {
    dispatch(
      ac.OnlyToMain({
        type: at.WIDGETS_USER_EVENT,
        data: {
          widget_name: WIDGET_NAME,
          widget_source: WIDGET_SOURCE,
          user_action: USER_ACTION_TYPES.STREAM_CLICK,
          widget_size: widgetSize,
          action_value: stream.product_name,
        },
      })
    );
  };
  return (
    <li className="watch-live-modal-row">
      <a
        className="watch-live-modal-row-link"
        href={safeStreamUrl(stream.url)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
      >
        <span className="watch-live-modal-row-text">
          <span className="watch-live-modal-product">
            {stream.product_name}
          </span>
          <span
            className="watch-live-modal-entitlement"
            data-l10n-id={entitlementL10nId}
          >
            {stream.entitlement}
          </span>
        </span>
        <span className="watch-live-modal-play" aria-hidden="true" />
      </a>
    </li>
  );
}

function WatchLiveModal({ onClose, dispatch, widgetSize }) {
  const dialogRef = useRef(null);
  const otherRegionsToggleRef = useRef(null);
  const watchLive = useSelector(state => state.SportsWidget.watchLive);
  const loaded = watchLive?.loaded ?? false;
  const data = watchLive?.data ?? null;
  const [otherRegionsExpanded, setOtherRegionsExpanded] = useState(false);

  const handleDismiss = () => {
    dispatch(
      ac.OnlyToMain({
        type: at.WIDGETS_USER_EVENT,
        data: {
          widget_name: WIDGET_NAME,
          widget_source: WIDGET_SOURCE,
          user_action: USER_ACTION_TYPES.DISMISS,
          action_value: "watch_live_modal",
          widget_size: widgetSize,
        },
      })
    );
    onClose();
  };

  // When the user expands Other regions, scroll the toggle to the top of the
  // modal so the just-revealed content below it is visible without an extra
  // manual scroll.
  useEffect(() => {
    if (otherRegionsExpanded) {
      otherRegionsToggleRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [otherRegionsExpanded]);

  useEffect(() => {
    dialogRef.current?.showModal();
    dispatch(ac.AlsoToMain({ type: at.WIDGETS_SPORTS_WATCH_LIVE_REQUEST }));
    dispatch(
      ac.OnlyToMain({
        type: at.WIDGETS_USER_EVENT,
        data: {
          widget_name: WIDGET_NAME,
          widget_source: WIDGET_SOURCE,
          user_action: USER_ACTION_TYPES.OPEN,
          action_value: "watch_live_modal",
          widget_size: widgetSize,
        },
      })
    );
  }, [dispatch, widgetSize]);

  return (
    <dialog
      ref={dialogRef}
      className="watch-live-modal-dialog"
      aria-labelledby="watch-live-modal-title"
      onCancel={e => {
        e.preventDefault();
        handleDismiss();
      }}
      onClick={e => {
        if (e.target === dialogRef.current) {
          handleDismiss();
        }
      }}
    >
      <div className="watch-live-modal-content">
        <header className="watch-live-modal-header">
          <h2
            id="watch-live-modal-title"
            className="watch-live-modal-title"
            data-l10n-id="newtab-sports-widget-watch-available-region"
          />
          <moz-button
            className="watch-live-modal-close"
            type="icon ghost"
            iconSrc="chrome://global/skin/icons/close.svg"
            onClick={handleDismiss}
            data-l10n-id="newtab-sports-widget-watch-dialog-close"
          />
        </header>
        <div className="watch-live-modal-scroll">
          {!loaded && (
            <div className="watch-live-modal-loading" aria-busy="true" />
          )}
          {loaded && data && (
            <>
              <ul className="watch-live-modal-list">
                {data.your_region?.map(stream => (
                  <StreamRow
                    key={stream.url}
                    stream={stream}
                    dispatch={dispatch}
                    widgetSize={widgetSize}
                  />
                ))}
              </ul>
              <hr className="watch-live-modal-separator" />
              <button
                ref={otherRegionsToggleRef}
                type="button"
                className="watch-live-modal-other-regions-toggle"
                aria-expanded={otherRegionsExpanded}
                onClick={() => setOtherRegionsExpanded(v => !v)}
              >
                <span data-l10n-id="newtab-sports-widget-watch-available-other-regions" />
                <img
                  className="watch-live-modal-chevron"
                  src={`chrome://global/skin/icons/arrow-${otherRegionsExpanded ? "up" : "down"}.svg`}
                  alt=""
                />
              </button>
              {otherRegionsExpanded && (
                <div className="watch-live-modal-other-regions">
                  {data.other_regions?.map(region => (
                    <section
                      key={region.country_code}
                      className="watch-live-modal-region"
                    >
                      <h3 className="watch-live-modal-region-title">
                        {region.country_code}
                      </h3>
                      <ul className="watch-live-modal-list">
                        {region.streams.map(stream => (
                          <StreamRow
                            key={stream.url}
                            stream={stream}
                            dispatch={dispatch}
                            widgetSize={widgetSize}
                          />
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}

export { WatchLiveModal };
