/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React, { useState, useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { actionCreators as ac } from "common/Actions.mjs";
// eslint-disable-next-line no-shadow
import { CSSTransition } from "react-transition-group";

const PREF_FOLLOWED_SECTIONS = "discoverystream.sections.following";
const PREF_BLOCKED_SECTIONS = "discoverystream.sections.blocked";

/**
 * Transforms a comma-separated string of topics in user preferences
 * into a cleaned-up array.
 *
 * @param pref
 * @returns string[]
 */
// TODO: DRY Issue: Import function from CardSections.jsx?
const getTopics = pref => {
  return pref
    .split(",")
    .map(item => item.trim())
    .filter(item => item);
};

function SectionsMgmtPanel({ exitEventFired }) {
  const [showPanel, setShowPanel] = useState(false); // State management with useState
  const prefs = useSelector(state => state.Prefs.values);
  const layoutComponents = useSelector(
    state => state.DiscoveryStream.layout[0].components
  );
  const sections = useSelector(state => state.DiscoveryStream.feeds.data);
  const dispatch = useDispatch();

  // TODO: Wrap sectionsFeedName -> sectionsList logic in try...catch?
  let sectionsFeedName;

  const cardGridEntry = layoutComponents.find(item => item.type === "CardGrid");

  if (cardGridEntry) {
    sectionsFeedName = cardGridEntry.feed.url;
  }

  let sectionsList;

  if (sectionsFeedName) {
    sectionsList = sections[sectionsFeedName].data.sections;
  }

  const followedSectionsPref = prefs[PREF_FOLLOWED_SECTIONS] || "";
  const blockedSectionsPref = prefs[PREF_BLOCKED_SECTIONS] || "";
  const followedSections = getTopics(followedSectionsPref);
  const blockedSections = getTopics(blockedSectionsPref);

  const [followedSectionsState, setFollowedSectionsState] =
    useState(followedSectionsPref); // State management with useState
  const [blockedSectionsState, setBlockedSectionsState] =
    useState(blockedSectionsPref); // State management with useState

  let followedSectionsData = sectionsList.filter(item =>
    followedSectionsState.includes(item.sectionKey)
  );

  let blockedSectionsData = sectionsList.filter(item =>
    blockedSectionsState.includes(item.sectionKey)
  );

  function updateCachedData() {
    // Reset cached followed/blocked list data while panel is open
    setFollowedSectionsState(followedSectionsPref);
    setBlockedSectionsState(blockedSectionsPref);

    followedSectionsData = sectionsList.filter(item =>
      followedSectionsState.includes(item.sectionKey)
    );

    blockedSectionsData = sectionsList.filter(item =>
      blockedSectionsState.includes(item.sectionKey)
    );
  }

  const onFollowClick = useCallback(
    (sectionKey, receivedRank) => {
      dispatch(
        ac.SetPref(
          PREF_FOLLOWED_SECTIONS,
          [...followedSections, sectionKey].join(", ")
        )
      );
      // Telemetry Event Dispatch
      dispatch(
        ac.OnlyToMain({
          type: "FOLLOW_SECTION",
          data: {
            section: sectionKey,
            section_position: receivedRank,
            event_source: "CUSTOMIZE_PANEL",
          },
        })
      );
    },
    [dispatch, followedSections]
  );

  const onBlockClick = useCallback(
    (sectionKey, receivedRank) => {
      dispatch(
        ac.SetPref(
          PREF_BLOCKED_SECTIONS,
          [...blockedSections, sectionKey].join(", ")
        )
      );

      // Telemetry Event Dispatch
      dispatch(
        ac.OnlyToMain({
          type: "BLOCK_SECTION",
          data: {
            section: sectionKey,
            section_position: receivedRank,
            event_source: "CUSTOMIZE_PANEL",
          },
        })
      );
    },
    [dispatch, blockedSections]
  );

  const onUnblockClick = useCallback(
    (sectionKey, receivedRank) => {
      dispatch(
        ac.SetPref(
          PREF_BLOCKED_SECTIONS,
          [...blockedSections.filter(item => item !== sectionKey)].join(", ")
        )
      );
      // Telemetry Event Dispatch
      dispatch(
        ac.OnlyToMain({
          type: "UNBLOCK_SECTION",
          data: {
            section: sectionKey,
            section_position: receivedRank,
            event_source: "CUSTOMIZE_PANEL",
          },
        })
      );
    },
    [dispatch, blockedSections]
  );

  const onUnfollowClick = useCallback(
    (sectionKey, receivedRank) => {
      dispatch(
        ac.SetPref(
          PREF_FOLLOWED_SECTIONS,
          [...followedSections.filter(item => item !== sectionKey)].join(", ")
        )
      );
      // Telemetry Event Dispatch
      dispatch(
        ac.OnlyToMain({
          type: "UNFOLLOW_SECTION",
          data: {
            section: sectionKey,
            section_position: receivedRank,
            event_source: "CUSTOMIZE_PANEL",
          },
        })
      );
    },
    [dispatch, followedSections]
  );

  // Close followed/blocked topic subpanel when parent menu is closed
  useEffect(() => {
    if (exitEventFired) {
      setShowPanel(false);
    }
  }, [exitEventFired]);

  const togglePanel = () => {
    setShowPanel(prevShowPanel => !prevShowPanel);

    // Fire when the panel is open
    if (!showPanel) {
      updateCachedData();
    }
  };

  const followedSectionsList = followedSectionsData.map(
    ({ sectionKey, title, receivedRank }) => {
      const following = followedSections.includes(sectionKey);

      return (
        <li key={sectionKey}>
          <label htmlFor={`follow-topic-${sectionKey}`}>{title}</label>
          <div
            className={
              following ? "section-follow following" : "section-follow"
            }
          >
            <moz-button
              onClick={() =>
                following
                  ? onUnfollowClick(sectionKey, receivedRank)
                  : onFollowClick(sectionKey, receivedRank)
              }
              type={"default"}
              index={receivedRank}
              section={sectionKey}
              id={`follow-topic-${sectionKey}`}
            >
              <span
                className="section-button-follow-text"
                data-l10n-id="newtab-section-follow-button"
              />
              <span
                className="section-button-following-text"
                data-l10n-id="newtab-section-following-button"
              />
              <span
                className="section-button-unfollow-text"
                data-l10n-id="newtab-section-unfollow-button"
              />
            </moz-button>
          </div>
        </li>
      );
    }
  );

  const blockedSectionsList = blockedSectionsData.map(
    ({ sectionKey, title, receivedRank }) => {
      const blocked = blockedSections.includes(sectionKey);

      return (
        <li key={sectionKey}>
          <label htmlFor={`blocked-topic-${sectionKey}`}>{title}</label>
          <div className={blocked ? "section-block blocked" : "section-block"}>
            <moz-button
              onClick={() =>
                blocked
                  ? onUnblockClick(sectionKey, receivedRank)
                  : onBlockClick(sectionKey, receivedRank)
              }
              type="default"
              index={receivedRank}
              section={sectionKey}
              id={`blocked-topic-${sectionKey}`}
            >
              <span
                className="section-button-block-text"
                data-l10n-id="newtab-section-block-button"
              />
              <span
                className="section-button-blocked-text"
                data-l10n-id="newtab-section-blocked-button"
              />
              <span
                className="section-button-unblock-text"
                data-l10n-id="newtab-section-unblock-button"
              />
            </moz-button>
          </div>
        </li>
      );
    }
  );

  return (
    <div>
      <moz-box-button
        onClick={togglePanel}
        data-l10n-id="newtab-section-manage-topics-button-v2"
      ></moz-box-button>
      <CSSTransition
        in={showPanel}
        timeout={300}
        classNames="sections-mgmt-panel"
        unmountOnExit={true}
      >
        <div className="sections-mgmt-panel">
          <button className="arrow-button" onClick={togglePanel}>
            <h1 data-l10n-id="newtab-section-mangage-topics-title"></h1>
          </button>
          <h3 data-l10n-id="newtab-section-mangage-topics-followed-topics"></h3>
          {followedSectionsData.length ? (
            <ul className="topic-list">{followedSectionsList}</ul>
          ) : (
            <span
              className="topic-list-empty-state"
              data-l10n-id="newtab-section-mangage-topics-followed-topics-empty-state"
            ></span>
          )}
          <h3 data-l10n-id="newtab-section-mangage-topics-blocked-topics"></h3>
          {blockedSectionsData.length ? (
            <ul className="topic-list">{blockedSectionsList}</ul>
          ) : (
            <span
              className="topic-list-empty-state"
              data-l10n-id="newtab-section-mangage-topics-blocked-topics-empty-state"
            ></span>
          )}
        </div>
      </CSSTransition>
    </div>
  );
}

export { SectionsMgmtPanel };
