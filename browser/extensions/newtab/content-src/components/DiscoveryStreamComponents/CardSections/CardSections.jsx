/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import { DSEmptyState } from "../DSEmptyState/DSEmptyState";
import { DSCard, PlaceholderDSCard } from "../DSCard/DSCard";
import { useSelector } from "react-redux";
import { actionCreators as ac, actionTypes as at } from "common/Actions.mjs";
import {
  useIntersectionObserver,
  getActiveColumnLayout,
  getNovaColumnLayout,
} from "../../../lib/utils";
import { shouldShowOMCHighlight } from "../../../lib/asrouter-message-utils.mjs";
import { SectionContextMenu } from "../SectionContextMenu/SectionContextMenu";
import { SectionFollowButton } from "../SectionFollowButton/SectionFollowButton";
import { InterestPicker } from "../InterestPicker/InterestPicker";
// @nova-cleanup(move-directory): Update import path after NovaInterestPicker moves to InterestPicker/
import { InterestPicker as NovaInterestPicker } from "content-src/components/Nova/InterestPicker/InterestPicker";
import { AdBanner } from "../AdBanner/AdBanner.jsx";
import { PersonalizedCard } from "../PersonalizedCard/PersonalizedCard";
import { FollowSectionButtonHighlight } from "../FeatureHighlight/FollowSectionButtonHighlight";
import { MessageWrapper } from "content-src/components/MessageWrapper/MessageWrapper";
import { BriefingCard } from "../BriefingCard/BriefingCard.jsx";

// Prefs
const PREF_SECTIONS_CARDS_ENABLED = "discoverystream.sections.cards.enabled";
const PREF_SECTIONS_PERSONALIZATION_ENABLED =
  "discoverystream.sections.personalization.enabled";
const PREF_TOPICS_ENABLED = "discoverystream.topicLabels.enabled";
const PREF_TOPICS_SELECTED = "discoverystream.topicSelection.selectedTopics";
const PREF_TOPICS_AVAILABLE = "discoverystream.topicSelection.topics";
const PREF_INTEREST_PICKER_ENABLED =
  "discoverystream.sections.interestPicker.enabled";
const PREF_VISIBLE_SECTIONS =
  "discoverystream.sections.interestPicker.visibleSections";
const PREF_BILLBOARD_ENABLED = "newtabAdSize.billboard";
const PREF_BILLBOARD_POSITION = "newtabAdSize.billboard.position";
const PREF_LEADERBOARD_ENABLED = "newtabAdSize.leaderboard";
const PREF_LEADERBOARD_POSITION = "newtabAdSize.leaderboard.position";
const PREF_INFERRED_PERSONALIZATION_USER =
  "discoverystream.sections.personalization.inferred.user.enabled";
const PREF_DAILY_BRIEF_SECTIONID = "discoverystream.dailyBrief.sectionId";
const PREF_DAILY_BRIEF_ENABLED = "discoverystream.dailyBrief.enabled";
const PREF_SPOCS_STARTUPCACHE_ENABLED =
  "discoverystream.spocs.startupCache.enabled";
// @nova-cleanup(remove-pref): Remove PREF_NOVA_ENABLED
const PREF_NOVA_ENABLED = "nova.enabled";

// Feed URL
const CURATED_RECOMMENDATIONS_FEED_URL =
  "https://merino.services.mozilla.com/api/v1/curated-recommendations";

// Divides evenly by 2, 3, and 4 to avoid orphan cards in any column layout.
const DEFAULT_MAX_TILES = 12;

function getLayoutData(responsiveLayouts, index) {
  let layoutData = {
    classNames: [],
    imageSizes: {},
    cardPositions: {},
    allowsWidget: false,
  };

  responsiveLayouts.forEach(layout => {
    layout.tiles.forEach((tile, tileIndex) => {
      if (tile.position === index) {
        layoutData.classNames.push(`col-${layout.columnCount}-${tile.size}`);
        layoutData.classNames.push(
          `col-${layout.columnCount}-position-${tileIndex}`
        );
        layoutData.imageSizes[layout.columnCount] = tile.size;
        layoutData.cardPositions[layout.columnCount] = tileIndex;

        if (tile.allowsWidget) {
          layoutData.allowsWidget = true;
        }

        // The API tells us whether the tile should show the excerpt or not.
        // Apply extra styles accordingly.
        if (tile.hasExcerpt) {
          if (tile.size === "medium") {
            layoutData.classNames.push(
              `col-${layout.columnCount}-hide-excerpt`
            );
          } else {
            layoutData.classNames.push(
              `col-${layout.columnCount}-show-excerpt`
            );
          }
        } else {
          layoutData.classNames.push(`col-${layout.columnCount}-hide-excerpt`);
        }
      }
    });
  });

  return layoutData;
}

