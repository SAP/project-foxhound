/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mutators.h"

#include <algorithm>
#include <cstddef>
#include <cstdint>
#include <cstring>
#include <random>
#include <vector>

#include "tls_parser.h"

// TLS record header: ContentType(1) + ProtocolVersion(2) + length(2) = 5 bytes.
// DTLS adds epoch(2) + sequence_number(6) before the length field.
// See RFC 8446 Section 5.1 (TLS) and RFC 9147 Section 4 (DTLS).
constexpr size_t kHeaderBytes = 5 + EXTRA_HEADER_BYTES;
constexpr size_t kLengthOffset = 3 + EXTRA_HEADER_BYTES;

// RFC 8446 Section 5.1: change_cipher_spec(20), alert(21),
// handshake(22), application_data(23). Also heartbeat(24, RFC 6520),
// tls12_cid(25, RFC 9146), and ACK(26, RFC 9147 DTLS 1.3).
constexpr uint8_t kContentTypes[] = {20, 21, 22, 23, 24, 25, 26};

struct Record {
  uint8_t* data;
  size_t size;
  size_t remaining;

  uint8_t contentType() { return data[0]; }
};

static std::vector<Record> ParseRecords(uint8_t* data, size_t size) {
  std::vector<Record> records;
  nss_test::TlsParser parser(data, size);

  while (parser.remaining()) {
    size_t offset = parser.consumed();

    if (!parser.Skip(kLengthOffset)) {
      break;
    }

    // Read the 2-byte length field, then skip that many payload bytes.
    if (!parser.SkipVariable(2)) {
      break;
    }

    records.push_back(
        {data + offset, parser.consumed() - offset, parser.remaining()});
  }

  return records;
}

static size_t DropRecord(uint8_t* data, size_t size, size_t maxSize,
                         std::mt19937& rng) {
  std::vector<Record> records = ParseRecords(data, size);
  if (records.empty()) {
    return 0;
  }

  std::uniform_int_distribution<size_t> dist(0, records.size() - 1);
  Record& record = records.at(dist(rng));

  memmove(record.data, record.data + record.size, record.remaining);
  return size - record.size;
}

static size_t SwapRecords(uint8_t* data, size_t size, size_t maxSize,
                          std::mt19937& rng) {
  std::vector<Record> records = ParseRecords(data, size);
  if (records.size() < 2) {
    return 0;
  }

  std::uniform_int_distribution<size_t> dist(0, records.size() - 1);
  size_t i = dist(rng);
  size_t j;
  do {
    j = dist(rng);
  } while (j == i);

  // Read from buf (snapshot), write to data. Do not remove the copy;
  // without it, in-place reordering of variable-size records aliases.
  std::vector<uint8_t> buf(data, data + size);
  std::swap(records.at(i), records.at(j));

  uint8_t* dest = data;
  for (Record& rec : records) {
    memcpy(dest, buf.data() + (rec.data - data), rec.size);
    dest += rec.size;
  }

  return size;
}

// Copy a random record and insert the duplicate before a random record.
static size_t DuplicateRecord(uint8_t* data, size_t size, size_t maxSize,
                              std::mt19937& rng) {
  std::vector<Record> records = ParseRecords(data, size);
  if (records.empty()) {
    return 0;
  }

  std::uniform_int_distribution<size_t> dist(0, records.size() - 1);
  Record& record = records.at(dist(rng));

  if (size + record.size > maxSize) {
    return 0;
  }

  Record& other = records.at(dist(rng));

  memmove(other.data + record.size, other.data, other.size + other.remaining);

  uint8_t* src =
      (record.data < other.data) ? record.data : record.data + record.size;
  memcpy(other.data, src, record.size);

  return size + record.size;
}

