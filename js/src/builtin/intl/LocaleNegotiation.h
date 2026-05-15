/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: set ts=8 sts=2 et sw=2 tw=80:
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef builtin_intl_LocaleNegotiation_h
#define builtin_intl_LocaleNegotiation_h

#include "mozilla/EnumeratedArray.h"
#include "mozilla/EnumSet.h"
#include "mozilla/EnumTypeTraits.h"

#include <stdint.h>

#include "js/RootingAPI.h"
#include "js/TypeDecls.h"

class JSLinearString;

namespace js {
class ArrayObject;
}

namespace js::intl {
enum class UnicodeExtensionKey : uint8_t {
  Calendar /* ca */,
  Collation /* co */,
  CollationCaseFirst /* kf */,
  CollationNumeric /* kn */,
  HourCycle /* hc */,
  NumberingSystem /* nu */,
};
}

namespace mozilla {
template <>
struct MaxContiguousEnumValue<js::intl::UnicodeExtensionKey> {
  static constexpr auto value = js::intl::UnicodeExtensionKey::NumberingSystem;
};
}  // namespace mozilla

namespace js::intl {

enum class AvailableLocaleKind;

using LocalesList = JS::StackGCVector<JSLinearString*>;

/**
 * Canonicalizes a locale list.
 *
 * Spec: ECMAScript Internationalization API Specification, 9.2.1.
 */
bool CanonicalizeLocaleList(JSContext* cx, JS::Handle<JS::Value> locales,
                            JS::MutableHandle<LocalesList> result);

ArrayObject* LocalesListToArray(JSContext* cx, JS::Handle<LocalesList> locales);

/**
 * Compares a BCP 47 language tag against the locales in availableLocales and
 * returns the best available match -- or |nullptr| if no match was found.
 * Uses the fallback mechanism of RFC 4647, section 3.4.
 *
 * The set of available locales consulted doesn't necessarily include the
 * default locale or any generalized forms of it (e.g. "de" is a more-general
 * form of "de-CH"). If you want to be sure to consider the default local and
 * its generalized forms (you usually will), pass the default locale as the
 * value of |defaultLocale|; otherwise pass |nullptr|.
 *
 * Spec: ECMAScript Internationalization API Specification, 9.2.2.
 * Spec: RFC 4647, section 3.4.
 */
bool BestAvailableLocale(JSContext* cx, AvailableLocaleKind availableLocales,
                         JS::Handle<JSLinearString*> locale,
                         JS::Handle<JSLinearString*> defaultLocale,
                         JS::MutableHandle<JSLinearString*> result);

class LookupMatcherResult final {
  JSLinearString* locale_ = nullptr;
  JSLinearString* extension_ = nullptr;

 public:
  LookupMatcherResult() = default;
  LookupMatcherResult(JSLinearString* locale, JSLinearString* extension)
      : locale_(locale), extension_(extension) {}

  auto* locale() const { return locale_; }
  auto* extension() const { return extension_; }

  // Helper methods for WrappedPtrOperations.
  auto localeDoNotUse() const { return &locale_; }
  auto extensionDoNotUse() const { return &extension_; }

  // Trace implementation.
  void trace(JSTracer* trc);
};

/**
 * Compares a BCP 47 language priority list against the set of locales in
 * availableLocales and determines the best available language to meet the
 * request. Options specified through Unicode extension subsequences are
 * ignored in the lookup, but information about such subsequences is returned
 * separately.
 *
 * This variant is based on the Lookup algorithm of RFC 4647 section 3.4.
 *
 * Spec: ECMAScript Internationalization API Specification, 9.2.3.
 * Spec: RFC 4647, section 3.4.
 */
bool LookupMatcher(JSContext* cx, AvailableLocaleKind availableLocales,
                   JS::Handle<ArrayObject*> locales,
                   JS::MutableHandle<LookupMatcherResult> result);

/**
 * Locale data selection for ResolveLocale.
 */
enum class LocaleData {
  /**
   * Use the default locale data.
   */
  Default,

