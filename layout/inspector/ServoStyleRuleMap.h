/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_ServoStyleRuleMap_h
#define mozilla_ServoStyleRuleMap_h

#include "mozilla/css/Rule.h"
#include "mozilla/StyleSheet.h"

#include "nsTHashMap.h"

struct StyleLockedStyleRule;

namespace mozilla {
class ServoCSSRuleList;
class ServoStyleSet;
namespace css {
class Rule;
}  // namespace css
namespace dom {
class ShadowRoot;
}
class ServoStyleRuleMap final {
 public:
  ServoStyleRuleMap() = default;

  void EnsureTable(ServoStyleSet&);
  void EnsureTable(dom::ShadowRoot&);

  css::Rule* Lookup(const StyleLockedDeclarationBlock* aDecls) const {
    return mTable.Get(aDecls);
  }

  void SheetAdded(StyleSheet&);
  void SheetRemoved(StyleSheet&);
  void SheetCloned(StyleSheet&);

  void RuleAdded(StyleSheet& aStyleSheet, css::Rule&);
  void RuleRemoved(StyleSheet& aStyleSheet, css::Rule&);
  void RuleDeclarationsChanged(css::Rule&,
                               const StyleLockedDeclarationBlock* aOld,
                               const StyleLockedDeclarationBlock* aNew);

  size_t SizeOfIncludingThis(MallocSizeOf aMallocSizeOf) const;

  ~ServoStyleRuleMap() = default;

 private:
  // Since we would never have a document which contains no style rule,
  // we use IsEmpty as an indication whether we need to walk through
  // all stylesheets to fill the table.
  bool IsEmpty() const { return mTable.IsEmpty(); }

  void FillTableFromRule(css::Rule&);
  void FillTableFromRuleList(ServoCSSRuleList&);
  void FillTableFromStyleSheet(StyleSheet&);

  using Hashtable = nsTHashMap<nsPtrHashKey<const StyleLockedDeclarationBlock>,
                               WeakPtr<css::Rule>>;
  Hashtable mTable;
};

}  // namespace mozilla

#endif  // mozilla_ServoStyleRuleMap_h
