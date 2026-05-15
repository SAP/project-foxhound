/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://drafts.css-houdini.org/css-typed-om-1/#transformvalue-objects
 */

// https://drafts.css-houdini.org/css-typed-om-1/#csstranslate
// TODO: Expose to PaintWorklet once CSSTransformComponent is exposed to
//       PaintWorklet too
// TODO: Expose to LayoutWorklet
[Exposed=(Window, Worker), Pref="layout.css.typed-om.enabled"]
interface CSSTranslate : CSSTransformComponent {
  [Throws] constructor(CSSNumericValue x, CSSNumericValue y, optional CSSNumericValue z);
  // TODO: Change to [SetterThrows] once the x attribute is fully implemented
  [Throws] attribute CSSNumericValue x;
  // TODO: Change to [SetterThrows] once the y attribute is fully implemented
  [Throws] attribute CSSNumericValue y;
  // TODO: Change to [SetterThrows] once the z attribute is fully implemented
  [Throws] attribute CSSNumericValue z;
};