  /**
   * Use the locale data for "search" collations.
   */
  CollatorSearch,
};

/**
 * Locale options for the ResolveLocale operation.
 */
class LocaleOptions final {
  mozilla::EnumeratedArray<UnicodeExtensionKey, JSLinearString*> extensions_{};
  mozilla::EnumSet<UnicodeExtensionKey> set_{};

 public:
  LocaleOptions() = default;

  /**
   * Return `true` if the requested Unicode extension key is present.
   */
  bool hasUnicodeExtension(UnicodeExtensionKey key) const {
    return set_.contains(key);
  }

  /**
   * Get the requested Unicode extension value.
   *
   * Some Unicode extension options can be set to `nullptr`, so this method can
   * return `nullptr` even if `hasUnicodeExtension(key)` returned `true`.
   */
  auto* getUnicodeExtension(UnicodeExtensionKey key) const {
    return extensions_[key];
  }

  /**
   * Set a Unicode extension. Unicode extension keys can be set to `nullptr`.
   */
  void setUnicodeExtension(UnicodeExtensionKey key, JSLinearString* extension) {
    extensions_[key] = extension;
    set_ += key;
  }

  // Helper methods for WrappedPtrOperations.
  auto extensionDoNotUse(UnicodeExtensionKey key) const {
    return &extensions_[key];
  }

  // Trace implementation.
  void trace(JSTracer* trc);
};

/**
 * Resolved locale returned from the ResolveLocale operation.
 */
class ResolvedLocale final {
  JSLinearString* dataLocale_ = nullptr;
  mozilla::EnumeratedArray<UnicodeExtensionKey, JSLinearString*> extensions_{};
  mozilla::EnumSet<UnicodeExtensionKey> keywords_{};

 public:
  ResolvedLocale() = default;

  /**
   * Return the resolved data locale. Does not include any Unicode extension
   * sequences.
   */
  auto* dataLocale() const { return dataLocale_; }

  /**
   * Return the Unicode extension value for the requested key.
   */
  auto* extension(UnicodeExtensionKey key) const { return extensions_[key]; }

  /**
   * Return the set of Unicode extension keywords in the resolved locale.
   */
  auto keywords() const { return keywords_; }

  /**
   * Return the resolved locale, including Unicode extensions.
   */
  JSLinearString* toLocale(JSContext* cx) const;

  // Setter functions called in ResolveLocale to initialize the resolved locale.
  void setDataLocale(JSLinearString* dataLocale) { dataLocale_ = dataLocale; }
  void setUnicodeExtension(UnicodeExtensionKey key, JSLinearString* extension) {
    extensions_[key] = extension;
  }
  void setUnicodeKeywords(mozilla::EnumSet<UnicodeExtensionKey> keywords) {
    keywords_ = keywords;
  }

  // Helper methods for WrappedPtrOperations.
  auto dataLocaleDoNotUse() const { return &dataLocale_; }
  auto extensionDoNotUse(UnicodeExtensionKey key) const {
    return &extensions_[key];
  }

  // Trace implementation.
  void trace(JSTracer* trc);
};

/**
 * Compares a BCP 47 language priority list against availableLocales and
 * determines the best available language to meet the request. Options specified
 * through Unicode extension subsequences are negotiated separately, taking the
 * caller's relevant extensions and locale data as well as client-provided
 * options into consideration.
 *
 * Spec: ECMAScript Internationalization API Specification, 9.2.6.
 */
bool ResolveLocale(JSContext* cx, AvailableLocaleKind availableLocales,
                   JS::Handle<ArrayObject*> requestedLocales,
                   JS::Handle<LocaleOptions> options,
                   mozilla::EnumSet<UnicodeExtensionKey> relevantExtensionKeys,
                   LocaleData localeData,
                   JS::MutableHandle<ResolvedLocale> result);

/**
 * Return the supported locales in |locales| which are supported according to
 * |availableLocales|.
 */
ArrayObject* SupportedLocalesOf(JSContext* cx,
                                AvailableLocaleKind availableLocales,
                                JS::Handle<JS::Value> locales,
                                JS::Handle<JS::Value> options);

/**
 * Return the supported locale for the default locale if ICU supports that
 * default locale (perhaps via fallback, e.g. supporting "de-CH" through "de"
 * support implied by a "de-DE" locale). Otherwise uses the last-ditch locale.
 */
JSLinearString* ComputeDefaultLocale(JSContext* cx);

}  // namespace js::intl

