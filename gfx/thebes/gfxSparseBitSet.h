/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef gfx_thebes_gfxSparseBitSet_h
#define gfx_thebes_gfxSparseBitSet_h

#include "nsTArray.h"
#include "zlib.h"

enum eGfxLog : uint8_t;

namespace IPC {
template <typename T>
struct ParamTraits;
}

class SharedBitSet;

class gfxSparseBitSet {
 private:
  friend class SharedBitSet;

  enum { BLOCK_SIZE = 32 };  // ==> 256 codepoints per block
  enum { BLOCK_SIZE_BITS = BLOCK_SIZE * 8 };
  enum { NO_BLOCK = 0xffff };  // index value indicating missing (empty) block

  // The BlockIndex type is just a uint16_t, except it will default-construct
  // with the value NO_BLOCK so that we can do AppendElements(size_t) to grow
  // the index.
  struct BlockIndex {
    BlockIndex() : mIndex(NO_BLOCK) {}
    explicit BlockIndex(uint16_t aIndex) : mIndex(aIndex) {}

    operator uint16_t() const { return mIndex; }

    uint16_t mIndex;
  };

  struct Block {
    Block() { memset(mBits, 0, BLOCK_SIZE); }
    explicit Block(unsigned char memsetValue) {
      memset(mBits, memsetValue, BLOCK_SIZE);
    }
    uint8_t mBits[BLOCK_SIZE];
  };

  friend struct IPC::ParamTraits<gfxSparseBitSet>;
  friend struct IPC::ParamTraits<BlockIndex>;
  friend struct IPC::ParamTraits<Block>;

 public:
  gfxSparseBitSet() = default;
  explicit gfxSparseBitSet(uint32_t aReserveCapacity)
      : mBlockIndex(aReserveCapacity), mBlocks(aReserveCapacity) {}

  bool Equals(const gfxSparseBitSet* aOther) const {
    if (mBlockIndex.Length() != aOther->mBlockIndex.Length()) {
      return false;
    }
    size_t n = mBlockIndex.Length();
    for (size_t i = 0; i < n; ++i) {
      uint16_t b1 = mBlockIndex[i];
      uint16_t b2 = aOther->mBlockIndex[i];
      if ((b1 == NO_BLOCK) != (b2 == NO_BLOCK)) {
        return false;
      }
      if (b1 == NO_BLOCK) {
        continue;
      }
      if (memcmp(&mBlocks[b1].mBits, &aOther->mBlocks[b2].mBits, BLOCK_SIZE) !=
          0) {
        return false;
      }
    }
    return true;
  }

  bool test(uint32_t aIndex) const {
    uint32_t i = aIndex / BLOCK_SIZE_BITS;
    if (i >= mBlockIndex.Length() || mBlockIndex[i] == NO_BLOCK) {
      return false;
    }
    const Block& block = mBlocks[mBlockIndex[i]];
    return ((block.mBits[(aIndex >> 3) & (BLOCK_SIZE - 1)]) &
            (1 << (aIndex & 0x7))) != 0;
  }

  // dump out contents of bitmap
  void Dump(const char* aPrefix, eGfxLog aWhichLog) const;

