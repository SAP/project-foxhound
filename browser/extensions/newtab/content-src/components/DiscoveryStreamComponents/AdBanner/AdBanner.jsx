/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React, { useState } from "react";
import { SafeAnchor } from "../SafeAnchor/SafeAnchor";
import { ImpressionStats } from "../../DiscoveryStreamImpressionStats/ImpressionStats";
import { actionCreators as ac } from "common/Actions.mjs";
import { AdBannerContextMenu } from "../AdBannerContextMenu/AdBannerContextMenu";
import { PromoCard } from "../PromoCard/PromoCard.jsx";

const PREF_SECTIONS_ENABLED = "discoverystream.sections.enabled";
const PREF_OHTTP_UNIFIED_ADS = "unifiedAds.ohttp.enabled";
const PREF_REPORT_ADS_ENABLED = "discoverystream.reportAds.enabled";
const PREF_PROMOCARD_ENABLED = "discoverystream.promoCard.enabled";
const PREF_PROMOCARD_VISIBLE = "discoverystream.promoCard.visible";

/**
 * A new banner ad that appears between rows of stories: leaderboard or billboard size.
 *
 * @param spoc
 * @param dispatch
 * @param firstVisibleTimestamp
 * @param row
 * @param type
 * @param prefs
 * @returns {Element}
 * @class
 */
export const AdBanner = ({
  spoc,
  dispatch,
  firstVisibleTimestamp,
  row,
  type,
  prefs,
}) => {
  const getDimensions = format => {
    switch (format) {
      case "leaderboard":
        return {
          width: "728",
          height: "90",
        };
      case "billboard":
        return {
          width: "970",
          height: "250",
        };
    }
    return {
      // image will still render with default values
      width: undefined,
      height: undefined,
    };
  };
  const promoCardEnabled =
    spoc.format === "billboard" &&
    prefs[PREF_PROMOCARD_ENABLED] &&
    prefs[PREF_PROMOCARD_VISIBLE];

  const sectionsEnabled = prefs[PREF_SECTIONS_ENABLED];
  const ohttpEnabled = prefs[PREF_OHTTP_UNIFIED_ADS];
  const showAdReporting = prefs[PREF_REPORT_ADS_ENABLED];
  const ohttpImagesEnabled = prefs.ohttpImagesConfig?.enabled;
  const [menuActive, setMenuActive] = useState(false);
  const adBannerWrapperClassName = `ad-banner-wrapper ${menuActive ? "active" : ""} ${promoCardEnabled ? "promo-card" : ""}`;

  const { width: imgWidth, height: imgHeight } = getDimensions(spoc.format);

  const onLinkClick = () => {
    dispatch(
      ac.DiscoveryStreamUserEvent({
        event: "CLICK",
        source: type.toUpperCase(),
        // Banner ads don't have a position, but a row number
        action_position: parseInt(row, 10),
        value: {
          card_type: "spoc",
          tile_id: spoc.id,
          ...(spoc.shim?.click ? { shim: spoc.shim.click } : {}),
          fetchTimestamp: spoc.fetchTimestamp,
          firstVisibleTimestamp,
          format: spoc.format,
          ...(sectionsEnabled
            ? {
                section: spoc.format,
                section_position: parseInt(row, 10),
              }
            : {}),
        },
      })
    );
  };

  const toggleActive = active => {
    setMenuActive(active);
  };

  // in the default card grid 1 would come before the 1st row of cards and 9 comes after the last row
  // using clamp to make sure its between valid values (1-9)
  const clampedRow = Math.max(1, Math.min(9, row));

  const secureImage = ohttpImagesEnabled && ohttpEnabled;

  let rawImageSrc = spoc.raw_image_src;

  // Wraps the image URL with the moz-cached-ohttp:// protocol.
  // This enables Firefox to load resources over Oblivious HTTP (OHTTP),
  // providing privacy-preserving resource loading.
  // Applied only when inferred personalization is enabled.
  // See: https://firefox-source-docs.mozilla.org/browser/components/mozcachedohttp/docs/index.html
  if (secureImage) {
    rawImageSrc = `moz-cached-ohttp://newtab-image/?url=${encodeURIComponent(spoc.raw_image_src)}`;
  }

  return (
    <aside className={adBannerWrapperClassName} style={{ gridRow: clampedRow }}>
      <div className={`ad-banner-inner ${spoc.format}`}>
        <SafeAnchor
          className="ad-banner-link"
          url={spoc.url}
          title={spoc.title || spoc.sponsor || spoc.alt_text}
          onLinkClick={onLinkClick}
          dispatch={dispatch}
          isSponsored={true}
        >
          <ImpressionStats
            flightId={spoc.flight_id}
            rows={[
              {
                id: spoc.id,
                card_type: "spoc",
                pos: row,
                recommended_at: spoc.recommended_at,
                received_rank: spoc.received_rank,
                format: spoc.format,
                ...(spoc.shim?.impression
                  ? { shim: spoc.shim.impression }
                  : {}),
              },
            ]}
            dispatch={dispatch}
            firstVisibleTimestamp={firstVisibleTimestamp}
          />
          <div className="ad-banner-content">
            <img
              src={rawImageSrc}
              alt={spoc.alt_text}
              loading="eager"
              width={imgWidth}
              height={imgHeight}
            />
          </div>
          <div className="ad-banner-sponsored">
            <span
              className="ad-banner-sponsored-label"
              data-l10n-id="newtab-label-sponsored-fixed"
            />
          </div>
        </SafeAnchor>
        <div className="ad-banner-hover-background">
          <AdBannerContextMenu
            dispatch={dispatch}
            spoc={spoc}
            position={row}
            type={type}
            showAdReporting={showAdReporting}
            toggleActive={toggleActive}
          />
        </div>
      </div>
      {promoCardEnabled && <PromoCard />}
    </aside>
  );
};
