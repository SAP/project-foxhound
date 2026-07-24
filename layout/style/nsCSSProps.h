/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * methods for dealing with CSS properties and tables of the keyword
 * values they accept
 */

#ifndef nsCSSProps_h_
#define nsCSSProps_h_

#include <ostream>

#include "NonCustomCSSPropertyId.h"
#include "mozilla/CSSEnabledState.h"
#include "mozilla/CSSPropFlags.h"
#include "mozilla/Preferences.h"
#include "mozilla/UseCounter.h"
#include "nsString.h"
#include "nsStyleStructFwd.h"

// Length of the "--" prefix on custom names (such as custom property names,
// and, in the future, custom media query names).
#define CSS_CUSTOM_NAME_PREFIX_LENGTH 2

namespace mozilla {
class ComputedStyle;
namespace gfx {
class gfxVarReceiver;
}
}  // namespace mozilla

extern "C" {
NonCustomCSSPropertyId Servo_ResolveLogicalProperty(
    NonCustomCSSPropertyId, const mozilla::ComputedStyle*);
NonCustomCSSPropertyId Servo_Property_LookupEnabledForAllContent(
    const nsACString*);
const uint8_t* Servo_Property_GetName(NonCustomCSSPropertyId,
                                      uint32_t* aLength);
}

class nsCSSProps {
 public:
  using EnabledState = mozilla::CSSEnabledState;
  using Flags = mozilla::CSSPropFlags;

  static void Init();

  // Looks up the property with name aProperty and returns its corresponding
  // NonCustomCSSPropertyId value.  If aProperty is the name of a custom
  // property, then eCSSPropertyExtra_variable will be returned.
  //
  // This only returns properties enabled for all content, and resolves aliases
  // to return the aliased property.
  static NonCustomCSSPropertyId LookupProperty(const nsACString& aProperty) {
    return Servo_Property_LookupEnabledForAllContent(&aProperty);
  }

  // As above, but looked up using a property's IDL name.
  // eCSSPropertyExtra_variable won't be returned from this method.
  static NonCustomCSSPropertyId LookupPropertyByIDLName(
      const nsACString& aPropertyIDLName, EnabledState aEnabled);

  // Returns whether aProperty is a custom property name, i.e. begins with
  // "--".  This assumes that the CSS Variables pref has been enabled.
  static bool IsCustomPropertyName(const nsACString& aProperty);

  static bool IsShorthand(NonCustomCSSPropertyId aProperty) {
    if (aProperty == eCSSPropertyExtra_variable) {
      return false;
    }
    MOZ_ASSERT(
        aProperty != eCSSProperty_UNKNOWN && aProperty < eCSSProperty_COUNT,
        "out of range");
    return aProperty >= eCSSProperty_COUNT_no_shorthands;
  }

  // Same but for @font-face descriptors
  static nsCSSFontDesc LookupFontDesc(const nsACString&);

  // The relevant invariants are asserted in Document.cpp
  static mozilla::UseCounter UseCounterFor(NonCustomCSSPropertyId aProperty) {
    MOZ_ASSERT(aProperty != eCSSProperty_UNKNOWN &&
                   aProperty < eCSSProperty_COUNT_with_aliases,
               "out of range");
    return mozilla::UseCounter(size_t(mozilla::eUseCounter_FirstCSSProperty) +
                               size_t(aProperty));
  }

  // Given a property enum, get the string value
  //
  // This string is static.
  static nsDependentCSubstring GetStringValue(
      NonCustomCSSPropertyId aProperty) {
    uint32_t len;
    const uint8_t* chars = Servo_Property_GetName(aProperty, &len);
    return nsDependentCSubstring(reinterpret_cast<const char*>(chars), len);
  }

  static const nsCString& GetStringValue(nsCSSFontDesc aFontDesc);
  static const nsCString& GetStringValue(nsCSSCounterDesc aCounterDesc);

  static Flags PropFlags(NonCustomCSSPropertyId);
  static bool PropHasFlags(NonCustomCSSPropertyId aProperty, Flags aFlags) {
    return (PropFlags(aProperty) & aFlags) == aFlags;
  }

  static NonCustomCSSPropertyId Physicalize(
      NonCustomCSSPropertyId aProperty, const mozilla::ComputedStyle& aStyle) {
    MOZ_ASSERT(!IsShorthand(aProperty));
    if (PropHasFlags(aProperty, Flags::IsLogical)) {
      return Servo_ResolveLogicalProperty(aProperty, &aStyle);
    }
    return aProperty;
  }

 private:
  // A table for shorthand properties.  The appropriate index is the
  // property id minus eCSSProperty_COUNT_no_shorthands.
  static const NonCustomCSSPropertyId* const
      kSubpropertyTable[eCSSProperty_COUNT - eCSSProperty_COUNT_no_shorthands];

