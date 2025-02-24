/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nsFont_h___
#define nsFont_h___

#include <cstdint>
#include "gfxFontConstants.h"  // for NS_FONT_KERNING_AUTO, etc
#include "gfxFontVariations.h"
#include "mozilla/ServoStyleConsts.h"
#include "mozilla/StyleColorInlines.h"  // for StyleAbsoluteColor
#include "nsTArray.h"                   // for nsTArray

struct gfxFontFeature;
struct gfxFontStyle;

// Font structure.
struct nsFont final {
  typedef mozilla::FontStretch FontStretch;
  typedef mozilla::FontSlantStyle FontSlantStyle;
  typedef mozilla::FontWeight FontWeight;

  // List of font families, either named or generic.
  mozilla::StyleFontFamily family;

  // Font features from CSS font-feature-settings
  CopyableTArray<gfxFontFeature> fontFeatureSettings;

  // Font variations from CSS font-variation-settings
  CopyableTArray<gfxFontVariation> fontVariationSettings;

  // The logical size of the font, in CSS Pixels
  mozilla::NonNegativeLength size{0};

  // The aspect-value (ie., the ratio actualsize:actualxheight) that any
  // actual physical font created from this font structure must have when
  // rendering or measuring a string. The value must be nonnegative.
  mozilla::StyleFontSizeAdjust sizeAdjust =
      mozilla::StyleFontSizeAdjust::None();

  // Language system tag, to override document language;
  // this is an OpenType "language system" tag represented as a 32-bit integer
  // (see http://www.microsoft.com/typography/otspec/languagetags.htm).
  mozilla::StyleFontLanguageOverride languageOverride{0};

  // Font-selection/rendering properties corresponding to CSS font-style,
  // font-weight, font-stretch. These are all 16-bit types.
  FontSlantStyle style = FontSlantStyle::NORMAL;
  FontWeight weight = FontWeight::NORMAL;
  FontStretch stretch = FontStretch::NORMAL;

  // Some font-variant-alternates property values require
  // font-specific settings defined via @font-feature-values rules.
  // These are resolved *after* font matching occurs.
  mozilla::StyleFontVariantAlternates variantAlternates;

  // Variant subproperties
  mozilla::StyleFontVariantLigatures variantLigatures =
      mozilla::StyleFontVariantLigatures::NORMAL;
  mozilla::StyleFontVariantEastAsian variantEastAsian =
      mozilla::StyleFontVariantEastAsian::NORMAL;

  uint8_t variantCaps = NS_FONT_VARIANT_CAPS_NORMAL;
  mozilla::StyleFontVariantNumeric variantNumeric =
      mozilla::StyleFontVariantNumeric::NORMAL;
  uint8_t variantPosition = NS_FONT_VARIANT_POSITION_NORMAL;
  uint8_t variantWidth = NS_FONT_VARIANT_WIDTH_NORMAL;
  StyleFontVariantEmoji variantEmoji = StyleFontVariantEmoji::Normal;

  // Smoothing - controls subpixel-antialiasing (currently OSX only)
  uint8_t smoothing = NS_FONT_SMOOTHING_AUTO;

  // Kerning
  uint8_t kerning = NS_FONT_KERNING_AUTO;

  // Whether automatic optical sizing should be applied to variation fonts
  // that include an 'opsz' axis
  uint8_t opticalSizing = NS_FONT_OPTICAL_SIZING_AUTO;

  // Synthesis setting, controls use of fake bolding/italics/small-caps
  mozilla::StyleFontSynthesis synthesisWeight =
      mozilla::StyleFontSynthesis::Auto;
  mozilla::StyleFontSynthesis synthesisStyle =
      mozilla::StyleFontSynthesis::Auto;
  mozilla::StyleFontSynthesis synthesisSmallCaps =
      mozilla::StyleFontSynthesis::Auto;
  mozilla::StyleFontSynthesis synthesisPosition =
      mozilla::StyleFontSynthesis::Auto;

  // initialize the font with a fontlist
  nsFont(const mozilla::StyleFontFamily&, mozilla::Length aSize);

  // initialize the font with a single generic
  nsFont(mozilla::StyleGenericFontFamily, mozilla::Length aSize);

  // Make a copy of the given font
  nsFont(const nsFont& aFont);

  // leave members uninitialized
  nsFont() = default;
  ~nsFont();

  bool operator==(const nsFont& aOther) const { return Equals(aOther); }

  bool operator!=(const nsFont& aOther) const { return !Equals(aOther); }

  bool Equals(const nsFont& aOther) const;

  nsFont& operator=(const nsFont& aOther);

  enum class MaxDifference : uint8_t { eNone, eVisual, eLayoutAffecting };

  MaxDifference CalcDifference(const nsFont& aOther) const;

  // Add featureSettings into style
  void AddFontFeaturesToStyle(gfxFontStyle* aStyle, bool aVertical) const;

  void AddFontVariationsToStyle(gfxFontStyle* aStyle) const;
};

#define NS_FONT_VARIANT_NORMAL 0
#define NS_FONT_VARIANT_SMALL_CAPS 1

#endif /* nsFont_h___ */
