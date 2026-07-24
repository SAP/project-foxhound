/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: sw=2 ts=2 et lcs=trail\:.,tab\:>~ :
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#include "gtest/gtest.h"
#include "mozilla/gtest/nsUserCharacteristics.h"

#include "mozilla/glean/GleanPings.h"
#include "mozilla/glean/ResistfingerprintingMetrics.h"
#include "mozilla/Preferences.h"

using namespace mozilla;

// MathML prefs and their short names (must match nsUserCharacteristics.cpp)
static const struct {
  const char* pref;
  const char* shortName;
} kMathMLPrefs[] = {
    {"mathml.disabled", "dis"},
    {"mathml.scale_stretchy_operators.enabled", "str"},
    {"mathml.mathspace_names.disabled", "spc"},
    {"mathml.rtl_operator_mirroring.enabled", "rtl"},
    {"mathml.mathvariant_styling_fallback.disabled", "var"},
    {"mathml.math_shift.enabled", "shf"},
    {"mathml.operator_dictionary_accent.disabled", "acc"},
    {"mathml.legacy_mathvariant_attribute.disabled", "leg"},
    {"mathml.font_family_math.enabled", "fnt"},
};

static void ClearAllMathMLPrefs() {
  for (const auto& p : kMathMLPrefs) {
    Preferences::ClearUser(p.pref);
  }
}

TEST(ResistFingerprinting, UserCharacteristics_MathMLPrefs_Default)
{
  ClearAllMathMLPrefs();

  ASSERT_TRUE(mozilla::glean_pings::UserCharacteristics.TestSubmission(
      [](const nsACString& aReason) {
        auto result =
            mozilla::glean::characteristics::mathml_diag_prefs_modified
                .TestGetValue()
                .unwrap();
        // When no prefs are modified, should be empty string
        ASSERT_TRUE(result.isNothing() || result.value().IsEmpty());
      },
      []() {
        testing::PopulateMathMLPrefs();
        mozilla::glean_pings::UserCharacteristics.Submit();
      }));
}

TEST(ResistFingerprinting, UserCharacteristics_MathMLPrefs_SingleTrue)
{
  ClearAllMathMLPrefs();

  // Set first pref to true (dis=1 means mathml.disabled=true)
  Preferences::SetBool(kMathMLPrefs[0].pref, true);

  ASSERT_TRUE(mozilla::glean_pings::UserCharacteristics.TestSubmission(
      [](const nsACString& aReason) {
        auto result =
            mozilla::glean::characteristics::mathml_diag_prefs_modified
                .TestGetValue()
                .unwrap()
                .value();
        ASSERT_STREQ("dis=1", result.get());
      },
      []() {
        testing::PopulateMathMLPrefs();
        mozilla::glean_pings::UserCharacteristics.Submit();
      }));

  ClearAllMathMLPrefs();
}

TEST(ResistFingerprinting, UserCharacteristics_MathMLPrefs_TwoPrefs)
{
  ClearAllMathMLPrefs();

  // Set two prefs to non-default values
  // mathml.disabled defaults to false, set to true
  // mathml.scale_stretchy_operators.enabled defaults to true, set to false
  Preferences::SetBool(kMathMLPrefs[0].pref, true);   // dis=1
  Preferences::SetBool(kMathMLPrefs[1].pref, false);  // str=0

  ASSERT_TRUE(mozilla::glean_pings::UserCharacteristics.TestSubmission(
      [](const nsACString& aReason) {
        auto result =
            mozilla::glean::characteristics::mathml_diag_prefs_modified
                .TestGetValue()
                .unwrap()
                .value();
        // Order matches kMathMLPrefs order
        ASSERT_STREQ("dis=1,str=0", result.get());
      },
      []() {
        testing::PopulateMathMLPrefs();
        mozilla::glean_pings::UserCharacteristics.Submit();
      }));

  ClearAllMathMLPrefs();
}

TEST(ResistFingerprinting, UserCharacteristics_MathMLPrefs_NonAdjacent)
{
  ClearAllMathMLPrefs();

  // Set non-adjacent prefs: first and fourth
  Preferences::SetBool(kMathMLPrefs[0].pref, true);   // dis=1
  Preferences::SetBool(kMathMLPrefs[3].pref, false);  // rtl=0

  ASSERT_TRUE(mozilla::glean_pings::UserCharacteristics.TestSubmission(
      [](const nsACString& aReason) {
        auto result =
            mozilla::glean::characteristics::mathml_diag_prefs_modified
                .TestGetValue()
                .unwrap()
                .value();
        ASSERT_STREQ("dis=1,rtl=0", result.get());
      },
      []() {
        testing::PopulateMathMLPrefs();
        mozilla::glean_pings::UserCharacteristics.Submit();
      }));

  ClearAllMathMLPrefs();
}

TEST(ResistFingerprinting, UserCharacteristics_MathMLPrefs_Format)
{
  ClearAllMathMLPrefs();

  // Set multiple prefs to verify format: shortname=0|1,shortname=0|1,...
  Preferences::SetBool(kMathMLPrefs[0].pref, true);
  Preferences::SetBool(kMathMLPrefs[1].pref, false);
  Preferences::SetBool(kMathMLPrefs[2].pref, true);

  ASSERT_TRUE(mozilla::glean_pings::UserCharacteristics.TestSubmission(
      [](const nsACString& aReason) {
        auto result =
            mozilla::glean::characteristics::mathml_diag_prefs_modified
                .TestGetValue()
                .unwrap()
                .value();

        // Verify the format is correct
        nsCString str(result);

        // Should contain commas separating entries
        ASSERT_TRUE(str.Find(",") != kNotFound);

        // Each entry should be shortname=digit
        // Split by comma and verify each part
        int32_t start = 0;
        int32_t pos;
        while ((pos = str.Find(",", start)) != kNotFound ||
               start < (int32_t)str.Length()) {
          int32_t end = (pos != kNotFound) ? pos : str.Length();
          nsCString part;
          str.Mid(part, start, end - start);

          // Should contain exactly one '='
          ASSERT_EQ(1, std::count(part.BeginReading(), part.EndReading(), '='));

          // Value after '=' should be '0' or '1'
          int32_t eqPos = part.Find("=");
          ASSERT_TRUE(eqPos != kNotFound);
          char value = part.CharAt(eqPos + 1);
          ASSERT_TRUE(value == '0' || value == '1');

          start = end + 1;
          if (pos == kNotFound) break;
        }
      },
      []() {
        testing::PopulateMathMLPrefs();
        mozilla::glean_pings::UserCharacteristics.Submit();
      }));

  ClearAllMathMLPrefs();
}
