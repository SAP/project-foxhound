/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "ImageContainer.h"
#include "gtest/gtest.h"
#include "mozilla/RemoteImageHolder.h"
#include "mozilla/gfx/Types.h"
#include "mozilla/ipc/Shmem.h"
#include "mozilla/layers/BufferTexture.h"
#include "mozilla/layers/ImageDataSerializer.h"
#include "mozilla/layers/LayersSurfaces.h"

using namespace mozilla;
using namespace mozilla::gfx;
using namespace mozilla::ipc;
using namespace mozilla::layers;

static YCbCrDescriptor MakeInvalidDescriptor() {
  return YCbCrDescriptor(IntRect(0, 0, 4, 4), IntSize(1, 1), 4u, IntSize(1, 1),
                         4u, 8192u, 1u, 9192u, StereoMode::MONO,
                         ColorDepth::COLOR_8, YUVColorSpace::BT601,
                         ColorRange::LIMITED, TransferFunction::BT709,
                         ChromaSubsampling::HALF_WIDTH_AND_HEIGHT, Nothing());
}

static YCbCrDescriptor MakeValidDescriptor() {
  return YCbCrDescriptor(IntRect(0, 0, 4, 4), IntSize(4, 4), 4u, IntSize(2, 2),
                         2u, 0u, 16u, 20u, StereoMode::MONO,
                         ColorDepth::COLOR_8, YUVColorSpace::BT601,
                         ColorRange::LIMITED, TransferFunction::BT709,
                         ChromaSubsampling::HALF_WIDTH_AND_HEIGHT, Nothing());
}

// Valid plane layout but display rect extends beyond ySize.
static YCbCrDescriptor MakeOversizedDisplayDescriptor() {
  return YCbCrDescriptor(IntRect(0, 0, 64, 200), IntSize(64, 2), 64u,
                         IntSize(32, 1), 32u, 0u, 128u, 160u, StereoMode::MONO,
                         ColorDepth::COLOR_8, YUVColorSpace::BT601,
                         ColorRange::LIMITED, TransferFunction::BT709,
                         ChromaSubsampling::HALF_WIDTH_AND_HEIGHT, Nothing());
}

// cbCrSize is smaller than what chromaSubsampling implies.
static YCbCrDescriptor MakeInvalidChromaDimensionsDescriptor() {
  return YCbCrDescriptor(IntRect(0, 0, 64, 2), IntSize(64, 2), 64u,
                         IntSize(64, 1), 64u, 0u, 128u, 192u, StereoMode::MONO,
                         ColorDepth::COLOR_8, YUVColorSpace::BT601,
                         ColorRange::LIMITED, TransferFunction::BT709,
                         ChromaSubsampling::FULL, Nothing());
}

TEST(TestRemoteImageHolder, InvalidDescriptorValidation)
{
  auto desc = MakeInvalidDescriptor();

  Maybe<uint32_t> descriptorSize = ImageDataSerializer::ComputeYCbCrBufferSize(
      desc.display(), desc.ySize(), desc.yStride(), desc.cbCrSize(),
      desc.cbCrStride(), desc.yOffset(), desc.cbOffset(), desc.crOffset(),
      desc.colorDepth(), desc.chromaSubsampling());

  ASSERT_TRUE(descriptorSize.isNothing());
}

TEST(TestRemoteImageHolder, ValidDescriptorPassesValidation)
{
  auto desc = MakeValidDescriptor();

  Maybe<uint32_t> descriptorSize = ImageDataSerializer::ComputeYCbCrBufferSize(
      desc.display(), desc.ySize(), desc.yStride(), desc.cbCrSize(),
      desc.cbCrStride(), desc.yOffset(), desc.cbOffset(), desc.crOffset(),
      desc.colorDepth(), desc.chromaSubsampling());

  ASSERT_GT(descriptorSize.extract(), 0u);
}

TEST(TestRemoteImageHolder, RejectsInvalidShmemDescriptor)
{
  auto shmemBuilder = Shmem::Builder(128);
  ASSERT_TRUE(shmemBuilder)
  << "Failed to create Shmem::Builder";

  auto [msg, shmem] = shmemBuilder.Build(1, false, 0);

  ASSERT_TRUE(shmem.IsWritable())
  << "Shmem should be writable";
  ASSERT_EQ(shmem.Size<uint8_t>(), 128u) << "Shmem should be 128 bytes";

  auto invalidDesc = MakeInvalidDescriptor();

  BufferDescriptor bufferDesc(invalidDesc);
  MemoryOrShmem memOrShmem(shmem);
  SurfaceDescriptorBuffer sdBuffer(bufferDesc, memOrShmem);
  SurfaceDescriptor sd(sdBuffer);

  RemoteImageHolder holder(std::move(sd));

  RefPtr<BufferRecycleBin> recycleBin = new BufferRecycleBin();

  RefPtr<layers::Image> image = holder.TransferToImage(recycleBin);

  EXPECT_TRUE(image == nullptr) << "RemoteImageHolder::TransferToImage should "
                                   "return null for invalid descriptors";
}

