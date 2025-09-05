/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import React, { useCallback } from "react";
import { DSEmptyState } from "../DSEmptyState/DSEmptyState";
import { DSCard, PlaceholderDSCard } from "../DSCard/DSCard";
import { useSelector } from "react-redux";
import { actionCreators as ac, actionTypes as at } from "common/Actions.mjs";
import { useIntersectionObserver } from "../../../lib/utils";
import { SectionContextMenu } from "../SectionContextMenu/SectionContextMenu";
import { InterestPicker } from "../InterestPicker/InterestPicker";

// Prefs
const PREF_SECTIONS_CARDS_ENABLED = "discoverystream.sections.cards.enabled";
const PREF_SECTIONS_CARDS_THUMBS_UP_DOWN_ENABLED =
  "discoverystream.sections.cards.thumbsUpDown.enabled";
const PREF_SECTIONS_PERSONALIZATION_ENABLED =
  "discoverystream.sections.personalization.enabled";
const PREF_TOPICS_ENABLED = "discoverystream.topicLabels.enabled";
const PREF_TOPICS_SELECTED = "discoverystream.topicSelection.selectedTopics";
const PREF_FOLLOWED_SECTIONS = "discoverystream.sections.following";
const PREF_BLOCKED_SECTIONS = "discoverystream.sections.blocked";
const PREF_TOPICS_AVAILABLE = "discoverystream.topicSelection.topics";
const PREF_THUMBS_UP_DOWN_ENABLED = "discoverystream.thumbsUpDown.enabled";
const PREF_INTEREST_PICKER_ENABLED =
  "discoverystream.sections.interestPicker.enabled";
const PREF_VISIBLE_SECTIONS =
  "discoverystream.sections.interestPicker.visibleSections";

function getLayoutData(responsiveLayouts, index) {
  let layoutData = {
    classNames: [],
    imageSizes: {},
  };

  responsiveLayouts.forEach(layout => {
    layout.tiles.forEach((tile, tileIndex) => {
      if (tile.position === index) {
        layoutData.classNames.push(`col-${layout.columnCount}-${tile.size}`);
        layoutData.classNames.push(
          `col-${layout.columnCount}-position-${tileIndex}`
        );
        layoutData.imageSizes[layout.columnCount] = tile.size;

        // The API tells us whether the tile should show the excerpt or not.
        // Apply extra styles accordingly.
        if (tile.hasExcerpt) {
          layoutData.classNames.push(`col-${layout.columnCount}-show-excerpt`);
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
  return responsiveLayouts
    .flatMap(responsiveLayout => responsiveLayout)
    .reduce((acc, t) => {
      acc[t.columnCount] = t.tiles.length;

      // Update maxTile if current tile count is greater
      if (!acc.maxTile || t.tiles.length > acc.maxTile) {
        acc.maxTile = t.tiles.length;
      }
      return acc;
    }, {});
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
  firstVisibleTimestamp,
  is_collection,
  spocMessageVariant,
  ctaButtonVariant,
  ctaButtonSponsors,
}) {
  const prefs = useSelector(state => state.Prefs.values);
  const showTopics = prefs[PREF_TOPICS_ENABLED];
  const mayHaveSectionsCards = prefs[PREF_SECTIONS_CARDS_ENABLED];
  const mayHaveSectionsCardsThumbsUpDown =
    prefs[PREF_SECTIONS_CARDS_THUMBS_UP_DOWN_ENABLED];
  const mayHaveThumbsUpDown = prefs[PREF_THUMBS_UP_DOWN_ENABLED];
  const selectedTopics = prefs[PREF_TOPICS_SELECTED];
  const availableTopics = prefs[PREF_TOPICS_AVAILABLE];
  const followedSectionsPref = prefs[PREF_FOLLOWED_SECTIONS] || "";
  const blockedSectionsPref = prefs[PREF_BLOCKED_SECTIONS] || "";

  const { saveToPocketCard } = useSelector(state => state.DiscoveryStream);
  const mayHaveSectionsPersonalization =
    prefs[PREF_SECTIONS_PERSONALIZATION_ENABLED];

  const { sectionKey, title, subtitle } = section;
  const { responsiveLayouts } = section.layout;

  const followedSections = prefToArray(followedSectionsPref);
  const following = followedSections.includes(sectionKey);
  const blockedSections = prefToArray(blockedSectionsPref);

  const handleIntersection = useCallback(() => {
    dispatch(
      ac.AlsoToMain({
        type: at.CARD_SECTION_IMPRESSION,
        data: {
          section: sectionKey,
          section_position: sectionPosition,
          is_secton_followed: following,
        },
      })
    );
  }, [dispatch, sectionKey, sectionPosition, following]);

  // Ref to hold the section element
  const sectionRefs = useIntersectionObserver(handleIntersection);

  // Only show thumbs up/down buttons if both default thumbs and sections thumbs prefs are enabled
  const mayHaveCombinedThumbsUpDown =
    mayHaveSectionsCardsThumbsUpDown && mayHaveThumbsUpDown;

  const onFollowClick = useCallback(() => {
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
          section_position: sectionPosition,
          event_source: "MOZ_BUTTON",
        },
      })
    );
  }, [dispatch, followedSections, sectionKey, sectionPosition]);

  const onUnfollowClick = useCallback(() => {
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
          section_position: sectionPosition,
          event_source: "MOZ_BUTTON",
        },
      })
    );
  }, [dispatch, followedSections, sectionKey, sectionPosition]);

  const { maxTile } = getMaxTiles(responsiveLayouts);
  const displaySections = section.data.slice(0, maxTile);
  const isSectionEmpty = !displaySections?.length;
  const shouldShowLabels = sectionKey === "top_stories_section" && showTopics;

  if (isSectionEmpty) {
    return null;
  }

  const sectionContextWrapper = (
    <div className="section-context-wrapper">
      <div
        className={following ? "section-follow following" : "section-follow"}
      >
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
      </div>
      <SectionContextMenu
        dispatch={dispatch}
        index={sectionPosition}
        following={following}
        followedSections={followedSections}
        blockedSections={blockedSections}
        sectionKey={sectionKey}
        title={title}
        type={type}
        sectionPosition={sectionPosition}
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
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
        </div>
        {mayHaveSectionsPersonalization ? sectionContextWrapper : null}
      </div>
      <div className="ds-section-grid ds-card-grid">
        {section.data.slice(0, maxTile).map((rec, index) => {
          const { classNames, imageSizes } = getLayoutData(
            responsiveLayouts,
            index
          );

          if (!rec || rec.placeholder) {
            return <PlaceholderDSCard key={`dscard-${index}`} />;
          }

          return (
            <DSCard
              key={`dscard-${rec.id}`}
              pos={rec.pos}
              flightId={rec.flight_id}
              image_src={rec.image_src}
              raw_image_src={rec.raw_image_src}
              icon_src={rec.icon_src}
              word_count={rec.word_count}
              time_to_read={rec.time_to_read}
              title={rec.title}
              topic={rec.topic}
              excerpt={rec.excerpt}
              url={rec.url}
              id={rec.id}
              shim={rec.shim}
              fetchTimestamp={rec.fetchTimestamp}
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
              firstVisibleTimestamp={firstVisibleTimestamp}
              corpus_item_id={rec.corpus_item_id}
              scheduled_corpus_item_id={rec.scheduled_corpus_item_id}
              recommended_at={rec.recommended_at}
              received_rank={rec.received_rank}
              format={rec.format}
              alt_text={rec.alt_text}
              mayHaveThumbsUpDown={mayHaveCombinedThumbsUpDown}
              mayHaveSectionsCards={mayHaveSectionsCards}
              showTopics={shouldShowLabels}
              selectedTopics={selectedTopics}
              availableTopics={availableTopics}
              is_collection={is_collection}
              saveToPocketCard={saveToPocketCard}
              ctaButtonSponsors={ctaButtonSponsors}
              ctaButtonVariant={ctaButtonVariant}
              spocMessageVariant={spocMessageVariant}
              sectionsClassNames={classNames.join(" ")}
              sectionsCardImageSizes={imageSizes}
              section={sectionKey}
              sectionPosition={sectionPosition}
              sectionFollowed={following}
            />
          );
        })}
      </div>
    </section>
  );
}

