/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://drafts.css-houdini.org/css-typed-om-1/#unparsedvalue-objects
 */

// https://drafts.css-houdini.org/css-typed-om-1/#cssunparsedvalue
// TODO: Expose to LayoutWorklet
[Exposed=(Window, Worker, PaintWorklet), Pref="layout.css.typed-om.enabled"]
interface CSSUnparsedValue : CSSStyleValue {
  constructor(sequence<CSSUnparsedSegment> members);
  iterable<CSSUnparsedSegment>;
  readonly attribute unsigned long length;
  getter CSSUnparsedSegment (unsigned long index);
  // TODO: The spec should be updated to use `undefined` as the return type too
  // https://github.com/w3c/css-houdini-drafts/issues/1142
  [Throws] setter undefined (unsigned long index, CSSUnparsedSegment val);
};

// https://drafts.css-houdini.org/css-typed-om-1/#typedefdef-cssunparsedsegment
typedef (UTF8String or CSSVariableReferenceValue) CSSUnparsedSegment;
