/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*
 * methods for dealing with CSS properties and tables of the keyword
 * values they accept
 */

#include "nsCSSProps.h"

#include "gfxPlatform.h"
#include "mozilla/ClearOnShutdown.h"
#include "mozilla/LookAndFeel.h"  // for system colors
#include "mozilla/Preferences.h"
#include "mozilla/StaticPrefs_layout.h"
#include "mozilla/StaticPtr.h"
#include "mozilla/dom/Animation.h"
#include "mozilla/dom/AnimationEffectBinding.h"  // for PlaybackDirection
#include "mozilla/gfx/gfxVarReceiver.h"
#include "mozilla/gfx/gfxVars.h"  // for UseWebRender
#include "nsIWidget.h"
#include "nsLayoutUtils.h"
#include "nsString.h"
#include "nsStyleConsts.h"  // For system widget appearance types

using namespace mozilla;

static StaticAutoPtr<nsTHashMap<nsCStringHashKey, NonCustomCSSPropertyId>>
    gPropertyIDLNameTable;

static constexpr nsLiteralCString const kCSSRawFontDescs[] = {
#define CSS_FONT_DESC(name_, method_) #name_ ""_ns,
#include "nsCSSFontDescList.inc"
#undef CSS_FONT_DESC
};

static constexpr nsLiteralCString const kCSSRawCounterDescs[] = {
#define CSS_COUNTER_DESC(name_, method_) #name_ ""_ns,
#include "nsCSSCounterDescList.inc"
#undef CSS_COUNTER_DESC
};

static constexpr CSSPropFlags kFlagsTable[eCSSProperty_COUNT_with_aliases] = {
#define CSS_PROP_LONGHAND(name_, id_, method_, flags_, ...) flags_,
#define CSS_PROP_SHORTHAND(name_, id_, method_, flags_, ...) flags_,
#define CSS_PROP_ALIAS(name_, aliasid_, id_, method_, flags_, ...) flags_,
#include "mozilla/ServoCSSPropList.h"
#undef CSS_PROP_ALIAS
#undef CSS_PROP_SHORTHAND
#undef CSS_PROP_LONGHAND
};

template <size_t N>
static constexpr bool DescsAreValid(const nsLiteralCString (&aDescs)[N]) {
  for (const nsLiteralCString& desc : aDescs) {
    for (size_t i = 0; i < desc.Length(); ++i) {
      unsigned char c = desc.CharAt(i);
      if (!IS_ASCII(c) || IS_ASCII_UPPER(c) || c == '_') {
        return false;
      }
    }
  }
  return true;
}
static_assert(DescsAreValid(kCSSRawFontDescs),
              "invalid desc in nsCSSFontDescList.inc");
static_assert(DescsAreValid(kCSSRawCounterDescs),
              "invalid desc in nsCSSCounterDescList.inc");

void nsCSSProps::RecomputeEnabledState(const char* aPref, void*) {
  MOZ_RELEASE_ASSERT(NS_IsMainThread());
  DebugOnly<bool> foundPref = false;
  for (const PropertyPref* pref = kPropertyPrefTable;
       pref->mPropId != eCSSProperty_UNKNOWN; pref++) {
    if (!aPref || !strcmp(aPref, pref->mPref)) {
      foundPref = true;
      gPropertyEnabled[pref->mPropId] = Preferences::GetBool(pref->mPref);
      if (pref->mPropId == eCSSProperty_backdrop_filter) {
        gPropertyEnabled[pref->mPropId] &=
            gfx::gfxVars::GetAllowBackdropFilterOrDefault();
      }
#ifdef FUZZING
      // In fuzzing builds we want to enable all properties unconditionally.
      gPropertyEnabled[pref->mPropId] = true;
#endif
    }
  }
  MOZ_ASSERT(foundPref);
}

void nsCSSProps::Init() {
  MOZ_ASSERT(!gPropertyIDLNameTable, "pre existing array!");

  gPropertyIDLNameTable =
      new nsTHashMap<nsCStringHashKey, NonCustomCSSPropertyId>;
  for (NonCustomCSSPropertyId p = NonCustomCSSPropertyId(0);
       size_t(p) < std::size(kIDLNameTable);
       p = NonCustomCSSPropertyId(p + 1)) {
    if (kIDLNameTable[p]) {
      gPropertyIDLNameTable->InsertOrUpdate(
          nsDependentCString(kIDLNameTable[p]), p);
    }
  }

  ClearOnShutdown(&gPropertyIDLNameTable);

  for (const PropertyPref* pref = kPropertyPrefTable;
       pref->mPropId != eCSSProperty_UNKNOWN; pref++) {
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1472523
    // We need to use nsCString instead of substring because the preference
    // callback code stores them. Using AssignLiteral prevents any
    // unnecessary allocations.
    nsCString prefName;
    prefName.AssignLiteral(pref->mPref, strlen(pref->mPref));
    Preferences::RegisterCallback(nsCSSProps::RecomputeEnabledState, prefName);
  }
  RecomputeEnabledState(/* aPrefName = */ nullptr);
}

/* static */
bool nsCSSProps::IsCustomPropertyName(const nsACString& aProperty) {
  return aProperty.Length() >= CSS_CUSTOM_NAME_PREFIX_LENGTH &&
         StringBeginsWith(aProperty, "--"_ns);
}

