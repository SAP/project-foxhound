/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

import * as Undefined from "./undefined.mjs";
import * as Null from "./null.mjs";
import * as StringRep from "./string.mjs";
import * as NumberRep from "./number.mjs";
import * as JsonNumber from "./json-number.mjs";
import * as ArrayRep from "./array.mjs";
import * as Obj from "./object.mjs";
import * as SymbolRep from "./symbol.mjs";
import * as InfinityRep from "./infinity.mjs";
import * as NaNRep from "./nan.mjs";
import * as Accessor from "./accessor.mjs";
import * as Accessible from "./accessible.mjs";
import * as Attribute from "./attribute.mjs";
import * as BigIntRep from "./big-int.mjs";
import * as DateTime from "./date-time.mjs";
import * as DocumentRep from "./document.mjs";
import * as DocumentTypeRep from "./document-type.mjs";
import * as EventRep from "./event.mjs";
import * as Func from "./function.mjs";
import * as PromiseRep from "./promise.mjs";
import * as RegExpRep from "./regexp.mjs";
import * as StyleSheetRep from "./stylesheet.mjs";
import * as CommentNode from "./comment-node.mjs";
import * as ElementNode from "./element-node.mjs";
import * as TextNode from "./text-node.mjs";
import * as ErrorRep from "./error.mjs";
import * as WindowRep from "./window.mjs";
import * as ObjectWithText from "./object-with-text.mjs";
import * as ObjectWithURL from "./object-with-url.mjs";
import * as GripArray from "./grip-array.mjs";
import * as GripEntry from "./grip-entry.mjs";
import * as GripMap from "./grip-map.mjs";
import * as Grip from "./grip.mjs";
import * as CustomFormatter from "./custom-formatter.mjs";

// List of all registered template.
// XXX there should be a way for extensions to register a new
// or modify an existing rep.
const reps = [
  RegExpRep,
  StyleSheetRep,
  EventRep,
  DateTime,
  CommentNode,
  Accessible,
  ElementNode,
  TextNode,
  Attribute,
  Func,
  PromiseRep,
  DocumentRep,
  DocumentTypeRep,
  WindowRep,
  ObjectWithText,
  ObjectWithURL,
  ErrorRep,
  GripArray,
  GripMap,
  GripEntry,
  Grip,
  Undefined,
  Null,
  StringRep,
  NumberRep,
  BigIntRep,
  SymbolRep,
  InfinityRep,
  NaNRep,
  Accessor,
];

// Reps for rendering of native object reference (e.g. used from the JSONViewer, Netmonitor, …)
const noGripReps = [
  StringRep,
  JsonNumber,
  NumberRep,
  ArrayRep,
  Undefined,
  Null,
  Obj,
];

/**
 * Generic rep that is used for rendering native JS types or an object.
 * The right template used for rendering is picked automatically according
 * to the current value type. The value must be passed in as the 'object'
 * property.
 */
const Rep = function (props) {
  const { object, defaultRep } = props;
  const rep = getRep(
    object,
    defaultRep,
    props.noGrip,
    props.mayUseCustomFormatter
  );
  return rep({
    ...props,
    // To avoid circulary dependencies, pass down `Rep` via Props.
    // Clone `props` as this object is frozen when using Debug versions of React.
    Rep,
  });
};

const exportedReps = {
  Accessible,
  Accessor,
  ArrayRep,
  Attribute,
  BigInt: BigIntRep,
  CommentNode,
  DateTime,
  Document: DocumentRep,
  DocumentType: DocumentTypeRep,
  ElementNode,
  ErrorRep,
  Event: EventRep,
  Func,
  Grip,
  GripArray,
  GripMap,
  GripEntry,
  InfinityRep,
  NaNRep,
  Null,
  Number: NumberRep,
  Obj,
  ObjectWithText,
  ObjectWithURL,
  PromiseRep,
  RegExp: RegExpRep,
  Rep,
  StringRep,
  StyleSheet: StyleSheetRep,
  SymbolRep,
  TextNode,
  Undefined,
  WindowRep,
};

// Custom Formatters
// Services.prefs isn't available in jsonviewer. It doesn't matter as we don't want to use
// custom formatters there
if (typeof Services == "object" && Services?.prefs) {
  const useCustomFormatters = Services.prefs.getBoolPref(
    "devtools.custom-formatters.enabled",
    false
  );

  if (useCustomFormatters) {
    reps.unshift(CustomFormatter);
    exportedReps.CustomFormatter = CustomFormatter;
  }
}

// Helpers

/**
 * Return a rep object that is responsible for rendering given
 * object.
 *
 * @param object {Object} Object to be rendered in the UI. This
 * can be generic JS object as well as a grip (handle to a remote
 * debuggee object).
 *
 * @param defaultRep {React.Component} The default template
 * that should be used to render given object if none is found.
 *
 * @param noGrip {Boolean} If true, will only check reps not made for remote
 *                         objects.
 *
 * @param mayUseCustomFormatter {Boolean} If true, custom formatters are
 * allowed to be used as rep.
 */
function getRep(
  object,
  defaultRep = Grip,
  noGrip = false,
  mayUseCustomFormatter = false
) {
  const repsList = noGrip ? noGripReps : reps;
  for (const rep of repsList) {
    if (rep === exportedReps.CustomFormatter && !mayUseCustomFormatter) {
      continue;
    }

    try {
      // supportsObject could return weight (not only true/false
      // but a number), which would allow to priorities templates and
      // support better extensibility.
      if (rep.supportsObject(object, noGrip)) {
        return rep.rep;
      }
    } catch (err) {
      console.error(err);
    }
  }

  return defaultRep.rep;
}

export { Rep, exportedReps as REPS, getRep };