  bool TestRange(uint32_t aStart, uint32_t aEnd) {
    // start point is beyond the end of the block array? return false
    // immediately
    uint32_t startBlock = aStart / BLOCK_SIZE_BITS;
    uint32_t blockLen = mBlockIndex.Length();
    if (startBlock >= blockLen) {
      return false;
    }

    // check for blocks in range, if none, return false
    bool hasBlocksInRange = false;
    uint32_t endBlock = aEnd / BLOCK_SIZE_BITS;
    for (uint32_t bi = startBlock; bi <= endBlock; bi++) {
      if (bi < blockLen && mBlockIndex[bi] != NO_BLOCK) {
        hasBlocksInRange = true;
        break;
      }
    }
    if (!hasBlocksInRange) {
      return false;
    }

    // first block, check bits
    if (mBlockIndex[startBlock] != NO_BLOCK) {
      const Block& block = mBlocks[mBlockIndex[startBlock]];
      uint32_t start = aStart;
      uint32_t end = std::min(aEnd, ((startBlock + 1) * BLOCK_SIZE_BITS) - 1);
      for (uint32_t i = start; i <= end; i++) {
        if ((block.mBits[(i >> 3) & (BLOCK_SIZE - 1)]) & (1 << (i & 0x7))) {
          return true;
        }
      }
    }
    if (endBlock == startBlock) {
      return false;
    }

    // [2..n-1] blocks check bytes
    for (uint32_t i = startBlock + 1; i < endBlock; i++) {
      if (i >= blockLen || mBlockIndex[i] == NO_BLOCK) {
        continue;
      }
      const Block& block = mBlocks[mBlockIndex[i]];
      for (uint32_t index = 0; index < BLOCK_SIZE; index++) {
        if (block.mBits[index]) {
          return true;
        }
      }
    }

    // last block, check bits
    if (endBlock < blockLen && mBlockIndex[endBlock] != NO_BLOCK) {
      const Block& block = mBlocks[mBlockIndex[endBlock]];
      uint32_t start = endBlock * BLOCK_SIZE_BITS;
      uint32_t end = aEnd;
      for (uint32_t i = start; i <= end; i++) {
        if ((block.mBits[(i >> 3) & (BLOCK_SIZE - 1)]) & (1 << (i & 0x7))) {
          return true;
        }
      }
    }

    return false;
  }

  void set(uint32_t aIndex) {
    uint32_t i = aIndex / BLOCK_SIZE_BITS;
    if (i >= mBlockIndex.Length()) {
      mBlockIndex.AppendElements(i - mBlockIndex.Length() + 1);
    }
    if (mBlockIndex[i] == NO_BLOCK) {
      mBlocks.AppendElement();
      MOZ_ASSERT(mBlocks.Length() < 0xffff, "block index overflow!");
      mBlockIndex[i].mIndex = static_cast<uint16_t>(mBlocks.Length() - 1);
    }
    Block& block = mBlocks[mBlockIndex[i]];
    block.mBits[(aIndex >> 3) & (BLOCK_SIZE - 1)] |= 1 << (aIndex & 0x7);
  }

  void set(uint32_t aIndex, bool aValue) {
    if (aValue) {
      set(aIndex);
    } else {
      clear(aIndex);
    }
  }

  void SetRange(uint32_t aStart, uint32_t aEnd) {
    const uint32_t startIndex = aStart / BLOCK_SIZE_BITS;
    const uint32_t endIndex = aEnd / BLOCK_SIZE_BITS;

    if (endIndex >= mBlockIndex.Length()) {
      mBlockIndex.AppendElements(endIndex - mBlockIndex.Length() + 1);
    }

    for (uint32_t i = startIndex; i <= endIndex; ++i) {
      const uint32_t blockFirstBit = i * BLOCK_SIZE_BITS;
      const uint32_t blockLastBit = blockFirstBit + BLOCK_SIZE_BITS - 1;

      if (mBlockIndex[i] == NO_BLOCK) {
        bool fullBlock = (aStart <= blockFirstBit && aEnd >= blockLastBit);
        mBlocks.AppendElement(fullBlock ? Block(0xFF) : Block());
        MOZ_ASSERT(mBlocks.Length() < 0xffff, "block index overflow!");
        mBlockIndex[i].mIndex = static_cast<uint16_t>(mBlocks.Length() - 1);
        if (fullBlock) {
          continue;
        }
      }

      Block& block = mBlocks[mBlockIndex[i]];
      const uint32_t start =
          aStart > blockFirstBit ? aStart - blockFirstBit : 0;
      const uint32_t end =
          std::min<uint32_t>(aEnd - blockFirstBit, BLOCK_SIZE_BITS - 1);

      for (uint32_t bit = start; bit <= end; ++bit) {
        block.mBits[bit >> 3] |= 1 << (bit & 0x7);
      }
    }
  }