// function to determine amount of tiles shown per section per viewport
function getMaxTiles(responsiveLayouts) {
  return (
    responsiveLayouts
      .flatMap(responsiveLayout => responsiveLayout)
      .reduce((max, t) => Math.max(max, t.tiles.length), 0) || DEFAULT_MAX_TILES
  );
}

/**
 * Transforms a comma-separated string in user preferences
 * into a cleaned-up array.
 *
 * @param {string} pref - The comma-separated pref to be converted.
 * @returns {string[]} An array of trimmed strings, excluding empty values.
 */

const prefToArray = (pref = "") => {
  return pref
    .split(",")
    .map(item => item.trim())
    .filter(item => item);
};

function CardSection({
  sectionPosition,
  section,
  dispatch,
  type,
  ctaButtonVariant,
  ctaButtonSponsors,
  anySectionsFollowed,
  spocsLoading,
  activeColumnLayout,
  syncLayoutOnFocus,
  gridRef,
}) {
  const prefs = useSelector(state => state.Prefs.values);

  const Messages = useSelector(state => state.Messages);
  const { messageData } = Messages;

  const { sectionPersonalization, feeds } = useSelector(
    state => state.DiscoveryStream
  );
  const { isForStartupCache } = useSelector(state => state.App);

  const [focusedPosition, setFocusedPosition] = useState(0);

  const onCardFocus = position => {
    setFocusedPosition(position);
  };

  const handleCardKeyDown = e => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();

      const currentCardEl = e.target.closest("article.ds-card");
      if (!currentCardEl) {
        return;
      }

      // Arrow direction should match visual navigation direction in RTL
      const isRTL = document.dir === "rtl";
      const navigateToPrevious = isRTL
        ? e.key === "ArrowRight"
        : e.key === "ArrowLeft";

      // Extract current position from classList
      let currentPosition = null;
      const positionPrefix = `${activeColumnLayout}-position-`;
      for (let className of currentCardEl.classList) {
        if (className.startsWith(positionPrefix)) {
          currentPosition = parseInt(
            className.substring(positionPrefix.length),
            10
          );
          break;
        }
      }

      if (currentPosition === null) {
        return;
      }

      const targetPosition = navigateToPrevious
        ? currentPosition - 1
        : currentPosition + 1;

      // Find card with target position
      const parentEl = currentCardEl.parentElement;
      if (parentEl) {
        const targetSelector = `article.ds-card.${activeColumnLayout}-position-${targetPosition}`;
        const targetCardEl = parentEl.querySelector(targetSelector);

        if (targetCardEl) {
          const link = targetCardEl.querySelector("a.ds-card-link");
          if (link) {
            link.focus();
          }
        }
      }
    }
  };

  const showTopics = prefs[PREF_TOPICS_ENABLED];
  const mayHaveSectionsCards = prefs[PREF_SECTIONS_CARDS_ENABLED];
  const selectedTopics = prefs[PREF_TOPICS_SELECTED];
  const availableTopics = prefs[PREF_TOPICS_AVAILABLE];
  const spocsStartupCacheEnabled = prefs[PREF_SPOCS_STARTUPCACHE_ENABLED];
  const dailyBriefEnabled =
    prefs.trainhopConfig?.dailyBriefing?.enabled ||
    prefs[PREF_DAILY_BRIEF_ENABLED];
  const dailyBriefSectionId =
    prefs.trainhopConfig?.dailyBriefing?.sectionId ||
    prefs[PREF_DAILY_BRIEF_SECTIONID];

  const mayHaveSectionsPersonalization =
    prefs[PREF_SECTIONS_PERSONALIZATION_ENABLED];
  // @nova-cleanup(remove-conditional): Remove novaEnabled, always use Nova layout
  const novaEnabled = prefs[PREF_NOVA_ENABLED];

  const { sectionKey, title, subtitle, followable } = section;
  const { responsiveLayouts, name: layoutName } = section.layout;

  const following = sectionPersonalization[sectionKey]?.isFollowed;

  const handleIntersection = useCallback(() => {
    dispatch(
      ac.AlsoToMain({
        type: at.CARD_SECTION_IMPRESSION,
        data: {
          section: sectionKey,
          section_position: sectionPosition,
          is_section_followed: following,
          layout_name: layoutName,
        },
      })
    );
  }, [dispatch, sectionKey, sectionPosition, following, layoutName]);

  // Ref to hold the section element
  const sectionRefs = useIntersectionObserver(handleIntersection);

  const onFollowClick = useCallback(() => {
    const updatedSectionData = {
      ...sectionPersonalization,
      [sectionKey]: {
        isFollowed: true,
        isBlocked: false,
        followedAt: new Date().toISOString(),
      },
    };
    dispatch(
      ac.AlsoToMain({
        type: at.SECTION_PERSONALIZATION_SET,
        data: updatedSectionData,
      })
    );
    // Telemetry Event Dispatch
    dispatch(
      ac.OnlyToMain({
        type: "FOLLOW_SECTION",
        data: {
          section: sectionKey,
          section_position: sectionPosition,
          event_source: "MOZ_BUTTON",
        },
      })
    );
    dispatch(
      ac.OnlyToOneContent(
        {
          type: at.SHOW_TOAST_MESSAGE,
          data: {
            toastId: "followSectionToast",
            showNotifications: true,
            toastData: { l10nId: "newtab-section-toast-follow", topic: title },
          },
        },
        "ActivityStream:Content"
      )
    );
  }, [dispatch, sectionPersonalization, sectionKey, sectionPosition, title]);

  const onUnfollowClick = useCallback(() => {
    const updatedSectionData = { ...sectionPersonalization };
    delete updatedSectionData[sectionKey];
    dispatch(
      ac.AlsoToMain({
        type: at.SECTION_PERSONALIZATION_SET,
        data: updatedSectionData,
      })
    );

    // Telemetry Event Dispatch
    dispatch(
      ac.OnlyToMain({
        type: "UNFOLLOW_SECTION",
        data: {
          section: sectionKey,
          section_position: sectionPosition,
          event_source: "MOZ_BUTTON",
        },
      })
    );
    dispatch(
      ac.OnlyToOneContent(
        {
          type: at.SHOW_TOAST_MESSAGE,
          data: {
            toastId: "unfollowSectionToast",
            showNotifications: true,
            toastData: {
              l10nId: "newtab-section-toast-unfollow",
              topic: title,
            },
          },
        },
        "ActivityStream:Content"
      )
    );
  }, [dispatch, sectionPersonalization, sectionKey, sectionPosition, title]);

  let maxTile = DEFAULT_MAX_TILES;
  if (!spocsLoading) {
    maxTile = getMaxTiles(responsiveLayouts);
  }

  const shouldShowBriefingCard =
    sectionKey === dailyBriefSectionId && dailyBriefEnabled;

  const getBriefingData = () => {
    const EMPTY_BRIEFING = { headlines: [], lastUpdated: null };

    if (!shouldShowBriefingCard) {
      return EMPTY_BRIEFING;
    }

    const sections = feeds?.data[CURATED_RECOMMENDATIONS_FEED_URL];
    if (!sections) {
      return EMPTY_BRIEFING;
    }

    const headlines = sections.data.recommendations.filter(
      rec => rec.section === dailyBriefSectionId && rec.isHeadline
    );
    return { headlines, lastUpdated: sections.lastUpdated };
  };

  const { headlines: briefingHeadlines, lastUpdated: briefingLastUpdated } =
    getBriefingData();
  const hasBriefingHeadlines = briefingHeadlines.length === 3;

  const displaySections = section.data.slice(0, maxTile);
  const isSectionEmpty = !displaySections?.length;
  const shouldShowLabels = sectionKey === dailyBriefSectionId && showTopics;

  if (isSectionEmpty) {
    return null;
  }

  function buildCards() {
    const cards = [];
    let dataIndex = 0;
    const activeColumnCount = parseInt(
      activeColumnLayout.replace("col-", ""),
      10
    );
    const activeFocusPositions = [];

    for (let position = 0; position < maxTile; position++) {
      const layoutData = getLayoutData(responsiveLayouts, position);
      const { classNames, imageSizes, cardPositions } = layoutData;
      const shouldRenderWidget =
        shouldShowBriefingCard &&
        layoutData.allowsWidget &&
        hasBriefingHeadlines;

      if (shouldRenderWidget) {
        cards.push(
          <BriefingCard
            key="briefing-card"
            sectionClassNames={classNames.join(" ")}
            headlines={briefingHeadlines}
            lastUpdated={briefingLastUpdated}
            selectedTopics={selectedTopics}
            isFollowed={following}
          />
        );
        continue;
      }

      if (dataIndex >= displaySections.length) {
        break;
      }
      const rec = displaySections[dataIndex];
      const currentIndex = dataIndex;
      const mappedFocusPosition = cardPositions[activeColumnCount];
      // Fall back to card order when this layout does not define a mapped position.
      const activeFocusPosition = Number.isInteger(mappedFocusPosition)
        ? mappedFocusPosition
        : currentIndex;

      // Render a placeholder card when:
      // 1. No recommendation is available.
      // 2. The item is flagged as a placeholder.
      // 3. Spocs are loading for with spocs startup cache disabled.
      const isPlaceholder =
        !rec ||
        rec.placeholder ||
        spocsLoading ||
        (rec.flight_id &&
          !spocsStartupCacheEnabled &&
          isForStartupCache.DiscoveryStream);

      if (isPlaceholder) {
        cards.push(<PlaceholderDSCard key={`dscard-${currentIndex}`} />);
      } else {
        activeFocusPositions.push(activeFocusPosition);
        cards.push({
          isDSCard: true,
          key: `dscard-${rec.id}`,
          rec,
          classNames,
          imageSizes,
          activeFocusPosition,
        });
      }
      dataIndex++;
    }

    const uniqueFocusPositions = [...new Set(activeFocusPositions)].sort(
      (a, b) => a - b
    );
    const activeRovingIndex = uniqueFocusPositions.includes(focusedPosition)
      ? focusedPosition
      : uniqueFocusPositions[0];

    return cards.map(card => {
      if (!card.isDSCard) {
        return card;
      }

      const { rec, classNames, imageSizes, activeFocusPosition } = card;

      return (
        <DSCard
          key={card.key}
          pos={rec.pos}
          flightId={rec.flight_id}
          image_src={rec.image_src}
          raw_image_src={rec.raw_image_src}
          icon_src={rec.icon_src}
          word_count={rec.word_count}
          time_to_read={rec.time_to_read}
          title={rec.title}
          topic={rec.topic}
          features={rec.features}
          excerpt={rec.excerpt}
          url={rec.url}
          id={rec.id}
          shim={rec.shim}
          type={type}
          context={rec.context}
          sponsor={rec.sponsor}
          sponsored_by_override={rec.sponsored_by_override}
          dispatch={dispatch}
          source={rec.domain}
          publisher={rec.publisher}
          pocket_id={rec.pocket_id}
          context_type={rec.context_type}
          bookmarkGuid={rec.bookmarkGuid}
          recommendation_id={rec.recommendation_id}
          corpus_item_id={rec.corpus_item_id}
          scheduled_corpus_item_id={rec.scheduled_corpus_item_id}
          recommended_at={rec.recommended_at}
          received_rank={rec.received_rank}
          format={rec.format}
          alt_text={rec.alt_text}
          mayHaveSectionsCards={mayHaveSectionsCards}
          showTopics={shouldShowLabels}
          selectedTopics={selectedTopics}
          availableTopics={availableTopics}
          ctaButtonSponsors={ctaButtonSponsors}
          ctaButtonVariant={ctaButtonVariant}
          sectionsClassNames={classNames.join(" ")}
          sectionsCardImageSizes={imageSizes}
          section={sectionKey}
          sectionPosition={sectionPosition}
          sectionFollowed={following}
          sectionLayoutName={layoutName}
          isTimeSensitive={rec.isTimeSensitive}
          tabIndex={activeFocusPosition === activeRovingIndex ? 0 : -1}
          onFocus={() => onCardFocus(activeFocusPosition)}
          attribution={rec.attribution}
          isDailyBrief={shouldShowBriefingCard}
        />
      );
    });
  }

  const cards = buildCards();

  const sectionContextWrapper = (
    <div className="section-context-wrapper">
      <div
        className={following ? "section-follow following" : "section-follow"}
      >
        {followable !== false &&
          !anySectionsFollowed &&
          sectionPosition === 0 &&
          shouldShowOMCHighlight(Messages, "FollowSectionButtonHighlight") && (
            <MessageWrapper dispatch={dispatch}>
              <FollowSectionButtonHighlight
                verticalPosition="inset-block-center"
                position="arrow-inline-start"
                dispatch={dispatch}
                feature="FEATURE_FOLLOW_SECTION_BUTTON"
                messageData={messageData}
              />
            </MessageWrapper>
          )}
        {followable !== false &&
          !anySectionsFollowed &&
          sectionPosition === 0 &&
          shouldShowOMCHighlight(
            Messages,
            "FollowSectionButtonAltHighlight"
          ) && (
            <MessageWrapper dispatch={dispatch}>
              <FollowSectionButtonHighlight
                verticalPosition="inset-block-center"
                position="arrow-inline-start"
                dispatch={dispatch}
                feature="FEATURE_ALT_FOLLOW_SECTION_BUTTON"
              />
            </MessageWrapper>
          )}
        {followable !== false && (
          <moz-button
            onClick={following ? onUnfollowClick : onFollowClick}
            type="default"
            index={sectionPosition}
            section={sectionKey}
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
        )}
      </div>
      <SectionContextMenu
        dispatch={dispatch}
        index={sectionPosition}
        following={following}
        sectionPersonalization={sectionPersonalization}
        sectionKey={sectionKey}
        title={title}
        type={type}
        sectionPosition={sectionPosition}
        learnMoreUrl={prefs["sectionsLearnMore.url"]}
      />
    </div>
  );
  return (
    <section
      className="ds-section"
      ref={el => {
        sectionRefs.current[0] = el;
      }}
    >
      <div className="section-heading">
        <div className="section-title-wrapper">
          <h2 className="section-title">{title}</h2>
          {mayHaveSectionsPersonalization &&
            novaEnabled &&
            followable !== false && (
              <SectionFollowButton
                following={following}
                onFollowClick={onFollowClick}
                onUnfollowClick={onUnfollowClick}
                title={title}
              />
            )}
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
        </div>
        {mayHaveSectionsPersonalization &&
          (novaEnabled ? (
            <SectionContextMenu
              dispatch={dispatch}
              index={sectionPosition}
              following={following}
              sectionPersonalization={sectionPersonalization}
              sectionKey={sectionKey}
              title={title}
              type={type}
              sectionPosition={sectionPosition}
              buttonType="ghost"
              learnMoreUrl={prefs["sectionsLearnMore.url"]}
            />
          ) : (
            sectionContextWrapper
          ))}
      </div>
      <div
        ref={gridRef}
        className={`ds-section-grid ds-card-grid`}
        onFocusCapture={syncLayoutOnFocus}
        onKeyDown={handleCardKeyDown}
      >
        {cards}
      </div>
    </section>
  );
}

