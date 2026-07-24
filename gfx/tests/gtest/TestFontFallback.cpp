/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "gtest/gtest.h"
#include "gfxPlatform.h"
#include "gfxPlatformFontList.h"
#include "gfxTypes.h"
#include "nsReadableUtils.h"
#include "nsString.h"
#include "nsTArray.h"

class FontFallbackTest : public ::testing::Test {
 protected:
  static void SetUpTestSuite() {
    // Initialize gfxPlatform which also initializes the font list
    gfxPlatform::GetPlatform();
  }

  static bool FontHasCharacter(gfxPlatformFontList* pfl,
                               const nsCString& fontName, uint32_t ch) {
    nsAutoString text;
    AppendUCS4ToUTF16(ch, text);
    nsTArray<nsCString> fontList;
    fontList.AppendElement(fontName);
    nsTArray<nsCString> fontsUsed;
    pfl->ListFontsUsedForString(text, fontList, fontsUsed);
    if (fontsUsed.IsEmpty()) {
      return false;
    }
    // Verify the returned font actually matches the requested one,
    // not a global fallback font.
    nsCString actualLower(fontsUsed[0]);
    ToLowerCase(actualLower);
    nsCString expectedLower(fontName);
    ToLowerCase(expectedLower);
    return actualLower.Equals(expectedLower);
  }
};

TEST_F(FontFallbackTest, ListFontsUsedForString_EmptyInput) {
  gfxPlatformFontList* pfl = gfxPlatformFontList::PlatformFontList();
  ASSERT_NE(pfl, nullptr);

  nsTArray<nsCString> fontList;
  fontList.AppendElement("DejaVu Sans"_ns);

  nsTArray<nsCString> fontsUsed;

  pfl->ListFontsUsedForString(nsAutoString(), fontList, fontsUsed);

  EXPECT_EQ(fontsUsed.Length(), 0u) << "Empty text should use no fonts";
}

TEST_F(FontFallbackTest, ListFontsUsedForString_EmptyFontList) {
  gfxPlatformFontList* pfl = gfxPlatformFontList::PlatformFontList();
  ASSERT_NE(pfl, nullptr);

  nsTArray<nsCString> emptyFontList;
  nsTArray<nsCString> fontsUsed;

  pfl->ListFontsUsedForString(u"Hi"_ns, emptyFontList, fontsUsed);

  EXPECT_EQ(fontsUsed.Length(), 0u) << "Empty font list should use no fonts";
}

TEST_F(FontFallbackTest, ListFontsUsedForString_BasicUsage) {
  gfxPlatformFontList* pfl = gfxPlatformFontList::PlatformFontList();
  ASSERT_NE(pfl, nullptr);

  // Find a font that exists on this system
  const char* commonFonts[] = {"DejaVu Sans", "Liberation Sans", "Roboto",
                               "Noto Sans",   "Arial",           "Helvetica",
                               "Sans"};

  nsCString workingFont;
  for (const char* fontNameStr : commonFonts) {
    nsCString fontName(fontNameStr);
    if (FontHasCharacter(pfl, fontName, 'A')) {
      workingFont = fontName;
      break;
    }
  }

  if (workingFont.IsEmpty()) {
    GTEST_SKIP() << "No common test fonts available on this system";
  }

  nsTArray<nsCString> fontList;
  fontList.AppendElement(workingFont);

  nsTArray<nsCString> fontsUsed;

  pfl->ListFontsUsedForString(u"Hello"_ns, fontList, fontsUsed);

  EXPECT_EQ(fontsUsed.Length(), 1u)
      << "Should use exactly one font for 'Hello'";

  if (fontsUsed.Length() > 0) {
    // The font name will be lowercased by GenerateFontListKey
    nsCString expectedLower(workingFont);
    ToLowerCase(expectedLower);
    nsCString actualLower(fontsUsed[0]);
    ToLowerCase(actualLower);
    EXPECT_EQ(actualLower, expectedLower);
  }
}

TEST_F(FontFallbackTest, ListFontsUsedForString_NonExistentFont) {
  gfxPlatformFontList* pfl = gfxPlatformFontList::PlatformFontList();
  ASSERT_NE(pfl, nullptr);

  nsTArray<nsCString> fontList;
  fontList.AppendElement("This Font Does Not Exist 12345"_ns);

  nsTArray<nsCString> fontsUsed;

  pfl->ListFontsUsedForString(u"A"_ns, fontList, fontsUsed);

  // The non-existent font won't be found, but global fallback will find a
  // system font to render 'A'.
  EXPECT_EQ(fontsUsed.Length(), 1u)
      << "Global fallback should find exactly one font for 'A'";
}