  void clear(uint32_t aIndex) {
    uint32_t i = aIndex / BLOCK_SIZE_BITS;
    if (i >= mBlockIndex.Length()) {
      return;
    }
    if (mBlockIndex[i] == NO_BLOCK) {
      return;
    }
    Block& block = mBlocks[mBlockIndex[i]];
    block.mBits[(aIndex >> 3) & (BLOCK_SIZE - 1)] &= ~(1 << (aIndex & 0x7));
  }

  void ClearRange(uint32_t aStart, uint32_t aEnd) {
    const uint32_t startIndex = aStart / BLOCK_SIZE_BITS;
    const uint32_t endIndex = aEnd / BLOCK_SIZE_BITS;

    for (uint32_t i = startIndex; i <= endIndex; ++i) {
      if (i >= mBlockIndex.Length()) {
        return;
      }
      if (mBlockIndex[i] == NO_BLOCK) {
        continue;
      }

      const uint32_t blockFirstBit = i * BLOCK_SIZE_BITS;
      Block& block = mBlocks[mBlockIndex[i]];

      const uint32_t start =
          aStart > blockFirstBit ? aStart - blockFirstBit : 0;
      const uint32_t end =
          std::min<uint32_t>(aEnd - blockFirstBit, BLOCK_SIZE_BITS - 1);

      for (uint32_t bit = start; bit <= end; ++bit) {
        block.mBits[bit >> 3] &= ~(1 << (bit & 0x7));
      }
    }
  }

  size_t SizeOfExcludingThis(mozilla::MallocSizeOf aMallocSizeOf) const {
    return mBlocks.ShallowSizeOfExcludingThis(aMallocSizeOf) +
           mBlockIndex.ShallowSizeOfExcludingThis(aMallocSizeOf);
  }

  size_t SizeOfIncludingThis(mozilla::MallocSizeOf aMallocSizeOf) const {
    return aMallocSizeOf(this) + SizeOfExcludingThis(aMallocSizeOf);
  }

  // clear out all blocks in the array
  void reset() {
    mBlocks.Clear();
    mBlockIndex.Clear();
  }

  // set this bitset to the union of its current contents and another
  void Union(const gfxSparseBitSet& aBitset) {
    // ensure mBlockIndex is large enough
    uint32_t blockCount = aBitset.mBlockIndex.Length();
    if (blockCount > mBlockIndex.Length()) {
      mBlockIndex.AppendElements(blockCount - mBlockIndex.Length());
    }
    // for each block that may be present in aBitset...
    for (uint32_t i = 0; i < blockCount; ++i) {
      // if it is missing (implicitly empty), just skip
      if (aBitset.mBlockIndex[i] == NO_BLOCK) {
        continue;
      }
      // if the block is missing in this set, just copy the other
      if (mBlockIndex[i] == NO_BLOCK) {
        mBlocks.AppendElement(aBitset.mBlocks[aBitset.mBlockIndex[i]]);
        MOZ_ASSERT(mBlocks.Length() < 0xffff, "block index overflow!");
        mBlockIndex[i].mIndex = static_cast<uint16_t>(mBlocks.Length() - 1);
        continue;
      }
      // else set existing block to the union of both
      uint32_t* dst =
          reinterpret_cast<uint32_t*>(&mBlocks[mBlockIndex[i]].mBits);
      const uint32_t* src = reinterpret_cast<const uint32_t*>(
          &aBitset.mBlocks[aBitset.mBlockIndex[i]].mBits);
      for (uint32_t j = 0; j < BLOCK_SIZE / 4; ++j) {
        dst[j] |= src[j];
      }
    }
  }

