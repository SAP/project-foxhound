/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#ifndef FontVisibilityProvider_h_
#define FontVisibilityProvider_h_

#include <stdint.h>

#include "mozilla/Maybe.h"
#include "nsICookieJarSettings.h"

class nsPresContext;
class gfxFontFamily;
class gfxUserFontEntry;
enum class FontVisibility : uint8_t;
namespace mozilla {
enum class RFPTarget : uint64_t;
namespace dom {
class OffscreenCanvasRenderingContext2D;
class Document;
}  // namespace dom
namespace fontlist {
struct Family;
}
}  // namespace mozilla

// We need this class to provide the font visibility information.
// Offscreen canvases can load fonts but don't have a presContext.
// With this class, we provide a way to get the font visibility
// for offscreen canvases and everything else. If we ever want
// to change or add more font visibility checks, we can do it here
// instead of changing the code in multiple files (at the time of
// writing this comment, around ~30 files).
class FontVisibilityProvider {
 public:
  virtual FontVisibility GetFontVisibility() const = 0;
  virtual bool ShouldResistFingerprinting(mozilla::RFPTarget aTarget) const = 0;
  virtual void ReportBlockedFontFamily(const nsCString& aMsg) const = 0;
  virtual bool IsChrome() const = 0;
  virtual bool IsPrivateBrowsing() const = 0;
  virtual nsICookieJarSettings* GetCookieJarSettings() const = 0;
  virtual mozilla::Maybe<FontVisibility> MaybeInheritFontVisibility() const = 0;
  virtual void UserFontSetUpdated(gfxUserFontEntry* aUpdatedFont = nullptr) = 0;

  void ReportBlockedFontFamily(const gfxFontFamily& aFamily) const;
  void ReportBlockedFontFamily(const mozilla::fontlist::Family& aFamily) const;
  void FormatBlockedFontFamilyMessage(nsCString& aMsg, const nsCString& aFamily,
                                      FontVisibility aVisibility) const;
  FontVisibility ComputeFontVisibility() const;

#define FONT_VISIBILITY_PROVIDER_IMPL                                         \
  FontVisibility GetFontVisibility() const override;                          \
  bool ShouldResistFingerprinting(mozilla::RFPTarget aTarget) const override; \
  void ReportBlockedFontFamily(const nsCString& aMsg) const override;         \
  bool IsChrome() const override;                                             \
  bool IsPrivateBrowsing() const override;                                    \
  nsICookieJarSettings* GetCookieJarSettings() const override;                \
  mozilla::Maybe<FontVisibility> MaybeInheritFontVisibility() const override; \
  void UserFontSetUpdated(gfxUserFontEntry* aUpdatedFont = nullptr) override; \
  using FontVisibilityProvider::ReportBlockedFontFamily;
};

#endif  // FontVisibilityProvider_h_
