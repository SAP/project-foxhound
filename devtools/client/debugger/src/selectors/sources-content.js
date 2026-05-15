/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

import { asSettled } from "../utils/async-value";

import {
  getSelectedLocation,
  getFirstSourceActorForGeneratedSource,
} from "../selectors/sources";

export function getSourceTextContentForLocation(state, location) {
  return getSourceTextContentForSource(
    state,
    location.source,
    location.sourceActor
  );
}

export function getSourceTextContentForSource(
  state,
  source,
  sourceActor = null
) {
  if (source.isOriginal) {
    return state.sourcesContent.mutableOriginalSourceTextContentMapBySourceId.get(
      source.id
    );
  }

  if (!sourceActor) {
    sourceActor = getFirstSourceActorForGeneratedSource(state, source.id);
  }
  return state.sourcesContent.mutableGeneratedSourceTextContentMapBySourceActorId.get(
    sourceActor.id
  );
}

export function getSettledSourceTextContent(state, location) {
  const content = getSourceTextContentForLocation(state, location);
  return asSettled(content);
}

export function getSelectedSourceTextContent(state) {
  const location = getSelectedLocation(state);

  if (!location) {
    return null;
  }

  return getSourceTextContentForLocation(state, location);
}

export function getSourcesEpoch(state) {
  return state.sourcesContent.epoch;
}
