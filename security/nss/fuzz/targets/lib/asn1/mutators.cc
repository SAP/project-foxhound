/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mutators.h"

#include <algorithm>
#include <cassert>
#include <cstddef>
#include <cstdint>
#include <cstring>
#include <random>
#include <utility>
#include <vector>

const uint8_t kTerminator[2] = {0x00, 0x00};

struct Item {
  enum Form { Short, Indef, Long };

  uint8_t* base;
  uint8_t* parent;

  size_t contentSize;
  size_t remainingSize;

  uint8_t tag() const { return base[0]; }
  bool constructed() const { return base[0] & 0x20; }

  Form form() const {
    if (base[1] < 0x80) return Short;
    if (base[1] == 0x80) return Indef;
    return Long;
  }

  uint8_t* lengthData() const { return base + 1; }
  uint8_t* contentData() const { return base + 1 + lengthSize(); }

  size_t lengthSize() const {
    if (base[1] > 0x80) return 1 + (base[1] & 0x7f);
    return 1;
  }
  size_t size() const { return 1 + lengthSize() + contentSize; }
};

static Item ParseItem(uint8_t* data, size_t maxSize, const Item* parent) {
  Item item = {
      .base = data,
      .parent = parent ? parent->base : nullptr,
  };

  if (maxSize < 2) {
    item.base = nullptr;
    item.parent = nullptr;
    return item;
  }

  // Short form.
  if (data[1] < 0x80) {
    item.contentSize = std::min(static_cast<size_t>(data[1]), maxSize - 2);
    item.remainingSize =
        (maxSize - item.size()) + (parent ? parent->remainingSize : 0);
    return item;
  }

  // Indefinite length.
  if (data[1] == 0x80) {
    uint8_t* term = static_cast<uint8_t*>(
        memmem(data + 2, maxSize - 2, kTerminator, sizeof(kTerminator)));

    item.contentSize = term ? static_cast<size_t>(term - data) : maxSize - 2;
    item.remainingSize =
        (maxSize - item.size()) + (parent ? parent->remainingSize : 0);
    return item;
  }

  // Long form.
  size_t octets = data[1] & 0x7f;

  if (octets > maxSize - 2) {
    item.base = nullptr;
    item.parent = nullptr;
    return item;
  }

  // Parse the octets.
  size_t contentSize = 0;
  for (size_t i = 0; i < octets; ++i) {
    contentSize = (contentSize << 8) | data[2 + i];
  }

  item.contentSize = std::min(contentSize, maxSize - (2 + octets));
  item.remainingSize =
      (maxSize - item.size()) + (parent ? parent->remainingSize : 0);
  return item;
}

static std::vector<Item> ParseItems(uint8_t* data, size_t size) {
  std::vector<Item> items;

  // Parse top-level concatenated items.
  size_t offset = 0;
  while (offset + 2 <= size) {
    Item item = ParseItem(data + offset, size - offset, nullptr);
    if (!item.base) {
      break;
    }

    items.push_back(item);
    offset += item.size();
  }

  // Descend into constructed items.
  for (size_t i = 0; i < items.size(); ++i) {
    Item parent = items[i];
    if (!parent.constructed()) {
      continue;
    }

    offset = 0;
    while (offset + 2 <= parent.contentSize) {
      Item child = ParseItem(parent.contentData() + offset,
                             parent.contentSize - offset, &parent);
      if (!child.base) {
        break;
      }

      items.push_back(child);
      offset += child.size();
    }
  }

  return items;
}
static size_t DropItem(uint8_t* data, size_t size, size_t maxSize,
                       std::mt19937& rng) {
  std::vector<Item> items = ParseItems(data, size);
  if (items.empty()) {
    return 0;
  }

  std::uniform_int_distribution<size_t> dist(0, items.size() - 1);
  Item& item = items.at(dist(rng));

  // Store the size since the memmove below overwrites `item`'s header,
  // changing what size() would return afterwards.
  size_t itemSize = item.size();

  memmove(item.base, item.base + itemSize, item.remainingSize);
  return size - itemSize;
}