TEST_F(FontFallbackTest, ListFontsUsedForString_FallbackOrder) {
  gfxPlatformFontList* pfl = gfxPlatformFontList::PlatformFontList();
  ASSERT_NE(pfl, nullptr);

  // Find two fonts that exist
  const char* commonFonts[] = {
      "DejaVu Sans",  "Liberation Sans",  "Roboto",     "Noto Sans",
      "DejaVu Serif", "Liberation Serif", "Noto Serif", "Nimbus Sans",
      "Nimbus Roman", "FreeSans",         "FreeSerif"};

  nsTArray<nsCString> existingFonts;
  for (const char* fontNameStr : commonFonts) {
    nsCString fontName(fontNameStr);
    if (FontHasCharacter(pfl, fontName, 'A')) {
      existingFonts.AppendElement(fontName);
      if (existingFonts.Length() >= 2) {
        break;
      }
    }
  }

  if (existingFonts.Length() < 2) {
    GTEST_SKIP() << "Need at least 2 fonts for fallback order test";
  }

  // Test that first font in list wins
  nsTArray<nsCString> fontList;
  fontList.AppendElement(existingFonts[0]);
  fontList.AppendElement(existingFonts[1]);

  nsTArray<nsCString> fontsUsed;

  pfl->ListFontsUsedForString(u"A"_ns, fontList, fontsUsed);

  EXPECT_EQ(fontsUsed.Length(), 1u);
  if (fontsUsed.Length() > 0) {
    nsCString expectedLower(existingFonts[0]);
    ToLowerCase(expectedLower);
    nsCString actualLower(fontsUsed[0]);
    ToLowerCase(actualLower);
    EXPECT_EQ(actualLower, expectedLower)
        << "First font in list should be used when both have the character";
  }
}

TEST_F(FontFallbackTest, ListFontsUsedForString_MultipleFontsWithEmoji) {
  gfxPlatformFontList* pfl = gfxPlatformFontList::PlatformFontList();
  ASSERT_NE(pfl, nullptr);

  // U+1F600 = 😀 (grinning face)
  const uint32_t grinningFace = 0x1F600;

  // Find a text font that has 'A' but not emoji
  const char* textFonts[] = {"DejaVu Sans", "Liberation Sans", "Roboto",
                             "Noto Sans",   "DejaVu Serif",    "FreeSans",
                             "Nimbus Sans"};
  // Find an emoji font that has emoji
  const char* emojiFonts[] = {"Noto Color Emoji", "Noto Emoji",
                              "Twemoji",          "EmojiOne",
                              "Symbola",          "Segoe UI Emoji"};

  nsCString textFont;
  for (const char* fontNameStr : textFonts) {
    nsCString fontName(fontNameStr);
    bool hasA = FontHasCharacter(pfl, fontName, 'A');
    bool hasEmoji = FontHasCharacter(pfl, fontName, grinningFace);
    // Want a font that has 'A' but NOT the emoji
    if (hasA && !hasEmoji) {
      textFont = fontName;
      break;
    }
  }

  nsCString emojiFont;
  for (const char* fontNameStr : emojiFonts) {
    nsCString fontName(fontNameStr);
    if (FontHasCharacter(pfl, fontName, grinningFace)) {
      emojiFont = fontName;
      break;
    }
  }

  if (textFont.IsEmpty() || emojiFont.IsEmpty()) {
    GTEST_SKIP() << "Need both a text font (without emoji) and an emoji font. "
                 << "textFont='"
                 << (textFont.IsEmpty() ? "(none)" : textFont.get()) << "' "
                 << "emojiFont='"
                 << (emojiFont.IsEmpty() ? "(none)" : emojiFont.get()) << "'";
  }

  // Test string: "Hi [grinning face]" - should need both fonts
  nsTArray<nsCString> fontList;
  fontList.AppendElement(textFont);
  fontList.AppendElement(emojiFont);

  nsTArray<nsCString> fontsUsed;

  pfl->ListFontsUsedForString(u"Hi \U0001F600"_ns, fontList, fontsUsed);

  EXPECT_EQ(fontsUsed.Length(), 2u)
      << "Should use exactly 2 fonts: one for text, one for emoji";

  if (fontsUsed.Length() == 2) {
    // Verify the fonts are what we expect (order should be textFont first)
    nsCString textFontLower(textFont);
    ToLowerCase(textFontLower);
    nsCString emojiFontLower(emojiFont);
    ToLowerCase(emojiFontLower);

    nsCString firstUsedLower(fontsUsed[0]);
    ToLowerCase(firstUsedLower);
    nsCString secondUsedLower(fontsUsed[1]);
    ToLowerCase(secondUsedLower);

    EXPECT_EQ(firstUsedLower, textFontLower)
        << "First font used should be the text font";
    EXPECT_EQ(secondUsedLower, emojiFontLower)
        << "Second font used should be the emoji font";
  }
}