TEST(TestRemoteImageHolder, AcceptsValidShmemDescriptor)
{
  auto shmemBuilder = Shmem::Builder(128);
  ASSERT_TRUE(shmemBuilder)
  << "Failed to create Shmem::Builder";

  auto [msg, shmem] = shmemBuilder.Build(2, false, 0);

  ASSERT_TRUE(shmem.IsWritable())
  << "Shmem should be writable";
  ASSERT_EQ(shmem.Size<uint8_t>(), 128u) << "Shmem should be 128 bytes";

  auto validDesc = MakeValidDescriptor();

  uint8_t* buffer = shmem.get<uint8_t>();
  memset(buffer, 0, 128);

  BufferDescriptor bufferDesc(validDesc);
  MemoryOrShmem memOrShmem(shmem);
  SurfaceDescriptorBuffer sdBuffer(bufferDesc, memOrShmem);
  SurfaceDescriptor sd(sdBuffer);

  RemoteImageHolder holder(std::move(sd));

  RefPtr<BufferRecycleBin> recycleBin = new BufferRecycleBin();

  RefPtr<layers::Image> image = holder.TransferToImage(recycleBin);

  EXPECT_TRUE(image != nullptr) << "RemoteImageHolder::TransferToImage should "
                                   "return a valid image for valid descriptors";
}

TEST(TestRemoteImageHolder, RejectsOversizedDisplayRect)
{
  auto desc = MakeOversizedDisplayDescriptor();

  // ComputeYCbCrBufferSize itself rejects the oversized display rect, so size
  // a Shmem big enough to hold the planes from the descriptor's offsets.
  uint32_t descriptorSize =
      desc.crOffset() + desc.cbCrStride() * desc.cbCrSize().height;

  auto shmemBuilder = Shmem::Builder(descriptorSize);
  ASSERT_TRUE(shmemBuilder)
  << "Failed to create Shmem::Builder";

  auto [msg, shmem] = shmemBuilder.Build(3, false, 0);

  ASSERT_TRUE(shmem.IsWritable())
  << "Shmem should be writable";
  ASSERT_GE(shmem.Size<uint8_t>(), descriptorSize)
      << "Shmem should fit descriptor";

  memset(shmem.get<uint8_t>(), 0, descriptorSize);

  BufferDescriptor bufferDesc(desc);
  MemoryOrShmem memOrShmem(shmem);
  SurfaceDescriptorBuffer sdBuffer(bufferDesc, memOrShmem);
  SurfaceDescriptor sd(sdBuffer);

  RemoteImageHolder holder(std::move(sd));

  RefPtr<BufferRecycleBin> recycleBin = new BufferRecycleBin();

  RefPtr<layers::Image> image = holder.TransferToImage(recycleBin);

  EXPECT_TRUE(image == nullptr)
      << "TransferToImage should reject descriptor whose display rect exceeds "
         "plane dimensions";
}

TEST(TestRemoteImageHolder, RejectsInvalidChromaDimensions)
{
  auto desc = MakeInvalidChromaDimensionsDescriptor();

  // ComputeYCbCrBufferSize itself rejects mismatched chroma dimensions, so
  // size a Shmem big enough to hold the planes from the descriptor's offsets.
  uint32_t descriptorSize =
      desc.crOffset() + desc.cbCrStride() * desc.cbCrSize().height;

  auto shmemBuilder = Shmem::Builder(descriptorSize);
  ASSERT_TRUE(shmemBuilder)
  << "Failed to create Shmem::Builder";

  auto [msg, shmem] = shmemBuilder.Build(4, false, 0);

  ASSERT_TRUE(shmem.IsWritable())
  << "Shmem should be writable";
  ASSERT_GE(shmem.Size<uint8_t>(), descriptorSize)
      << "Shmem should fit descriptor";

  memset(shmem.get<uint8_t>(), 0, descriptorSize);

  BufferDescriptor bufferDesc(desc);
  MemoryOrShmem memOrShmem(shmem);
  SurfaceDescriptorBuffer sdBuffer(bufferDesc, memOrShmem);
  SurfaceDescriptor sd(sdBuffer);

  RemoteImageHolder holder(std::move(sd));

  RefPtr<BufferRecycleBin> recycleBin = new BufferRecycleBin();

  RefPtr<layers::Image> image = holder.TransferToImage(recycleBin);

  EXPECT_TRUE(image == nullptr)
      << "TransferToImage should reject descriptor with inconsistent chroma "
         "dimensions";
}