static size_t SwapItems(uint8_t* data, size_t size, size_t maxSize,
                        std::mt19937& rng) {
  std::vector<Item> items = ParseItems(data, size);
  if (items.size() < 2) {
    return 0;
  }

  std::uniform_int_distribution<size_t> dist(0, items.size() - 1);
  Item item = items.at(dist(rng));

  // Filter for sibling items.
  auto isInvalidItem = [&item](const Item& it) {
    return it.base == item.base || it.parent != item.parent;
  };
  items.erase(std::remove_if(items.begin(), items.end(), isInvalidItem),
              items.end());

  if (items.empty()) {
    return 0;
  }

  std::uniform_int_distribution<size_t> dist2(0, items.size() - 1);
  Item other = items.at(dist2(rng));

  if (item.base > other.base) {
    std::swap(item, other);
  }

  // Store sizes since memmove may overwrite them.
  size_t itemSize = item.size();
  size_t otherSize = other.size();

  std::vector<uint8_t> scratch(itemSize + otherSize);
  memcpy(scratch.data(), item.base, itemSize);
  memcpy(scratch.data() + itemSize, other.base, otherSize);

  // Move the middle part first.
  size_t middleSize = other.base - (item.base + itemSize);
  memmove(item.base + otherSize, item.base + itemSize, middleSize);

  memcpy(item.base, scratch.data() + itemSize, otherSize);
  memcpy(item.base + otherSize + middleSize, scratch.data(), itemSize);

  return size;
}

static size_t DuplicateItem(uint8_t* data, size_t size, size_t maxSize,
                            std::mt19937& rng) {
  std::vector<Item> items = ParseItems(data, size);
  if (items.empty()) {
    return 0;
  }

  std::uniform_int_distribution<size_t> dist(0, items.size() - 1);
  Item& item = items.at(dist(rng));
  Item& other = items.at(dist(rng));

  // Store sizes since the memmove below may overwrite the tag/length octets
  // of `item` or `other`, changing what size() would return afterwards.
  size_t itemSize = item.size();
  size_t otherSize = other.size();

  if (size + otherSize > maxSize) {
    return 0;
  }

  // Make place to put a copy of `other` before `item`.
  memmove(item.base + otherSize, item.base, itemSize + item.remainingSize);

  // In case `other` was in the memmove range.
  uint8_t* src = (other.base > item.base) ? other.base + otherSize : other.base;
  memmove(item.base, src, otherSize);

  return size + otherSize;
}

static size_t TruncateItem(uint8_t* data, size_t size, size_t maxSize,
                           std::mt19937& rng) {
  std::vector<Item> items = ParseItems(data, size);
  if (items.empty()) {
    return 0;
  }

  std::uniform_int_distribution<size_t> dist(0, items.size() - 1);
  Item& item = items.at(dist(rng));

  if (item.contentSize == 0) {
    return 0;
  }

  std::uniform_int_distribution<size_t> dist2(0, item.contentSize - 1);
  size_t contentSize = dist2(rng);
  size_t removedSize = item.contentSize - contentSize;

  // For Item::Indef, the memmove is sufficient as the EOC is moved
  // to the left.
  memmove(item.contentData() + contentSize,
          item.contentData() + item.contentSize, item.remainingSize);

  if (item.form() == Item::Short) {
    item.lengthData()[0] = static_cast<uint8_t>(contentSize);
  }

  if (item.form() == Item::Long) {
    size_t lengthSize = item.lengthSize();
    for (size_t i = 1; i < lengthSize; ++i) {
      item.lengthData()[lengthSize - i] =
          static_cast<uint8_t>(contentSize & 0xff);
      contentSize >>= 8;
    }
  }

  return size - removedSize;
}

static size_t CorruptLength(uint8_t* data, size_t size, size_t maxSize,
                            std::mt19937& rng) {
  std::vector<Item> items = ParseItems(data, size);
  if (items.empty()) {
    return 0;
  }

  std::uniform_int_distribution<size_t> dist(0, items.size() - 1);
  Item& item = items.at(dist(rng));

  // For Item::Indef, there is nothing we can corrupt.
  if (item.form() == Item::Indef) {
    return 0;
  }

  if (item.form() == Item::Short) {
    std::uniform_int_distribution<uint8_t> dist2(0, 0x7f);
    item.lengthData()[0] = dist2(rng);

    return size;
  }

  size_t lengthSize = item.lengthSize();
  size_t numOctets = lengthSize - 1;

  size_t formCap =
      (size_t{1} << std::min<size_t>(8 * numOctets, 8 * sizeof(size_t) - 1)) -
      1;

  std::uniform_int_distribution<size_t> dist2(0, formCap);
  size_t contentSize = dist2(rng);

  for (size_t i = 1; i < lengthSize; ++i) {
    item.lengthData()[lengthSize - i] =
        static_cast<uint8_t>(contentSize & 0xff);
    contentSize >>= 8;
  }

  return size;
}

