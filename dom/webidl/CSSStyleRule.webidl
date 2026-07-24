/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://drafts.csswg.org/cssom/#the-cssstylerule-interface
 */

// https://drafts.csswg.org/cssom/#the-cssstylerule-interface
[Exposed=Window]
interface CSSStyleRule : CSSGroupingRule {
  attribute UTF8String selectorText;
  [SameObject, PutForwards=cssText] readonly attribute CSSStyleProperties style;

  [ChromeOnly] readonly attribute unsigned long selectorCount;
  [ChromeOnly] UTF8String selectorTextAt(unsigned long index, optional boolean desugared = false);
  [ChromeOnly] unsigned long long selectorSpecificityAt(unsigned long index, optional boolean desugared = false);
  [ChromeOnly] boolean selectorMatchesElement(
    unsigned long selectorIndex,
    Element element,
    optional [LegacyNullToEmptyString] DOMString pseudo = "",
    optional boolean includeVisitedStyle = false);
  // Get scope root of this style rule's selector. Returns null if the rule is not within a scope rule,
  // or if this selector does not match this style rule (Whether by not matching the selector, or it
  // not having a no viable scope root).
  [ChromeOnly] Element? getScopeRootFor(
    unsigned long selectorIndex,
    Element element,
    optional [LegacyNullToEmptyString] DOMString pseudo = "",
    optional boolean includeVisitedStyle = false);
  [ChromeOnly] sequence<SelectorWarning> getSelectorWarnings();
  // Get elements on the page matching the rule's selectors. This is helpful for DevTools
  // so we can avoid computing a desugared selector, which can be very expensive on deeply
  // nested rules.
  [ChromeOnly] NodeList querySelectorAll(Node root);
};

enum SelectorWarningKind {
  "UnconstrainedHas",
  "SiblingCombinatorAfterScope",
};

dictionary SelectorWarning {
  required unsigned long index;
  required SelectorWarningKind kind;
};

// https://drafts.css-houdini.org/css-typed-om-1/#declared-stylepropertymap-objects
partial interface CSSStyleRule {
  [SameObject, Pref="layout.css.typed-om.enabled"] readonly attribute StylePropertyMap styleMap;
};