  inline void Union(const SharedBitSet& aBitset);

  void Compact() {
    // TODO: Discard any empty blocks, and adjust index accordingly.
    // (May not be worth doing, though, because we so rarely clear bits
    // that were previously set.)
    mBlocks.Compact();
    mBlockIndex.Compact();
  }

  uint32_t GetChecksum() const {
    uint32_t check =
        adler32(0, reinterpret_cast<const uint8_t*>(mBlockIndex.Elements()),
                mBlockIndex.Length() * sizeof(uint16_t));
    check = adler32(check, reinterpret_cast<const uint8_t*>(mBlocks.Elements()),
                    mBlocks.Length() * sizeof(Block));
    return check;
  }

 protected:
  CopyableTArray<BlockIndex> mBlockIndex;
  CopyableTArray<Block> mBlocks;
};

/**
 * SharedBitSet is a version of gfxSparseBitSet that is intended to be used
 * in a shared-memory block, and can be used regardless of the address at which
 * the block has been mapped. The SharedBitSet cannot be modified once it has
 * been created.
 *
 * Max size of a SharedBitSet = 4352 * 32  ; blocks
 *                              + 4352 * 2 ; index
 *                              + 4        ; counts
 *   = 147972 bytes
 *
 * Therefore, SharedFontList must be able to allocate a contiguous block of at
 * least this size.
 */
class SharedBitSet {
 private:
  // We use the same Block type as gfxSparseBitSet.
  typedef gfxSparseBitSet::Block Block;

  enum { BLOCK_SIZE = gfxSparseBitSet::BLOCK_SIZE };
  enum { BLOCK_SIZE_BITS = gfxSparseBitSet::BLOCK_SIZE_BITS };
  enum { NO_BLOCK = gfxSparseBitSet::NO_BLOCK };

 public:
  static const size_t kMaxSize = 147972;  // see above

  // Returns the size needed for a SharedBitSet version of the given
  // gfxSparseBitSet.
  static size_t RequiredSize(const gfxSparseBitSet& aBitset) {
    size_t total = sizeof(SharedBitSet);
    size_t len = aBitset.mBlockIndex.Length();
    total += len * sizeof(uint16_t);  // add size for index array
    // add size for blocks, excluding any missing ones
    for (uint16_t i = 0; i < len; i++) {
      if (aBitset.mBlockIndex[i] != NO_BLOCK) {
        total += sizeof(Block);
      }
    }
    MOZ_ASSERT(total <= kMaxSize);
    return total;
  }

  // Create a SharedBitSet in the provided buffer, initializing it with the
  // contents of aBitset.
  static SharedBitSet* Create(void* aBuffer, size_t aBufSize,
                              const gfxSparseBitSet& aBitset) {
    MOZ_ASSERT(aBufSize >= RequiredSize(aBitset));
    return new (aBuffer) SharedBitSet(aBitset);
  }

  bool test(uint32_t aIndex) const {
    const auto i = static_cast<uint16_t>(aIndex / BLOCK_SIZE_BITS);
    if (i >= mBlockIndexCount) {
      return false;
    }
    const uint16_t* const blockIndex =
        reinterpret_cast<const uint16_t*>(this + 1);
    if (blockIndex[i] == NO_BLOCK) {
      return false;
    }
    const Block* const blocks =
        reinterpret_cast<const Block*>(blockIndex + mBlockIndexCount);
    const Block& block = blocks[blockIndex[i]];
    return ((block.mBits[(aIndex >> 3) & (BLOCK_SIZE - 1)]) &
            (1 << (aIndex & 0x7))) != 0;
  }

