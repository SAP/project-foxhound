/* -*- Mode: C++; tab-width: 2; indent-tabs-mode:nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "Quotes.h"
#include "mozilla/ClearOnShutdown.h"
#include "mozilla/StaticPtr.h"
#include "mozilla/intl/Locale.h"
#include "nsTHashMap.h"
#include "nsPrintfCString.h"

using namespace mozilla;
using namespace mozilla::intl;

namespace {
struct LangQuotesRec {
  const char* mLangs;
  Quotes mQuotes;
};

#include "cldr-quotes.inc"

static StaticAutoPtr<nsTHashMap<nsCStringHashKey, Quotes>> sQuotesForLang;
}  // anonymous namespace

namespace mozilla {
namespace intl {

const Quotes* QuotesForLang(const nsAtom* aLang) {
  MOZ_ASSERT(NS_IsMainThread());

  // On first use, initialize the hashtable from our CLDR-derived data array.
  if (!sQuotesForLang) {
    sQuotesForLang = new nsTHashMap<nsCStringHashKey, Quotes>(32);
    ClearOnShutdown(&sQuotesForLang);
    for (const auto& i : sLangQuotes) {
      const char* s = i.mLangs;
      size_t len;
      while ((len = strlen(s))) {
        sQuotesForLang->InsertOrUpdate(nsDependentCString(s, len), i.mQuotes);
        s += len + 1;
      }
    }
  }

  nsAtomCString langStr(aLang);
  const Quotes* entry = sQuotesForLang->Lookup(langStr).DataPtrOrNull();
  if (entry) {
    // Found an exact match for the requested lang.
    return entry;
  }

  // Try parsing lang as a Locale, then see if we can match it with region or
  // script subtags, if present, or just the primary language tag.
  // Note that the locale code (if well-formed) will have been canonicalized by
  // the attribute-mapping code, so we can rely on the expected casing for each
  // type of subtag.
  Locale loc;
  auto result = LocaleParser::TryParse(langStr, loc);
  if (result.isErr()) {
    return nullptr;
  }
  // Extract the primary language tag.
  const Span<const char> langAsSpan = loc.Language().Span();
  nsAutoCString lang(langAsSpan.data(), langAsSpan.size());
  const auto langLen = lang.Length();
  // See if we can match language + region.
  if (loc.Region().Present()) {
    lang.Append('-');
    lang.Append(loc.Region().Span());
    if ((entry = sQuotesForLang->Lookup(lang).DataPtrOrNull())) {
      return entry;
    }
    lang.Truncate(langLen);
  }
  // See if we can match language + script.
  if (loc.Script().Present()) {
    lang.Append('-');
    lang.Append(loc.Script().Span());
    if ((entry = sQuotesForLang->Lookup(lang).DataPtrOrNull())) {
      return entry;
    }
    lang.Truncate(langLen);
  }
  // OK, just try the primary language tag alone.
  if ((entry = sQuotesForLang->Lookup(lang).DataPtrOrNull())) {
    return entry;
  }

  return nullptr;
}

}  // namespace intl
}  // namespace mozilla