TEST_F(FontFallbackTest, ListFontsUsedForString_VisibilityFilter) {
  gfxPlatformFontList* pfl = gfxPlatformFontList::PlatformFontList();
  ASSERT_NE(pfl, nullptr);

  // Find a font that exists on this system
  const char* commonFonts[] = {"DejaVu Sans", "Liberation Sans", "Roboto",
                               "Noto Sans",   "Arial",           "Helvetica",
                               "Sans"};

  nsCString workingFont;
  for (const char* fontNameStr : commonFonts) {
    nsCString fontName(fontNameStr);
    if (FontHasCharacter(pfl, fontName, 'A')) {
      workingFont = fontName;
      break;
    }
  }

  if (workingFont.IsEmpty()) {
    GTEST_SKIP() << "No common test fonts available on this system";
  }

  nsTArray<nsCString> fontList;
  fontList.AppendElement(workingFont);

  // Test with User visibility (default) - should work
  nsTArray<nsCString> fontsUsedUser;
  pfl->ListFontsUsedForString(u"A"_ns, fontList, fontsUsedUser,
                              FontVisibility::User);

  // The font should be found with User visibility (most permissive common case)
  // Note: We can't easily predict font visibility, so we just verify the API
  // works and returns consistent results

  // Test with Base visibility - more restrictive
  nsTArray<nsCString> fontsUsedBase;
  pfl->ListFontsUsedForString(u"A"_ns, fontList, fontsUsedBase,
                              FontVisibility::Base);

  // With Base visibility, we either get the font (if it's a base font) or not
  EXPECT_LE(fontsUsedBase.Length(), 1u)
      << "With Base visibility, should have at most one font";

  EXPECT_LE(fontsUsedUser.Length(), 1u)
      << "With User visibility, should have at most one font";
}

TEST_F(FontFallbackTest, ListFontsUsedForString_DefaultVisibility) {
  gfxPlatformFontList* pfl = gfxPlatformFontList::PlatformFontList();
  ASSERT_NE(pfl, nullptr);

  const char* commonFonts[] = {"DejaVu Sans", "Liberation Sans", "Roboto",
                               "Noto Sans",   "Arial",           "Helvetica",
                               "Sans"};

  nsCString workingFont;
  for (const char* fontNameStr : commonFonts) {
    nsCString fontName(fontNameStr);
    if (FontHasCharacter(pfl, fontName, 'A')) {
      workingFont = fontName;
      break;
    }
  }

  if (workingFont.IsEmpty()) {
    GTEST_SKIP() << "No common test fonts available on this system";
  }

  nsTArray<nsCString> fontList;
  fontList.AppendElement(workingFont);

  // Call without visibility parameter (should use default User)
  nsTArray<nsCString> fontsUsedDefault;
  pfl->ListFontsUsedForString(u"Test"_ns, fontList, fontsUsedDefault);

  // Call with explicit User visibility
  nsTArray<nsCString> fontsUsedUser;
  pfl->ListFontsUsedForString(u"Test"_ns, fontList, fontsUsedUser,
                              FontVisibility::User);

  // Results should be identical
  EXPECT_EQ(fontsUsedDefault.Length(), fontsUsedUser.Length())
      << "Default visibility should match explicit User visibility";
}

