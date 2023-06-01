/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

/**
 * Redux actions for the search state
 * @module actions/search
 */

import { isFulfilled } from "../utils/async-value";
import {
  getFirstSourceActorForGeneratedSource,
  getSourceList,
  getSettledSourceTextContent,
  isSourceBlackBoxed,
} from "../selectors";
import { createLocation } from "../utils/location";
import { loadSourceText } from "./sources/loadSourceText";
import {
  getTextSearchOperation,
  getTextSearchStatus,
} from "../selectors/project-text-search";
import { statusType } from "../reducers/project-text-search";

export function addSearchQuery(cx, query) {
  return { type: "ADD_QUERY", cx, query };
}

export function addOngoingSearch(cx, ongoingSearch) {
  return { type: "ADD_ONGOING_SEARCH", cx, ongoingSearch };
}

export function addSearchResult(cx, sourceId, filepath, matches) {
  return {
    type: "ADD_SEARCH_RESULT",
    cx,
    result: { sourceId, filepath, matches },
  };
}

export function clearSearchResults(cx) {
  return { type: "CLEAR_SEARCH_RESULTS", cx };
}

export function clearSearch(cx) {
  return { type: "CLEAR_SEARCH", cx };
}

export function updateSearchStatus(cx, status) {
  return { type: "UPDATE_STATUS", cx, status };
}

export function closeProjectSearch(cx) {
  return ({ dispatch, getState }) => {
    dispatch(stopOngoingSearch(cx));
    dispatch({ type: "CLOSE_PROJECT_SEARCH" });
  };
}

export function stopOngoingSearch(cx) {
  return ({ dispatch, getState }) => {
    const state = getState();
    const ongoingSearch = getTextSearchOperation(state);
    const status = getTextSearchStatus(state);
    if (ongoingSearch && status !== statusType.done) {
      ongoingSearch.cancel();
      dispatch(updateSearchStatus(cx, statusType.cancelled));
    }
  };
}

export function searchSources(cx, query) {
  let cancelled = false;

  const search = async ({ dispatch, getState }) => {
    dispatch(stopOngoingSearch(cx));
    await dispatch(addOngoingSearch(cx, search));
    await dispatch(clearSearchResults(cx));
    await dispatch(addSearchQuery(cx, query));
    dispatch(updateSearchStatus(cx, statusType.fetching));
    const validSources = getSourceList(getState()).filter(
      source => !isSourceBlackBoxed(getState(), source)
    );
    // Sort original entries first so that search results are more useful.
    // Deprioritize third-party scripts, so their results show last.
    validSources.sort((a, b) => {
      function isThirdParty(source) {
        return (
          source?.url &&
          (source.url.includes("node_modules") ||
            source.url.includes("bower_components"))
        );
      }

      if (a.isOriginal && !isThirdParty(a)) {
        return -1;
      }

      if (b.isOriginal && !isThirdParty(b)) {
        return 1;
      }

      if (!isThirdParty(a) && isThirdParty(b)) {
        return -1;
      }
      if (isThirdParty(a) && !isThirdParty(b)) {
        return 1;
      }
      return 0;
    });

    for (const source of validSources) {
      if (cancelled) {
        return;
      }

      const sourceActor = getFirstSourceActorForGeneratedSource(
        getState(),
        source.id
      );
      await dispatch(loadSourceText(cx, source, sourceActor));
      await dispatch(searchSource(cx, source, sourceActor, query));
    }
    dispatch(updateSearchStatus(cx, statusType.done));
  };

  search.cancel = () => {
    cancelled = true;
  };

  return search;
}

export function searchSource(cx, source, sourceActor, query) {
  return async ({ dispatch, getState, searchWorker }) => {
    if (!source) {
      return;
    }
    const location = createLocation({
      sourceId: source.id,
      sourceActorId: sourceActor ? sourceActor.actor : null,
    });
    const content = getSettledSourceTextContent(getState(), location);
    let matches = [];
    if (content && isFulfilled(content) && content.value.type === "text") {
      matches = await searchWorker.findSourceMatches(
        source.id,
        content.value,
        query
      );
    }
    if (!matches.length) {
      return;
    }
    dispatch(addSearchResult(cx, source.id, source.url, matches));
  };
}