  bool Equals(const gfxSparseBitSet* aOther) const {
    if (mBlockIndexCount != aOther->mBlockIndex.Length()) {
      return false;
    }
    const uint16_t* const blockIndex =
        reinterpret_cast<const uint16_t*>(this + 1);
    const Block* const blocks =
        reinterpret_cast<const Block*>(blockIndex + mBlockIndexCount);
    for (uint16_t i = 0; i < mBlockIndexCount; ++i) {
      uint16_t index = blockIndex[i];
      uint16_t otherIndex = aOther->mBlockIndex[i];
      if ((index == NO_BLOCK) != (otherIndex == NO_BLOCK)) {
        return false;
      }
      if (index == NO_BLOCK) {
        continue;
      }
      const Block& b1 = blocks[index];
      const Block& b2 = aOther->mBlocks[otherIndex];
      if (memcmp(&b1.mBits, &b2.mBits, BLOCK_SIZE) != 0) {
        return false;
      }
    }
    return true;
  }

 private:
  friend class gfxSparseBitSet;
  SharedBitSet() = delete;

  explicit SharedBitSet(const gfxSparseBitSet& aBitset)
      : mBlockIndexCount(
            mozilla::AssertedCast<uint16_t>(aBitset.mBlockIndex.Length())),
        mBlockCount(0) {
    uint16_t* blockIndex = reinterpret_cast<uint16_t*>(this + 1);
    Block* blocks = reinterpret_cast<Block*>(blockIndex + mBlockIndexCount);
    for (uint16_t i = 0; i < mBlockIndexCount; i++) {
      if (aBitset.mBlockIndex[i] != NO_BLOCK) {
        const Block& srcBlock = aBitset.mBlocks[aBitset.mBlockIndex[i]];
        std::memcpy(&blocks[mBlockCount], &srcBlock, sizeof(Block));
        blockIndex[i] = mBlockCount;
        mBlockCount++;
      } else {
        blockIndex[i] = NO_BLOCK;
      }
    }
  }

  // We never manage SharedBitSet as a "normal" object, it's a view onto a
  // buffer of shared memory. So we should never be trying to call this.
  ~SharedBitSet() = delete;

  uint16_t mBlockIndexCount;
  uint16_t mBlockCount;

  // After the two "header" fields above, we have a block index array
  // of uint16_t[mBlockIndexCount], followed by mBlockCount Block records.
};

// Union the contents of a SharedBitSet with the target gfxSparseBitSet
inline void gfxSparseBitSet::Union(const SharedBitSet& aBitset) {
  // ensure mBlockIndex is large enough
  while (mBlockIndex.Length() < aBitset.mBlockIndexCount) {
    mBlockIndex.AppendElement(NO_BLOCK);
  }
  auto blockIndex = reinterpret_cast<const uint16_t*>(&aBitset + 1);
  auto blocks =
      reinterpret_cast<const Block*>(blockIndex + aBitset.mBlockIndexCount);
  for (uint32_t i = 0; i < aBitset.mBlockIndexCount; ++i) {
    // if it is missing (implicitly empty) in source, just skip
    if (blockIndex[i] == NO_BLOCK) {
      continue;
    }
    // if the block is missing, just copy from source bitset
    if (mBlockIndex[i] == NO_BLOCK) {
      mBlocks.AppendElement(blocks[blockIndex[i]]);
      MOZ_ASSERT(mBlocks.Length() < 0xffff, "block index overflow");
      mBlockIndex[i].mIndex = uint16_t(mBlocks.Length() - 1);
      continue;
    }
    // Else set existing target block to the union of both.
    // Note that blocks in SharedBitSet may not be 4-byte aligned, so we don't
    // try to optimize by casting to uint32_t* here and processing 4 bytes at
    // once, as this could result in misaligned access.
    uint8_t* dst = reinterpret_cast<uint8_t*>(&mBlocks[mBlockIndex[i]].mBits);
    const uint8_t* src =
        reinterpret_cast<const uint8_t*>(&blocks[blockIndex[i]].mBits);
    for (uint32_t j = 0; j < BLOCK_SIZE; ++j) {
      dst[j] |= src[j];
    }
  }
}

#endif
