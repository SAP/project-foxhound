/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "BlankDecoderModule.h"
#include "ImageContainer.h"
#include "gtest/gtest.h"

using namespace mozilla;

TEST(BlankVideoDataCreator, ShouldNotOverflow)
{
  RefPtr<MediaRawData> mrd = new MediaRawData();
  const uint32_t width = 1;
  const uint32_t height = 1;
  BlankVideoDataCreator creater(width, height, nullptr);
  RefPtr<MediaData> data = creater.Create(mrd);
  EXPECT_NE(data.get(), nullptr);
}

TEST(BlankVideoDataCreator, ShouldOverflow)
{
  RefPtr<MediaRawData> mrd = new MediaRawData();
  const uint32_t width = UINT_MAX;
  const uint32_t height = UINT_MAX;
  BlankVideoDataCreator creater(width, height, nullptr);
  RefPtr<MediaData> data = creater.Create(mrd);
  EXPECT_EQ(data.get(), nullptr);
}
