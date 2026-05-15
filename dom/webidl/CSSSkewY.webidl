/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://drafts.css-houdini.org/css-typed-om-1/#transformvalue-objects
 */

// https://drafts.css-houdini.org/css-typed-om-1/#cssskewy
// TODO: Expose to PaintWorklet once CSSTransformComponent is exposed to
//       PaintWorklet too
// TODO: Expose to LayoutWorklet
[Exposed=(Window, Worker), Pref="layout.css.typed-om.enabled"]
interface CSSSkewY : CSSTransformComponent {
  [Throws] constructor(CSSNumericValue ay);
  // TODO: Change to [SetterThrows] once the ay attribute is fully implemented
  [Throws] attribute CSSNumericValue ay;
};