 public:
  /**
   * Returns true if the backdrop-filter pref and the gfx blocklist are enabled.
   */
  static bool IsBackdropFilterAvailable(JSContext*, JSObject*) {
    return IsEnabled(eCSSProperty_backdrop_filter, EnabledState::ForAllContent);
  }

  /**
   * Recoumputes the enabled state of a pref. If aPrefName is nullptr,
   * recomputes the state of all prefs in gPropertyEnabled.
   * aClosure is the pref callback closure data, which is not used.
   */
  static void RecomputeEnabledState(const char* aPrefName,
                                    void* aClosure = nullptr);

  /**
   * Retrieve a singleton receiver to register with gfxVars
   */
  static mozilla::gfx::gfxVarReceiver& GfxVarReceiver();

  static const NonCustomCSSPropertyId* SubpropertyEntryFor(
      NonCustomCSSPropertyId aProperty) {
    MOZ_ASSERT(eCSSProperty_COUNT_no_shorthands <= aProperty &&
                   aProperty < eCSSProperty_COUNT,
               "out of range");
    return kSubpropertyTable[aProperty - eCSSProperty_COUNT_no_shorthands];
  }

 private:
  static bool gPropertyEnabled[eCSSProperty_COUNT_with_aliases];
  // Defined in the generated nsCSSPropsGenerated.inc.
  static const char* const kIDLNameTable[eCSSProperty_COUNT];
  static const int32_t kIDLNameSortPositionTable[eCSSProperty_COUNT];

 public:
  /**
   * Returns the IDL name of the specified property, which must be a
   * longhand, logical or shorthand property.  The IDL name is the property
   * name with any hyphen-lowercase character pairs replaced by an
   * uppercase character:
   * https://drafts.csswg.org/cssom/#css-property-to-idl-attribute
   *
   * As a special case, the string "cssFloat" is returned for the float
   * property.  nullptr is returned for internal properties.
   */
  static const char* PropertyIDLName(NonCustomCSSPropertyId aProperty) {
    MOZ_ASSERT(
        aProperty != eCSSProperty_UNKNOWN && aProperty < eCSSProperty_COUNT,
        "out of range");
    return kIDLNameTable[aProperty];
  }

  /**
   * Returns the position of the specified property in a list of all
   * properties sorted by their IDL name.
   */
  static int32_t PropertyIDLNameSortPosition(NonCustomCSSPropertyId aProperty) {
    MOZ_ASSERT(
        aProperty != eCSSProperty_UNKNOWN && aProperty < eCSSProperty_COUNT,
        "out of range");
    return kIDLNameSortPositionTable[aProperty];
  }

  static bool IsEnabled(NonCustomCSSPropertyId aProperty,
                        EnabledState aEnabled) {
    MOZ_ASSERT(aProperty != eCSSProperty_UNKNOWN &&
                   aProperty < eCSSProperty_COUNT_with_aliases,
               "out of range");
    // In the child process, assert that we're not trying to parse stylesheets
    // before we've gotten all our prefs.
    MOZ_ASSERT_IF(!XRE_IsParentProcess(),
                  mozilla::Preferences::ArePrefsInitedInContentProcess());
    if (gPropertyEnabled[aProperty]) {
      return true;
    }
    if (aEnabled == EnabledState::IgnoreEnabledState) {
      return true;
    }
    if ((aEnabled & EnabledState::InUASheets) &&
        PropHasFlags(aProperty, Flags::EnabledInUASheets)) {
      return true;
    }
    if ((aEnabled & EnabledState::InChrome) &&
        PropHasFlags(aProperty, Flags::EnabledInChrome)) {
      return true;
    }
    return false;
  }

  struct PropertyPref {
    NonCustomCSSPropertyId mPropId;
    const char* mPref;
  };
  static const PropertyPref kPropertyPrefTable[];

// Storing the enabledstate_ value in an NonCustomCSSPropertyId variable is a
// small hack to avoid needing a separate variable declaration for its real type
// (CSSEnabledState), which would then require using a block and
// therefore a pair of macros by consumers for the start and end of the loop.
#define CSSPROPS_FOR_SHORTHAND_SUBPROPERTIES(it_, prop_, enabledstate_)       \
  for (const NonCustomCSSPropertyId *                                         \
           it_ = nsCSSProps::SubpropertyEntryFor(prop_),                      \
          es_ =                                                               \
              (NonCustomCSSPropertyId)((enabledstate_) | CSSEnabledState(0)); \
       *it_ != eCSSProperty_UNKNOWN; ++it_)                                   \
    if (nsCSSProps::IsEnabled(*it_, (mozilla::CSSEnabledState)es_))
};

// MOZ_DBG support for NonCustomCSSPropertyId

inline std::ostream& operator<<(std::ostream& aOut,
                                NonCustomCSSPropertyId aProperty) {
  return aOut << nsCSSProps::GetStringValue(aProperty);
}

#endif /* nsCSSProps_h_ */