function CardSections({
  data,
  feed,
  dispatch,
  type,
  ctaButtonVariant,
  ctaButtonSponsors,
  spocsLoading,
}) {
  const prefs = useSelector(state => state.Prefs.values);
  const { spocs, sectionPersonalization } = useSelector(
    state => state.DiscoveryStream
  );
  const Messages = useSelector(state => state.Messages);
  const { messageData } = Messages;
  const personalizationEnabled = prefs[PREF_SECTIONS_PERSONALIZATION_ENABLED];
  const interestPickerEnabled = prefs[PREF_INTEREST_PICKER_ENABLED];
  // @nova-cleanup(remove-conditional): Remove novaEnabled check once classic path is gone
  const novaEnabled = prefs[PREF_NOVA_ENABLED];
  const gridRef = useRef(null);
  const [activeColumnLayout, setActiveColumnLayout] = useState(() =>
    getActiveColumnLayout(window.innerWidth)
  );

  useLayoutEffect(() => {
    if (!novaEnabled || !gridRef.current) {
      return;
    }
    const columnLayout = getNovaColumnLayout(gridRef.current);
    if (columnLayout) {
      setActiveColumnLayout(columnLayout);
    }
  }, [novaEnabled]);

  const syncLayoutOnFocus = useCallback(
    e => {
      let nextLayout = getActiveColumnLayout(window.innerWidth);
      if (novaEnabled) {
        nextLayout = getNovaColumnLayout(e.currentTarget);
      }
      setActiveColumnLayout(currLayout =>
        currLayout === nextLayout ? currLayout : nextLayout
      );
    },
    [novaEnabled]
  );

  // Handle a render before feed has been fetched by displaying nothing
  if (!data) {
    return null;
  }

  const visibleSections = prefToArray(prefs[PREF_VISIBLE_SECTIONS]);
  const { interestPicker } = data;

  // Used to determine if we should show FollowSectionButtonHighlight
  const anySectionsFollowed =
    sectionPersonalization &&
    Object.values(sectionPersonalization).some(section => section?.isFollowed);

  let sectionsData = data.sections;

  if (spocsLoading) {
    // To clean up the placeholder state for sections if the whole section is loading still.
    sectionsData = [
      {
        ...sectionsData[0],
        title: "",
        subtitle: "",
      },
      {
        ...sectionsData[1],
        title: "",
        subtitle: "",
      },
    ];
  }

  let filteredSections = sectionsData.filter(
    section => !sectionPersonalization[section.sectionKey]?.isBlocked
  );

  if (interestPickerEnabled && visibleSections.length) {
    filteredSections = visibleSections.reduce((acc, visibleSection) => {
      const found = filteredSections.find(
        ({ sectionKey }) => sectionKey === visibleSection
      );
      if (found) {
        acc.push(found);
      }
      return acc;
    }, []);
  }

  let sectionsToRender = filteredSections.map((section, sectionPosition) => (
    <CardSection
      key={`section-${section.sectionKey}`}
      sectionPosition={sectionPosition}
      section={section}
      dispatch={dispatch}
      type={type}
      ctaButtonVariant={ctaButtonVariant}
      ctaButtonSponsors={ctaButtonSponsors}
      anySectionsFollowed={anySectionsFollowed}
      spocsLoading={spocsLoading}
      activeColumnLayout={activeColumnLayout}
      syncLayoutOnFocus={syncLayoutOnFocus}
      gridRef={sectionPosition === 0 ? gridRef : undefined}
    />
  ));

  // Add a billboard/leaderboard IAB ad to the sectionsToRender array (if enabled/possible).
  const billboardEnabled = prefs[PREF_BILLBOARD_ENABLED];
  const leaderboardEnabled = prefs[PREF_LEADERBOARD_ENABLED];

  if (
    (billboardEnabled || leaderboardEnabled) &&
    spocs?.data?.newtab_spocs?.items
  ) {
    const spocToRender =
      spocs.data.newtab_spocs.items.find(
        ({ format }) => format === "leaderboard" && leaderboardEnabled
      ) ||
      spocs.data.newtab_spocs.items.find(
        ({ format }) => format === "billboard" && billboardEnabled
      );

    if (spocToRender && !spocs.blocked.includes(spocToRender.url)) {
      const row =
        spocToRender.format === "leaderboard"
          ? prefs[PREF_LEADERBOARD_POSITION]
          : prefs[PREF_BILLBOARD_POSITION];

      sectionsToRender.splice(
        // Math.min is used here to ensure the given row stays within the bounds of the sectionsToRender array.
        Math.min(sectionsToRender.length - 1, row),
        0,
        <AdBanner
          spoc={spocToRender}
          key={`dscard-${spocToRender.id}`}
          dispatch={dispatch}
          type={type}
          row={row}
          prefs={prefs}
        />
      );
    }
  }

  // Add the interest picker to the sectionsToRender array (if enabled/possible).
  if (
    interestPickerEnabled &&
    personalizationEnabled &&
    interestPicker?.sections
  ) {
    const index = interestPicker.receivedFeedRank - 1;

    // @nova-cleanup(remove-conditional): Remove novaEnabled check, always use NovaInterestPicker
    const InterestPickerComponent = novaEnabled
      ? NovaInterestPicker
      : InterestPicker;
    sectionsToRender.splice(
      // Math.min is used here to ensure the given row stays within the bounds of the sectionsToRender array.
      Math.min(sectionsToRender.length - 1, index),
      0,
      <InterestPickerComponent
        title={interestPicker.title}
        subtitle={interestPicker.subtitle}
        interests={interestPicker.sections || []}
        receivedFeedRank={interestPicker.receivedFeedRank}
      />
    );
  }

  function displayP13nCard() {
    if (messageData && Object.keys(messageData).length >= 1) {
      if (
        shouldShowOMCHighlight(Messages, "PersonalizedCard") &&
        prefs[PREF_INFERRED_PERSONALIZATION_USER]
      ) {
        const row = messageData.content.position;
        sectionsToRender.splice(
          row,
          0,
          <MessageWrapper dispatch={dispatch} onDismiss={() => {}}>
            <PersonalizedCard
              position={row}
              dispatch={dispatch}
              messageData={messageData}
            />
          </MessageWrapper>
        );
      }
    }
  }

  displayP13nCard();

  const isEmpty = sectionsToRender.length === 0;

  return isEmpty ? (
    <div className="ds-card-grid empty">
      <DSEmptyState status={data.status} dispatch={dispatch} feed={feed} />
    </div>
  ) : (
    <div className="ds-section-wrapper">{sectionsToRender}</div>
  );
}

export { CardSections };
