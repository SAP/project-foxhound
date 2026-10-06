/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_QUOTA_ENCRYPTEDRANDOMACCESSBLOCK_H_
#define DOM_QUOTA_ENCRYPTEDRANDOMACCESSBLOCK_H_

#include <algorithm>
#include <cstddef>
#include <cstdint>
#include <cstring>
#include <limits>

#include "mozilla/Span.h"
#include "nsTArray.h"

namespace mozilla::dom::quota {

/**
 * On-disk layout of a single encrypted block (BlockSize = 4096 bytes):
 *
 *  --------+-----------------------------------------------+
 *   offset | field                                 size    |
 *  --------+-----------------------------------------------+
 *       0  | Version (uint16_t, little-endian)    2 bytes  |     Header
 *       2  | Reserved (zeroed)                   30 bytes  |     plaintext
 *  --------+-----------------------------------------------+
 *      32  | CipherMetadata                      32 bytes  |     plaintext
 *  --------+-----------------------------------------------+
 *      64  | CipherPayload                     4032 bytes  |     ciphertext
 *  --------+-----------------------------------------------+
 *    4096
 *
 *  The layout of CipherMetadata and CipherPayload is version-specific.
 */
class EncryptedRandomAccessBlock {
 public:
  static constexpr size_t BlockSize = 4096;

  template <size_t N>
  using ConstSpan = Span<const uint8_t, N>;
  template <size_t N>
  using MutableSpan = Span<uint8_t, N>;

  EncryptedRandomAccessBlock() {
    mData.SetLength(BlockSize);

    // Zero-initialize the whole block so that reserved/unused bytes do not
    // expose stale data. This follows the same rationale as EncryptedBlock
    // (Bug 1867394).
    std::fill(mData.begin(), mData.end(), 0);
  }

  static constexpr size_t CipherMetadataSize = 32;

 private:
  static constexpr size_t HeaderSize = 32;

  using VersionType = uint16_t;
  static constexpr size_t VersionSize = sizeof(VersionType);
  static_assert(VersionSize == 2, "Version should take 2 bytes on disk.");

  static constexpr size_t CipherPayloadSize =
      BlockSize - HeaderSize - CipherMetadataSize;
  static_assert(CipherPayloadSize == 4032,
                "CipherPayload should take 4032 bytes on disk.");

 public:
  ConstSpan<HeaderSize> Header() const {
    return WholeBlock().Subspan<0, HeaderSize>();
  }

  VersionType Version() const {
    VersionType version = std::numeric_limits<VersionType>::max();
    memcpy(&version, mData.Elements(), VersionSize);
    return version;
  }

  void SetVersion(VersionType aVersion) {
    memcpy(mData.Elements(), &aVersion, VersionSize);
  }

  ConstSpan<HeaderSize - VersionSize> ReservedBytes() const {
    return WholeBlock().Subspan<VersionSize, HeaderSize - VersionSize>();
  }
  static_assert(HeaderSize - VersionSize == 30,
                "Reserved region should take 30 bytes on disk.");

  ConstSpan<CipherMetadataSize> CipherMetadata() const {
    return WholeBlock().Subspan<HeaderSize, CipherMetadataSize>();
  }

  MutableSpan<CipherMetadataSize> MutableCipherMetadata() {
    return MutableWholeBlock().Subspan<HeaderSize, CipherMetadataSize>();
  }

  ConstSpan<CipherPayloadSize> CipherPayload() const {
    return WholeBlock()
        .Subspan<HeaderSize + CipherMetadataSize, CipherPayloadSize>();
  }

  MutableSpan<CipherPayloadSize> MutableCipherPayload() {
    return MutableWholeBlock()
        .Subspan<HeaderSize + CipherMetadataSize, CipherPayloadSize>();
  }

  void AssignFromBytes(ConstSpan<BlockSize> aData) {
    memcpy(mData.Elements(), aData.data(), BlockSize);
  }

 private:
  ConstSpan<BlockSize> WholeBlock() const { return mData; }
  MutableSpan<BlockSize> MutableWholeBlock() { return mData; }
  nsTArray<uint8_t> mData;
};

}  // namespace mozilla::dom::quota

#endif  // DOM_QUOTA_ENCRYPTEDRANDOMACCESSBLOCK_H_