NonCustomCSSPropertyId nsCSSProps::LookupPropertyByIDLName(
    const nsACString& aPropertyIDLName, EnabledState aEnabled) {
  MOZ_ASSERT(gPropertyIDLNameTable, "no lookup table, needs addref");
  NonCustomCSSPropertyId res;
  if (!gPropertyIDLNameTable->Get(aPropertyIDLName, &res)) {
    return eCSSProperty_UNKNOWN;
  }
  MOZ_ASSERT(res < eCSSProperty_COUNT);
  if (!IsEnabled(res, aEnabled)) {
    return eCSSProperty_UNKNOWN;
  }
  return res;
}

nsCSSFontDesc nsCSSProps::LookupFontDesc(const nsACString& aFontDesc) {
  // NOTE: This method does chained comparisons as there are only 14 items in
  // `nsCSSFontDescList.inc`. A more advanced table-based lookup may be
  // warranted if this grows substantially.
#define CSS_FONT_DESC(name_, method_)             \
  if (aFontDesc.LowerCaseEqualsLiteral(#name_)) { \
    return eCSSFontDesc_##method_;                \
  }
#include "nsCSSFontDescList.inc"
#undef CSS_FONT_DESC

  return eCSSFontDesc_UNKNOWN;
}

static constexpr auto sDescNullStr = ""_ns;

const nsCString& nsCSSProps::GetStringValue(nsCSSFontDesc aFontDescID) {
  if (eCSSFontDesc_UNKNOWN < aFontDescID && aFontDescID < eCSSFontDesc_COUNT) {
    return kCSSRawFontDescs[size_t(aFontDescID)];
  }
  return sDescNullStr;
}

const nsCString& nsCSSProps::GetStringValue(nsCSSCounterDesc aCounterDescID) {
  if (eCSSCounterDesc_UNKNOWN < aCounterDescID &&
      aCounterDescID < eCSSCounterDesc_COUNT) {
    return kCSSRawCounterDescs[size_t(aCounterDescID)];
  }
  return sDescNullStr;
}

CSSPropFlags nsCSSProps::PropFlags(NonCustomCSSPropertyId aProperty) {
  MOZ_ASSERT(aProperty != eCSSProperty_UNKNOWN &&
                 aProperty < eCSSProperty_COUNT_with_aliases,
             "out of range");
  return kFlagsTable[aProperty];
}

/* static */
bool nsCSSProps::gPropertyEnabled[eCSSProperty_COUNT_with_aliases] = {
// If the property has any "ENABLED_IN" flag set, it is disabled by
// default. Note that, if a property has pref, whatever its default
// value is, it will later be changed in nsCSSProps::AddRefTable().
// If the property has "ENABLED_IN" flags but doesn't have a pref,
// it is an internal property which is disabled elsewhere.
#define IS_ENABLED_BY_DEFAULT(flags_) \
  (!((flags_) & (CSSPropFlags::EnabledMask | CSSPropFlags::Inaccessible)))

#define CSS_PROP_LONGHAND(name_, id_, method_, flags_, ...) \
  IS_ENABLED_BY_DEFAULT(flags_),
#define CSS_PROP_SHORTHAND(name_, id_, method_, flags_, ...) \
  IS_ENABLED_BY_DEFAULT(flags_),
#define CSS_PROP_ALIAS(name_, aliasid_, id_, method_, flags_, ...) \
  IS_ENABLED_BY_DEFAULT(flags_),
#include "mozilla/ServoCSSPropList.h"
#undef CSS_PROP_ALIAS
#undef CSS_PROP_SHORTHAND
#undef CSS_PROP_LONGHAND

#undef IS_ENABLED_BY_DEFAULT
};

/**
 * A singleton class to register as a receiver for gfxVars.
 * Updates the state of backdrop-filter's pref if the gfx
 * backdrop filter var changes state.
 */
class nsCSSPropsGfxVarReceiver final : public gfx::gfxVarReceiver {
  constexpr nsCSSPropsGfxVarReceiver() = default;

  // Backdrop filter's last known enabled state.
  static bool sLastKnownAllowBackdropFilter;
  static nsCSSPropsGfxVarReceiver sInstance;

 public:
  static gfx::gfxVarReceiver& GetInstance() { return sInstance; }

  void OnVarChanged(const nsTArray<gfx::GfxVarUpdate>&) override {
    bool enabled = gfx::gfxVars::AllowBackdropFilter();
    if (sLastKnownAllowBackdropFilter != enabled) {
      sLastKnownAllowBackdropFilter = enabled;
      nsCSSProps::RecomputeEnabledState(
          StaticPrefs::GetPrefName_layout_css_backdrop_filter_enabled());
    }
  }
};

/* static */
nsCSSPropsGfxVarReceiver nsCSSPropsGfxVarReceiver::sInstance =
    nsCSSPropsGfxVarReceiver();

/* static */
bool nsCSSPropsGfxVarReceiver::sLastKnownAllowBackdropFilter = true;

/* static */
gfx::gfxVarReceiver& nsCSSProps::GfxVarReceiver() {
  return nsCSSPropsGfxVarReceiver::GetInstance();
}

#include "nsCSSPropsGenerated.inc"