// Shorten a random record's payload to a random length.
static size_t TruncateRecord(uint8_t* data, size_t size, size_t maxSize,
                             std::mt19937& rng) {
  std::vector<Record> records = ParseRecords(data, size);
  if (records.empty()) {
    return 0;
  }

  std::uniform_int_distribution<size_t> dist(0, records.size() - 1);
  Record& record = records.at(dist(rng));

  if (record.size <= kHeaderBytes) {
    return 0;
  }

  std::uniform_int_distribution<size_t> dist2(kHeaderBytes, record.size - 1);
  size_t length = dist2(rng);

  size_t payloadLength = length - kHeaderBytes;
  record.data[kLengthOffset] = (payloadLength >> 8) & 0xff;
  record.data[kLengthOffset + 1] = payloadLength & 0xff;

  memmove(record.data + length, record.data + record.size, record.remaining);

  return size + length - record.size;
}

// Split a random record into two records of the same ContentType.
// RFC 8446 Section 5.1: "Multiple fragments of a Handshake message may be
// coalesced into a single TLSPlaintext record" -- the inverse is also valid.
// For DTLS the second record inherits the first's epoch/seqno; real DTLS
// fragments at the handshake layer, but duplicate seqnos exercise anti-replay.
static size_t FragmentRecord(uint8_t* data, size_t size, size_t maxSize,
                             std::mt19937& rng) {
  if (size + kHeaderBytes > maxSize) {
    return 0;
  }

  std::vector<Record> records = ParseRecords(data, size);
  if (records.empty()) {
    return 0;
  }

  std::uniform_int_distribution<size_t> dist(0, records.size() - 1);
  Record& record = records.at(dist(rng));
  size_t contentLength = record.size - kHeaderBytes;

  if (contentLength < 2) {
    return 0;
  }

  std::uniform_int_distribution<size_t> dist2(1, contentLength - 1);
  size_t firstLength = dist2(rng);
  size_t secondLength = contentLength - firstLength;

  // Update first record's length.
  record.data[kLengthOffset] = (firstLength >> 8) & 0xff;
  record.data[kLengthOffset + 1] = firstLength & 0xff;

  // Make room for the second record's header at the split point.
  uint8_t* second = record.data + kHeaderBytes + firstLength;
  memmove(second + kHeaderBytes, second, record.remaining + secondLength);

  // Write second header: copy type/version from first, set new length.
  memcpy(second, record.data, kLengthOffset);
  second[kLengthOffset] = (secondLength >> 8) & 0xff;
  second[kLengthOffset + 1] = secondLength & 0xff;

  return size + kHeaderBytes;
}

// Insert a zero-length record with a random content type before a random
// record. RFC 8446 Section 5.4: "Application Data records may contain a
// zero-length TLSInnerPlaintext.content".
static size_t InjectEmptyRecord(uint8_t* data, size_t size, size_t maxSize,
                                std::mt19937& rng) {
  if (size + kHeaderBytes > maxSize) {
    return 0;
  }

  std::vector<Record> records = ParseRecords(data, size);
  if (records.empty()) {
    return 0;
  }

  std::uniform_int_distribution<size_t> dist(0, records.size() - 1);
  Record& record = records.at(dist(rng));

  uint8_t* dest = record.data;
  memmove(dest + kHeaderBytes, dest, record.size + record.remaining);

  // Copy ProtocolVersion (+ epoch/seqno for DTLS) from the adjacent
  // record, pick a random ContentType, and set length to zero.
  memcpy(dest + 1, dest + kHeaderBytes + 1, kLengthOffset - 1);

  std::uniform_int_distribution<size_t> dist2(0, sizeof(kContentTypes) - 1);
  dest[0] = kContentTypes[dist2(rng)];

  dest[kLengthOffset] = 0;
  dest[kLengthOffset + 1] = 0;

  return size + kHeaderBytes;
}

