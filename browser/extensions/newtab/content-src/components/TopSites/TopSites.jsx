/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import { actionCreators as ac, actionTypes as at } from "common/Actions.mjs";
import { MIN_RICH_FAVICON_SIZE, TOP_SITES_SOURCE } from "./TopSitesConstants";
import { ComponentPerfTimer } from "content-src/components/ComponentPerfTimer/ComponentPerfTimer";
import { ErrorBoundary } from "content-src/components/ErrorBoundary/ErrorBoundary";
import { connect } from "react-redux";
import { ModalOverlayWrapper } from "content-src/components/ModalOverlay/ModalOverlay";
import React from "react";
import { SearchShortcutsForm } from "./SearchShortcutsForm";
import { TOP_SITES_MAX_SITES_PER_ROW } from "common/Reducers.sys.mjs";
import { TopSiteForm } from "./TopSiteForm";
import { TopSiteList } from "./TopSite";

// @nova-cleanup(remove-pref): Remove once classic path is gone
const PREF_NOVA_ENABLED = "nova.enabled";

function topSiteIconType(link) {
  if (link.customScreenshotURL) {
    return "custom_screenshot";
  }
  if (link.tippyTopIcon || link.faviconRef === "tippytop") {
    return "tippytop";
  }
  if (link.faviconSize >= MIN_RICH_FAVICON_SIZE) {
    return "rich_icon";
  }
  if (link.screenshot) {
    return "screenshot";
  }
  return "no_image";
}

/**
 * Iterates through TopSites and counts types of images.
 *
 * @param acc Accumulator for reducer.
 * @param topsite Entry in TopSites.
 */
function countTopSitesIconsTypes(topSites) {
  const countTopSitesTypes = (acc, link) => {
    acc[topSiteIconType(link)]++;
    return acc;
  };

  return topSites.reduce(countTopSitesTypes, {
    custom_screenshot: 0,
    screenshot: 0,
    tippytop: 0,
    rich_icon: 0,
    no_image: 0,
  });
}

function getTopSiteGridCols(fallback) {
  const grid = globalThis.document?.querySelector(".top-sites-list");
  if (!grid) {
    return fallback;
  }
  return globalThis.getComputedStyle(grid).gridTemplateColumns.split(" ")
    .length;
}

export class _TopSites extends React.PureComponent {
  constructor(props) {
    super(props);
    this.onEditFormClose = this.onEditFormClose.bind(this);
    this.onSearchShortcutsFormClose =
      this.onSearchShortcutsFormClose.bind(this);
  }

  /**
   * Dispatch session statistics about the quality of TopSites icons and pinned count.
   */
  _dispatchTopSitesStats() {
    const topSites = this._getVisibleTopSites().filter(
      topSite => topSite !== null && topSite !== undefined
    );
    const topSitesIconsStats = countTopSitesIconsTypes(topSites);
    const topSitesPinned = topSites.filter(site => !!site.isPinned).length;
    const searchShortcuts = topSites.filter(
      site => !!site.searchTopSite
    ).length;
    // Dispatch telemetry event with the count of TopSites images types.
    this.props.dispatch(
      ac.AlsoToMain({
        type: at.SAVE_SESSION_PERF_DATA,
        data: {
          topsites_icon_stats: topSitesIconsStats,
          topsites_pinned: topSitesPinned,
          topsites_search_shortcuts: searchShortcuts,
        },
      })
    );
  }

  /**
   * Return the TopSites that are visible based on prefs and window width.
   */
  _getVisibleTopSites() {
    const novaEnabled = this.props.Prefs.values[PREF_NOVA_ENABLED];
    let sitesPerRow = this.props.TopSitesMaxSitesPerRow;

    if (novaEnabled) {
      sitesPerRow = getTopSiteGridCols(sitesPerRow);
    } else if (!globalThis.matchMedia("(min-width: 1072px)").matches) {
      sitesPerRow = 6;
    } else if (
      sitesPerRow > 8 &&
      !globalThis.matchMedia("(min-width: 1374px)").matches
    ) {
      sitesPerRow = 8;
    }

    return this.props.TopSites.rows.slice(
      0,
      this.props.TopSitesRows * sitesPerRow
    );
  }

