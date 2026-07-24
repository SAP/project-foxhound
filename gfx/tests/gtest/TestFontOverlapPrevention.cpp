/* vim:set ts=2 sw=2 sts=2 et: */
/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

#include "gtest/gtest.h"
#include <vector>
#include <string>

#define StandardFonts
#ifdef XP_WIN
#  include "../thebes/StandardFonts-win10.inc"
#elif defined(XP_MACOSX)
#  include "../thebes/StandardFonts-macos.inc"
#elif defined(XP_LINUX)
#  include "../thebes/StandardFonts-linux.inc"
#elif defined(XP_ANDROID)
#  include "../thebes/StandardFonts-android.inc"
#endif
#undef StandardFonts

// Helper to collect FONT_RULE font names
std::vector<std::string> GetFontRuleNames() {
  std::vector<std::string> fontRuleNames;
#undef FONT_RULE
#define FONT_RULE(fontName, ...) fontRuleNames.push_back(fontName);
#define FontInclusionByLocaleRules

#ifdef XP_WIN
#  include "../thebes/StandardFonts-win10.inc"
#elif defined(XP_MACOSX)
#  include "../thebes/StandardFonts-macos.inc"
#elif defined(XP_LINUX)
#  include "../thebes/StandardFonts-linux.inc"
#elif defined(XP_ANDROID)
#  include "../thebes/StandardFonts-android.inc"
#endif

#undef FontInclusionByLocaleRules
#undef FONT_RULE
  return fontRuleNames;
}

/*
 * This test verifies that the font names defined in the language pack
 * (kLangPackFonts) do not overlap with the font names defined by FONT_RULE
 * macros in the platform-specific standard font inclusion files.
 *
 * The code in gfxDWriteFontList::GetVisibilityForFamily assumes that a font is
 * not in both lists.
 */

TEST(StandardFontsTest, LangPackAndFontRuleNoOverlap)
{
  // Get LangPack font names
  std::set<std::string> langPackFonts;
  for (const char* font : kLangPackFonts) {
    langPackFonts.insert(font);
  }

  // Get FONT_RULE font names
  std::vector<std::string> fontRuleNames = GetFontRuleNames();

  // Check for overlap
  for (const auto& font : fontRuleNames) {
    auto it = std::find_if(langPackFonts.begin(), langPackFonts.end(),
                           [&font](const std::string& langPackFont) {
                             return std::equal(
                                 font.begin(), font.end(), langPackFont.begin(),
                                 langPackFont.end(), [](char a, char b) {
                                   return tolower(a) == tolower(b);
                                 });
                           });
    ASSERT_EQ(it, langPackFonts.end())
        << "Font '" << font
        << "' is in both kLangPackFonts and FONT_RULE (case insensitive)";
  }
}