// Merge two adjacent records that share a ContentType into one.
// Inverse of FragmentRecord. RFC 8446 Section 5.1: "Handshake messages may
// be fragmented over several records".
static size_t MergeRecords(uint8_t* data, size_t size, size_t maxSize,
                           std::mt19937& rng) {
  std::vector<Record> records = ParseRecords(data, size);
  if (records.size() < 2) {
    return 0;
  }

  std::vector<size_t> candidates;
  for (size_t i = 0; i + 1 < records.size(); i++) {
    if (records[i].contentType() == records[i + 1].contentType()) {
      candidates.push_back(i);
    }
  }

  if (candidates.empty()) {
    return 0;
  }

  std::uniform_int_distribution<size_t> dist(0, candidates.size() - 1);
  size_t idx = candidates.at(dist(rng));

  Record& first = records.at(idx);
  Record& second = records.at(idx + 1);

  size_t combinedPayload =
      (first.size - kHeaderBytes) + (second.size - kHeaderBytes);

  // RFC 8446 Section 5.1: TLSPlaintext.length MUST NOT exceed 2^14.
  // We use the uint16 max here to also exercise the overflow path.
  if (combinedPayload > 0xffff) {
    return 0;
  }

  first.data[kLengthOffset] = (combinedPayload >> 8) & 0xff;
  first.data[kLengthOffset + 1] = combinedPayload & 0xff;

  uint8_t* secondHeader = second.data;
  memmove(secondHeader, secondHeader + kHeaderBytes,
          second.size - kHeaderBytes + second.remaining);

  return size - kHeaderBytes;
}

// Extend a random record's payload with random bytes.
// Inverse of TruncateRecord. Exercises overlong-message handling and
// "trailing data after message" code paths.
static size_t ExtendRecord(uint8_t* data, size_t size, size_t maxSize,
                           std::mt19937& rng) {
  std::vector<Record> records = ParseRecords(data, size);
  if (records.empty()) {
    return 0;
  }

  std::uniform_int_distribution<size_t> dist(0, records.size() - 1);
  Record& record = records.at(dist(rng));

  size_t available = maxSize - size;
  if (available == 0) {
    return 0;
  }

  size_t currentPayload = record.size - kHeaderBytes;
  if (currentPayload >= 0xffff) {
    return 0;
  }

  size_t maxExtend = std::min(available, (size_t)0xffff - currentPayload);
  std::uniform_int_distribution<size_t> dist2(1, maxExtend);
  size_t extendBy = dist2(rng);

  // Make room after the record's current payload.
  uint8_t* insertPoint = record.data + record.size;
  memmove(insertPoint + extendBy, insertPoint, record.remaining);

  // Fill extension with random bytes.
  std::uniform_int_distribution<uint8_t> dist3(0, 255);
  for (size_t i = 0; i < extendBy; ++i) {
    insertPoint[i] = dist3(rng);
  }

  // Update the length field.
  size_t newPayload = currentPayload + extendBy;
  record.data[kLengthOffset] = (newPayload >> 8) & 0xff;
  record.data[kLengthOffset + 1] = newPayload & 0xff;

  return size + extendBy;
}

using Mutator = size_t (*)(uint8_t*, size_t, size_t, std::mt19937&);

constexpr Mutator kMutators[] = {
    DropRecord,     SwapRecords,       DuplicateRecord, TruncateRecord,
    FragmentRecord, InjectEmptyRecord, MergeRecords,    ExtendRecord,
};

namespace TlsMutators {

extern "C" size_t LLVMFuzzerMutate(uint8_t* data, size_t size, size_t maxSize);

// Pick a random TLS-aware mutator or fall back to libFuzzer's default.
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

// Merge records from two transcripts, shuffle, and write to `out`.
// const_cast is safe: records are only read via memcpy to `out`.
size_t CustomCrossOver(const uint8_t* data1, size_t size1, const uint8_t* data2,
                       size_t size2, uint8_t* out, size_t maxOutSize,
                       unsigned int seed) {
  std::vector<Record> records1 =
      ParseRecords(const_cast<uint8_t*>(data1), size1);
  if (records1.empty()) {
    return 0;
  }

  std::vector<Record> records2 =
      ParseRecords(const_cast<uint8_t*>(data2), size2);
  if (records2.empty()) {
    return 0;
  }

  // Append `records2` to the back of `records1`.
  std::move(records2.begin(), records2.end(), std::back_inserter(records1));

  std::mt19937 rng(seed);
  std::shuffle(records1.begin(), records1.end(), rng);

  size_t total = 0;
  for (Record& record : records1) {
    size_t length = record.size;
    if (total + length > maxOutSize) {
      break;
    }

    memcpy(out + total, record.data, length);
    total += length;
  }

  return total;
}

}  // namespace TlsMutators
