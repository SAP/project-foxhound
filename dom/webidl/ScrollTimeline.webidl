/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://drafts.csswg.org/scroll-animations-1/#scrolltimeline-interface
 *
 * Copyright © 2015 W3C® (MIT, ERCIM, Keio), All Rights Reserved. W3C
 * liability, trademark and document use rules apply.
 */

enum ScrollAxis {
  "block",
  "inline",
  "x",
  "y"
};

dictionary ScrollTimelineOptions {
  Element? source;
  ScrollAxis axis = "block";
};

[Exposed=Window, Pref="layout.css.scroll-driven-animations.enabled"]
interface ScrollTimeline : AnimationTimeline {
  [Throws]
  constructor(optional ScrollTimelineOptions options = {});

  readonly attribute Element? source;

  // [BinaryName] to avoid clashing with the internal Axis() method
  [BinaryName="GetScrollAxis"]
  readonly attribute ScrollAxis axis;
};