static size_t ChangeForm(uint8_t* data, size_t size, size_t maxSize,
                         std::mt19937& rng) {
  std::vector<Item> items = ParseItems(data, size);
  if (items.empty()) {
    return 0;
  }

  std::uniform_int_distribution<size_t> dist(0, items.size() - 1);
  Item& item = items.at(dist(rng));

  // Recover the item's actual content, independent of its current form.
  // For Item::Indef, `contentSize` includes the 2-byte EOC terminator
  // (see ParseItem), so strip it to get the real content length.
  uint8_t* content = item.contentData();
  size_t contentLen = item.contentSize;
  if (item.form() == Item::Indef) {
    if (contentLen < sizeof(kTerminator)) {
      return 0;
    }
    contentLen -= sizeof(kTerminator);
  }

  // Collect the forms we can switch to, excluding the current one.
  // Short form can only hold lengths up to 0x7f; indefinite length is
  // only valid for constructed items.
  std::vector<Item::Form> candidates;
  if (item.form() != Item::Short && contentLen <= 0x7f) {
    candidates.push_back(Item::Short);
  }
  if (item.form() != Item::Long) {
    candidates.push_back(Item::Long);
  }
  if (item.form() != Item::Indef && item.constructed()) {
    candidates.push_back(Item::Indef);
  }
  if (candidates.empty()) {
    return 0;
  }

  std::uniform_int_distribution<size_t> formDist(0, candidates.size() - 1);
  Item::Form target = candidates.at(formDist(rng));

  // Re-encode the item with the new length form. Build it standalone first so
  // `content` (which still points into `data`) is copied before we shift the
  // buffer below.
  std::vector<uint8_t> encoded;
  encoded.push_back(item.tag());

  if (target == Item::Short) {
    encoded.push_back(static_cast<uint8_t>(contentLen));
  } else if (target == Item::Long) {
    // Minimal big-endian octets for `contentLen` (at least one).
    uint8_t octets[sizeof(size_t)];
    size_t numOctets = 0;
    size_t len = contentLen;
    do {
      octets[numOctets++] = static_cast<uint8_t>(len & 0xff);
      len >>= 8;
    } while (len);

    encoded.push_back(static_cast<uint8_t>(0x80 | numOctets));
    for (size_t i = 0; i < numOctets; ++i) {
      encoded.push_back(octets[numOctets - 1 - i]);
    }
  } else {  // Item::Indef
    encoded.push_back(0x80);
  }

  encoded.insert(encoded.end(), content, content + contentLen);

  if (target == Item::Indef) {
    encoded.insert(encoded.end(), kTerminator,
                   kTerminator + sizeof(kTerminator));
  }

  size_t oldSize = item.size();
  size_t remainingSize = item.remainingSize;

  if (encoded.size() > oldSize && size + (encoded.size() - oldSize) > maxSize) {
    return 0;
  }

  memmove(item.base + encoded.size(), item.base + oldSize, remainingSize);
  memcpy(item.base, encoded.data(), encoded.size());

  return size - oldSize + encoded.size();
}

// Split a primitive OCTET STRING or BIT STRING into a constructed
// indefinite-length wrapper with multiple primitive fragments.
// Original:    04 05 [A B C D E]
// Fragmented:  24 80  04 02 [A B]  04 02 [C D]  04 01 [E]  00 00
static size_t FragmentString(uint8_t* data, size_t size, size_t maxSize,
                             std::mt19937& rng) {
  auto isInvalidItem = [](const Item& it) {
    if (it.tag() == 0x04) return it.contentSize < 2;
    if (it.tag() == 0x03) return it.contentSize < 3;
    return true;
  };

  std::vector<Item> items = ParseItems(data, size);
  items.erase(std::remove_if(items.begin(), items.end(), isInvalidItem),
              items.end());
  if (items.empty()) {
    return 0;
  }

  std::uniform_int_distribution<size_t> dist(0, items.size() - 1);
  Item& item = items.at(dist(rng));

  std::vector<uint8_t> fragmentedItem;
  fragmentedItem.push_back(item.tag() | 0x20);
  fragmentedItem.push_back(0x80);

  // BIT STRING: Skip the unusued byte for `remainingSize`.
  bool isBitString = item.tag() == 0x03;
  size_t remainingSize = item.contentSize - (isBitString ? 1 : 0);

  do {
    // BIT STRING: We need to make extra room for the unused byte.
    std::uniform_int_distribution<size_t> dist2(
        1, std::min<size_t>(remainingSize, 0x7f - (isBitString ? 1 : 0)));
    size_t fragmentLen = dist2(rng);

    fragmentedItem.push_back(item.tag());
    fragmentedItem.push_back(
        static_cast<uint8_t>((isBitString ? 1 : 0) + fragmentLen));

    // BIT STRING: The actual unused byte is prepended only to the last
    // fragment data, otherwise zero.
    if (isBitString) {
      uint8_t unused =
          (remainingSize - fragmentLen) == 0 ? item.contentData()[0] : 0;
      fragmentedItem.push_back(unused);
    }

    uint8_t* src = item.contentData() + (item.contentSize - remainingSize);
    fragmentedItem.insert(fragmentedItem.end(), src, src + fragmentLen);

    remainingSize -= fragmentLen;
  } while (remainingSize);

  fragmentedItem.push_back(0x00);
  fragmentedItem.push_back(0x00);

  size_t growth = fragmentedItem.size() - item.size();

  if (size + growth > maxSize) {
    return 0;
  }

  memmove(item.base + fragmentedItem.size(), item.base + item.size(),
          item.remainingSize);
  memcpy(item.base, fragmentedItem.data(), fragmentedItem.size());

  return size + growth;
}