  componentDidUpdate() {
    this._dispatchTopSitesStats();
  }

  componentDidMount() {
    this._dispatchTopSitesStats();
  }

  onEditFormClose() {
    this.props.dispatch(
      ac.UserEvent({
        source: TOP_SITES_SOURCE,
        event: "TOP_SITES_EDIT_CLOSE",
      })
    );
    this.props.dispatch({ type: at.TOP_SITES_CANCEL_EDIT });
  }

  onSearchShortcutsFormClose() {
    this.props.dispatch(
      ac.UserEvent({
        source: TOP_SITES_SOURCE,
        event: "SEARCH_EDIT_CLOSE",
      })
    );
    this.props.dispatch({ type: at.TOP_SITES_CLOSE_SEARCH_SHORTCUTS_MODAL });
  }

  render() {
    const { props } = this;
    const { editForm, showSearchShortcutsForm } = props.TopSites;
    let visibleTopSites;
    const colors = props.Prefs.values["newNewtabExperience.colors"];

    // do not run this function when for startup cache
    if (!props.App.isForStartupCache.TopSites) {
      visibleTopSites = this._getVisibleTopSites()?.length;
    }

    return (
      <ComponentPerfTimer
        id="topsites"
        initialized={props.TopSites.initialized}
        dispatch={props.dispatch}
      >
        <section className="top-sites" data-section-id="topsites">
          {/* nova-cleanup: Can be removed once classic path is gone since Nova wraps TopSites in ErrorBoundary in Base.jsx */}
          <ErrorBoundary className="section-body-fallback">
            <TopSiteList
              TopSites={props.TopSites}
              TopSitesRows={props.TopSitesRows}
              topSitesMaxSitesPerRow={props.TopSitesMaxSitesPerRow}
              dispatch={props.dispatch}
              topSiteIconType={topSiteIconType}
              colors={colors}
              visibleTopSites={visibleTopSites}
            />
            <div className="edit-topsites-wrapper">
              {editForm && (
                <div className="edit-topsites">
                  <ModalOverlayWrapper
                    unstyled={true}
                    onClose={this.onEditFormClose}
                    innerClassName="modal"
                    headerId="top-site-form-title"
                  >
                    <TopSiteForm
                      site={props.TopSites.rows[editForm.index]}
                      onClose={this.onEditFormClose}
                      dispatch={this.props.dispatch}
                      {...editForm}
                    />
                  </ModalOverlayWrapper>
                </div>
              )}
              {showSearchShortcutsForm && (
                <div className="edit-search-shortcuts">
                  <ModalOverlayWrapper
                    unstyled={true}
                    onClose={this.onSearchShortcutsFormClose}
                    innerClassName="modal"
                  >
                    <SearchShortcutsForm
                      TopSites={props.TopSites}
                      onClose={this.onSearchShortcutsFormClose}
                      dispatch={this.props.dispatch}
                    />
                  </ModalOverlayWrapper>
                </div>
              )}
            </div>
          </ErrorBoundary>
        </section>
      </ComponentPerfTimer>
    );
  }
}

export const TopSites = connect(state => {
  const prefs = state.Prefs.values;
  return {
    App: state.App,
    TopSites: state.TopSites,
    Prefs: state.Prefs,
    TopSitesRows: prefs.topSitesRows,
    TopSitesMaxSitesPerRow:
      prefs.trainhopConfig?.topSites?.maxSitesPerRow ??
      prefs.topSitesMaxSitesPerRow ??
      TOP_SITES_MAX_SITES_PER_ROW,
  };
})(_TopSites);
