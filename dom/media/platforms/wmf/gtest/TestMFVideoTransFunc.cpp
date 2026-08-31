/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <gtest/gtest.h>

#include "MFMediaEngineUtils.h"
#include "mozilla/Maybe.h"
#include "mozilla/gfx/Types.h"

using namespace mozilla;

TEST(MFVideoTransFunc, PQMapsTо2084)
{
  EXPECT_EQ(ToMFVideoTransFunc(Some(gfx::TransferFunction::PQ)),
            MFVideoTransFunc_2084);
}

TEST(MFVideoTransFunc, HLGMapsToHLG)
{
  EXPECT_EQ(ToMFVideoTransFunc(Some(gfx::TransferFunction::HLG)),
            MFVideoTransFunc_HLG);
}

TEST(MFVideoTransFunc, BT709MapsTo709)
{
  EXPECT_EQ(ToMFVideoTransFunc(Some(gfx::TransferFunction::BT709)),
            MFVideoTransFunc_709);
}

TEST(MFVideoTransFunc, SRGBMapsToSRGB)
{
  EXPECT_EQ(ToMFVideoTransFunc(Some(gfx::TransferFunction::SRGB)),
            MFVideoTransFunc_sRGB);
}

TEST(MFVideoTransFunc, NothingMapsToUnknown)
{
  EXPECT_EQ(ToMFVideoTransFunc(Nothing()), MFVideoTransFunc_Unknown);
}
