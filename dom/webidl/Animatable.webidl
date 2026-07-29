/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://drafts.csswg.org/web-animations-1/#the-animatable-interface-mixin
 *
 * Copyright © 2014 W3C® (MIT, ERCIM, Keio), All Rights Reserved. W3C
 * liability, trademark and document use rules apply.
 */

dictionary KeyframeAnimationOptions : KeyframeEffectOptions {
  DOMString id = "";

  [Pref="layout.css.scroll-driven-animations.enabled"]
  AnimationTimeline? timeline;
};

dictionary GetAnimationsOptions {
  boolean subtree = false;
  DOMString? pseudoElement = null;
};

interface mixin Animatable {
  [Throws]
  Animation animate(object? keyframes,
                    optional UnrestrictedDoubleOrKeyframeAnimationOptions options = {});
  [Throws]
  sequence<Animation> getAnimations(optional GetAnimationsOptions options = {});
};