function CardSections({
  data,
  feed,
  dispatch,
  type,
  firstVisibleTimestamp,
  is_collection,
  spocMessageVariant,
  ctaButtonVariant,
  ctaButtonSponsors,
}) {
  const prefs = useSelector(state => state.Prefs.values);
  const personalizationEnabled = prefs[PREF_SECTIONS_PERSONALIZATION_ENABLED];
  const interestPickerEnabled = prefs[PREF_INTEREST_PICKER_ENABLED];

  // Handle a render before feed has been fetched by displaying nothing
  if (!data) {
    return null;
  }

  const visibleSections = prefToArray(prefs[PREF_VISIBLE_SECTIONS]);
  const blockedSections = prefToArray(prefs[PREF_BLOCKED_SECTIONS] || "");
  const { interestPicker } = data;

  let filteredSections = data.sections.filter(
    section => !blockedSections.includes(section.sectionKey)
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
      firstVisibleTimestamp={firstVisibleTimestamp}
      is_collection={is_collection}
      spocMessageVariant={spocMessageVariant}
      ctaButtonVariant={ctaButtonVariant}
      ctaButtonSponsors={ctaButtonSponsors}
    />
  ));

  // check that the interest picker is enabled and has data needed to render
  if (
    interestPickerEnabled &&
    personalizationEnabled &&
    interestPicker?.sections
  ) {
    const index = interestPicker.receivedFeedRank - 1;

    sectionsToRender.splice(
      Math.min(sectionsToRender.length - 1, index),
      0,
      <InterestPicker
        title={interestPicker.title}
        subtitle={interestPicker.subtitle}
        interests={interestPicker.sections || []}
        receivedFeedRank={interestPicker.receivedFeedRank}
      />
    );
  }

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