namespace js {

template <typename Wrapper>
class WrappedPtrOperations<intl::LookupMatcherResult, Wrapper> {
  const auto& container() const {
    return static_cast<const Wrapper*>(this)->get();
  }

 public:
  JS::Handle<JSLinearString*> locale() const {
    return JS::Handle<JSLinearString*>::fromMarkedLocation(
        container().localeDoNotUse());
  }

  JS::Handle<JSLinearString*> extension() const {
    return JS::Handle<JSLinearString*>::fromMarkedLocation(
        container().extensionDoNotUse());
  }
};

template <typename Wrapper>
class WrappedPtrOperations<intl::LocaleOptions, Wrapper> {
  const auto& container() const {
    return static_cast<const Wrapper*>(this)->get();
  }

 public:
  bool hasUnicodeExtension(intl::UnicodeExtensionKey key) const {
    return container().hasUnicodeExtension(key);
  }

  JS::Handle<JSLinearString*> getUnicodeExtension(
      intl::UnicodeExtensionKey key) const {
    return JS::Handle<JSLinearString*>::fromMarkedLocation(
        container().extensionDoNotUse(key));
  }
};

template <typename Wrapper>
class MutableWrappedPtrOperations<intl::LocaleOptions, Wrapper>
    : public WrappedPtrOperations<intl::LocaleOptions, Wrapper> {
  auto& container() { return static_cast<Wrapper*>(this)->get(); }

 public:
  void setUnicodeExtension(intl::UnicodeExtensionKey key,
                           JSLinearString* extension) {
    container().setUnicodeExtension(key, extension);
  }
};

template <typename Wrapper>
class WrappedPtrOperations<intl::ResolvedLocale, Wrapper> {
  const auto& container() const {
    return static_cast<const Wrapper*>(this)->get();
  }

 public:
  JS::Handle<JSLinearString*> dataLocale() const {
    return JS::Handle<JSLinearString*>::fromMarkedLocation(
        container().dataLocaleDoNotUse());
  }
  JS::Handle<JSLinearString*> extension(intl::UnicodeExtensionKey key) const {
    return JS::Handle<JSLinearString*>::fromMarkedLocation(
        container().extensionDoNotUse(key));
  }
  mozilla::EnumSet<intl::UnicodeExtensionKey> keywords() const {
    return container().keywords();
  }
  JSLinearString* toLocale(JSContext* cx) const {
    return container().toLocale(cx);
  }
};

template <typename Wrapper>
class MutableWrappedPtrOperations<intl::ResolvedLocale, Wrapper>
    : public WrappedPtrOperations<intl::ResolvedLocale, Wrapper> {
  auto& container() { return static_cast<Wrapper*>(this)->get(); }

 public:
  void setDataLocale(JSLinearString* locale) {
    container().setDataLocale(locale);
  }
  void setUnicodeExtension(intl::UnicodeExtensionKey key,
                           JSLinearString* extension) {
    container().setUnicodeExtension(key, extension);
  }
  void setUnicodeKeywords(
      mozilla::EnumSet<intl::UnicodeExtensionKey> keywords) {
    container().setUnicodeKeywords(keywords);
  }
};

}  // namespace js

#endif /* builtin_intl_LocaleNegotiation_h */
