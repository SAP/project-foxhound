/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://drafts.csswg.org/css-conditional-5/#the-csscontainerrule-interface
 */

dictionary CSSContainerCondition {
  required UTF8String name;
  required UTF8String query;
};

// https://drafts.csswg.org/css-conditional-5/#the-csscontainerrule-interface
[Exposed=Window]
interface CSSContainerRule : CSSConditionRule {
  [Deprecated=CSSContainerRuleSingleCondition] readonly attribute UTF8String containerName;
  [Deprecated=CSSContainerRuleSingleCondition] readonly attribute UTF8String containerQuery;

  // TODO: Use FrozenArray once available. (Bug 1236777)
  [Frozen, Cached, Pure] readonly attribute sequence<CSSContainerCondition> conditions;

  // Performs a container query look-up for an element.
  [ChromeOnly] Element? queryContainerFor(Element element, unsigned long conditionIndex);

  [ChromeOnly] boolean queryConditionMatchesElement(Element element, unsigned long conditionIndex);
};