TEST_F(FontFallbackTest, ListFontsUsedForString_VisibilityMonotonicity) {
  gfxPlatformFontList* pfl = gfxPlatformFontList::PlatformFontList();
  ASSERT_NE(pfl, nullptr);

  const char* commonFonts[] = {"DejaVu Sans", "Liberation Sans", "Roboto",
                               "Noto Sans",   "Arial",           "Helvetica",
                               "Sans"};

  nsCString workingFont;
  for (const char* fontNameStr : commonFonts) {
    nsCString fontName(fontNameStr);
    if (FontHasCharacter(pfl, fontName, 'A')) {
      workingFont = fontName;
      break;
    }
  }

  if (workingFont.IsEmpty()) {
    GTEST_SKIP() << "No common test fonts available on this system";
  }

  nsTArray<nsCString> fontList;
  fontList.AppendElement(workingFont);

  // Test all visibility levels from most restrictive to least
  FontVisibility levels[] = {FontVisibility::Base, FontVisibility::LangPack,
                             FontVisibility::User, FontVisibility::Hidden};

  size_t prevFontsUsed = 0;
  for (FontVisibility vis : levels) {
    nsTArray<nsCString> fontsUsed;
    pfl->ListFontsUsedForString(u"Hello"_ns, fontList, fontsUsed, vis);

    // More permissive visibility should have at least as many fonts available
    EXPECT_GE(fontsUsed.Length(), prevFontsUsed)
        << "Visibility level " << static_cast<int>(vis)
        << " should not have fewer fonts than more restrictive levels";
    prevFontsUsed = fontsUsed.Length();
  }
}

TEST_F(FontFallbackTest, ListFontsUsedForString_VisibilityWithMultipleFonts) {
  gfxPlatformFontList* pfl = gfxPlatformFontList::PlatformFontList();
  ASSERT_NE(pfl, nullptr);

  // Find multiple fonts that exist
  const char* commonFonts[] = {
      "DejaVu Sans",  "Liberation Sans",  "Roboto",     "Noto Sans",
      "DejaVu Serif", "Liberation Serif", "Noto Serif", "Nimbus Sans",
      "FreeSans",     "FreeSerif"};

  nsTArray<nsCString> existingFonts;
  for (const char* fontNameStr : commonFonts) {
    nsCString fontName(fontNameStr);
    if (FontHasCharacter(pfl, fontName, 'A')) {
      existingFonts.AppendElement(fontName);
      if (existingFonts.Length() >= 3) {
        break;
      }
    }
  }

  if (existingFonts.Length() < 2) {
    GTEST_SKIP() << "Need at least 2 fonts for this test";
  }

  // Test with Hidden visibility (most permissive)
  nsTArray<nsCString> fontsUsedHidden;
  pfl->ListFontsUsedForString(u"ABC"_ns, existingFonts, fontsUsedHidden,
                              FontVisibility::Hidden);

  // With multiple fonts all having 'A', 'B', 'C', only the first should be used
  // (if that font covers all characters)
  EXPECT_GE(fontsUsedHidden.Length(), 1u)
      << "Should use at least one font for basic Latin chars";
}

TEST_F(FontFallbackTest, ListFontsUsedForString_VariantI_EmojiFontList) {
  gfxPlatformFontList* pfl = gfxPlatformFontList::PlatformFontList();
  ASSERT_NE(pfl, nullptr);

  // Emoji font list from populateSVGRect's CSS_FONT_FAMILY
  nsTArray<nsCString> emojiFontList;
  emojiFontList.AppendElement("Apple Color Emoji"_ns);
  emojiFontList.AppendElement("Segoe UI Emoji"_ns);
  emojiFontList.AppendElement("Segoe UI Symbol"_ns);
  emojiFontList.AppendElement("Noto Color Emoji"_ns);
  emojiFontList.AppendElement("EmojiOne Color"_ns);
  emojiFontList.AppendElement("Android Emoji"_ns);
  emojiFontList.AppendElement("sans-serif"_ns);

  // A few emojis from the SVG list
  nsAutoString emojiText;
  AppendUCS4ToUTF16(0x1F600, emojiText);  // Grinning Face
  AppendUCS4ToUTF16(0x263A, emojiText);   // White Smiling Face
  AppendUCS4ToUTF16(0x2708, emojiText);   // Airplane

  nsTArray<nsCString> fontsAllowlisted;
  pfl->ListFontsUsedForString(emojiText, emojiFontList, fontsAllowlisted,
                              FontVisibility::LangPack);
  nsTArray<nsCString> fontsNonAllowlisted;
  pfl->ListFontsUsedForString(emojiText, emojiFontList, fontsNonAllowlisted,
                              FontVisibility::User);

  // User visibility should find at least as many fonts as LangPack
  EXPECT_GE(fontsNonAllowlisted.Length(), fontsAllowlisted.Length());

  // On any platform with emoji support, at least one font should be found
  EXPECT_GT(fontsNonAllowlisted.Length(), 0u)
      << "Should find at least one emoji font for basic emoji codepoints";
}
