/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://drafts.csswg.org/css-highlight-api-1/
 *
 * Copyright © 2021 W3C® (MIT, ERCIM, Keio), All Rights Reserved. W3C
 * liability, trademark and document use rules apply.
 */

/**
 * Registry object that contains all Highlights associated with a Document.
 *
 * See https://drafts.csswg.org/css-highlight-api-1/#highlightregistry
 */
[Exposed=Window]
interface HighlightRegistry {
  maplike<DOMString, Highlight>;
};

partial interface HighlightRegistry {
  // Maplike interface methods need to be overridden.
  // Iterating a maplike is not possible from C++ yet.
  // Therefore, a separate data structure must be held and kept in sync.
  [Throws]
  HighlightRegistry set(DOMString key, Highlight value);
  [Throws]
  undefined clear();
  [Throws]
  boolean delete(DOMString key);
};

/**
 * https://drafts.csswg.org/css-highlight-api-1/#dom-highlightregistry-highlightsfrompoint
 */
partial interface HighlightRegistry {
  sequence<HighlightHitResult> highlightsFromPoint(float x, float y, optional HighlightsFromPointOptions options = {});
};

dictionary HighlightHitResult {
  Highlight highlight;
  sequence<AbstractRange> ranges;
};

dictionary HighlightsFromPointOptions {
  sequence<ShadowRoot> shadowRoots = [];
};