// Re-encode a low-tag-number tag (0..30) in high-tag-number form
// (0x1f + base-128). Non-canonical per DER; X.690 §8.1.2.4.
static size_t RecodeTagLong(uint8_t* data, size_t size, size_t maxSize,
                            std::mt19937& rng) {
  std::vector<Item> items = ParseItems(data, size);
  if (items.empty()) {
    return 0;
  }

  std::uniform_int_distribution<size_t> dist(0, items.size() - 1);
  Item& item = items.at(dist(rng));

  // Already in high-tag-number form, or no room to insert one byte.
  if ((item.tag() & 0x1f) == 0x1f || size + 1 > maxSize) {
    return 0;
  }

  memmove(item.base + 1, item.base, item.size() + item.remainingSize);
  item.base[0] |= 0x1f;
  item.base[1] &= 0x1f;

  return size + 1;
}

static size_t WrapInConstructed(uint8_t* data, size_t size, size_t maxSize,
                                std::mt19937& rng) {
  std::vector<Item> items = ParseItems(data, size);
  if (items.empty()) {
    return 0;
  }

  std::uniform_int_distribution<size_t> dist(0, items.size() - 1);
  Item& item = items.at(dist(rng));

  if (item.size() > 127 || size + 2 > maxSize) {
    return 0;
  }

  // 0x30/0x31 are SEQUENCE/SET; 0xa0..0xa3 are context [0]..[3] constructed,
  // the EXPLICIT-tag shape used for OPTIONAL fields in X.509/CMS/OCSP.
  const uint8_t kWrappers[] = {0x30, 0x31, 0xa0, 0xa1, 0xa2, 0xa3};
  std::uniform_int_distribution<size_t> dist2(
      0, sizeof(kWrappers) / sizeof(kWrappers[0]) - 1);

  memmove(item.base + 2, item.base, item.size() + item.remainingSize);
  item.base[0] = kWrappers[dist2(rng)];
  item.base[1] = static_cast<uint8_t>(item.size());

  return size + 2;
}

using Mutator = size_t (*)(uint8_t*, size_t, size_t, std::mt19937&);

constexpr Mutator kMutators[] = {
    DropItem,   SwapItems,      DuplicateItem, TruncateItem,      CorruptLength,
    ChangeForm, FragmentString, RecodeTagLong, WrapInConstructed,
};

namespace ASN1Mutators {

extern "C" size_t LLVMFuzzerMutate(uint8_t* data, size_t size, size_t maxSize);

size_t CustomMutator(uint8_t* data, size_t size, size_t maxSize,
                     unsigned int seed) {
  std::mt19937 rng(seed);
  std::bernoulli_distribution coin;

  if (coin(rng)) {
    std::uniform_int_distribution<size_t> dist(
        0, (sizeof(kMutators) / sizeof(kMutators[0])) - 1);
    return kMutators[dist(rng)](data, size, maxSize, rng);
  }

  return LLVMFuzzerMutate(data, size, maxSize);
}

size_t CustomCrossOver(const uint8_t* data1, size_t size1, const uint8_t* data2,
                       size_t size2, uint8_t* out, size_t maxOutSize,
                       unsigned int seed) {
  std::mt19937 rng(seed);

  std::vector<Item> items1 = ParseItems(const_cast<uint8_t*>(data1), size1);
  std::vector<Item> items2 = ParseItems(const_cast<uint8_t*>(data2), size2);

  auto isChild = [](const Item& it) { return it.parent != nullptr; };
  items1.erase(std::remove_if(items1.begin(), items1.end(), isChild),
               items1.end());
  items2.erase(std::remove_if(items2.begin(), items2.end(), isChild),
               items2.end());

  std::vector<Item> pool;
  pool.insert(pool.end(), items1.begin(), items1.end());
  pool.insert(pool.end(), items2.begin(), items2.end());

  if (pool.empty()) {
    return 0;
  }

  std::shuffle(pool.begin(), pool.end(), rng);

  size_t outSize = 0;
  for (const Item& item : pool) {
    if (outSize + item.size() > maxOutSize) {
      continue;
    }

    memcpy(out + outSize, item.base, item.size());
    outSize += item.size();
  }

  return outSize;
}

}  // namespace ASN1Mutators
