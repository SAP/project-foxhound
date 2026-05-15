/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "nsUrlClassifierTestUtils.h"

#include "chromium/safebrowsing_v5.pb.h"
#include "mozilla/ClearOnShutdown.h"
#include "mozilla/StaticPtr.h"
#include "Entries.h"
#include "mozilla/EndianUtils.h"
#include "nsString.h"

NS_IMPL_ISUPPORTS(nsUrlClassifierTestUtils, nsIUrlClassifierTestUtils)

using namespace mozilla;
using namespace mozilla::safebrowsing;

static mozilla::StaticRefPtr<nsUrlClassifierTestUtils> gUrlClassifierTestUtils;

// static
already_AddRefed<nsUrlClassifierTestUtils>
nsUrlClassifierTestUtils::GetXPCOMSingleton() {
  if (gUrlClassifierTestUtils) {
    return do_AddRef(gUrlClassifierTestUtils);
  }

  RefPtr<nsUrlClassifierTestUtils> utils = new nsUrlClassifierTestUtils();

  // Note: This is cleared in the nsUrlClassifierUtils destructor.
  gUrlClassifierTestUtils = utils.get();
  ClearOnShutdown(&gUrlClassifierTestUtils);
  return utils.forget();
}

NS_IMETHODIMP
nsUrlClassifierTestUtils::MakeUpdateResponseV5(const nsACString& aName,
                                               uint32_t aSingleHash,
                                               nsACString& aResponse) {
  if (NS_WARN_IF(aName.IsEmpty())) {
    return NS_ERROR_INVALID_ARG;
  }

  v5::BatchGetHashListsResponse response;

  v5::HashList* hashList = response.add_hash_lists();

  hashList->set_name("test-4b");
  hashList->set_partial_update(false);
  hashList->set_version("\x00\x00\x00\x01");

  v5::RiceDeltaEncoded32Bit* riceDelta =
      hashList->mutable_additions_four_bytes();

  uint32_t prefix = BigEndian::readUint32(&aSingleHash);

  riceDelta->set_first_value(prefix);
  riceDelta->set_rice_parameter(30);
  riceDelta->set_entries_count(0);

  std::string s;
  response.SerializeToString(&s);

  nsCString out(s.c_str(), s.size());

  aResponse = out;

  return NS_OK;
}

NS_IMETHODIMP
nsUrlClassifierTestUtils::MakeUpdateResponseV5_32b(const nsACString& aName,
                                                   const nsACString& aFullHash,
                                                   nsACString& aResponse) {
  if (NS_WARN_IF(aName.IsEmpty()) || NS_WARN_IF(aFullHash.Length() != 32)) {
    return NS_ERROR_INVALID_ARG;
  }

  v5::BatchGetHashListsResponse response;

  v5::HashList* hashList = response.add_hash_lists();

  hashList->set_name("test-32b");
  hashList->set_partial_update(false);
  hashList->set_version("\x00\x00\x00\x01");

  v5::RiceDeltaEncoded256Bit* riceDelta =
      hashList->mutable_additions_thirty_two_bytes();

  // Split the 32-byte hash into four 64-bit parts (big-endian).
  const uint8_t* data =
      reinterpret_cast<const uint8_t*>(aFullHash.BeginReading());
  uint64_t part1 = BigEndian::readUint64(data);
  uint64_t part2 = BigEndian::readUint64(data + 8);
  uint64_t part3 = BigEndian::readUint64(data + 16);
  uint64_t part4 = BigEndian::readUint64(data + 24);

  riceDelta->set_first_value_first_part(part1);
  riceDelta->set_first_value_second_part(part2);
  riceDelta->set_first_value_third_part(part3);
  riceDelta->set_first_value_fourth_part(part4);
  riceDelta->set_rice_parameter(30);
  riceDelta->set_entries_count(0);

  std::string s;
  response.SerializeToString(&s);

  nsCString out(s.c_str(), s.size());

  aResponse = out;

  return NS_OK;
}

NS_IMETHODIMP
nsUrlClassifierTestUtils::MakeFindFullHashResponseV5(
    const nsACString& aFullHash, nsACString& aResponse) {
  if (NS_WARN_IF(aFullHash.IsEmpty())) {
    return NS_ERROR_INVALID_ARG;
  }

  v5::SearchHashesResponse response;

  nsAutoCString fullHashData(aFullHash);

  v5::FullHash* fullHash = response.add_full_hashes();

  fullHash->set_full_hash(fullHashData.get(), fullHashData.Length());

  v5::FullHash_FullHashDetail* fullHashDetail =
      fullHash->add_full_hash_details();

  fullHashDetail->set_threat_type(v5::MALWARE);

  v5::Duration* duration = response.mutable_cache_duration();
  duration->set_seconds(300);
  duration->set_nanos(0);

  std::string s;
  response.SerializeToString(&s);

  nsCString out(s.c_str(), s.size());

  aResponse = out;

  return NS_OK;
}

NS_IMETHODIMP
nsUrlClassifierTestUtils::GenerateLookupHash(const nsACString& aFragment,
                                             uint32_t* aLookupHash) {
  if (NS_WARN_IF(aFragment.IsEmpty())) {
    return NS_ERROR_INVALID_ARG;
  }

  Completion lookupHash;
  lookupHash.FromPlaintext(aFragment);

  *aLookupHash = lookupHash.ToUint32();

  return NS_OK;
}

NS_IMETHODIMP
nsUrlClassifierTestUtils::GenerateFullHash(const nsACString& aFragment,
                                           nsACString& aFullHash) {
  if (NS_WARN_IF(aFragment.IsEmpty())) {
    return NS_ERROR_INVALID_ARG;
  }

  Completion lookupHash;
  lookupHash.FromPlaintext(aFragment);

  lookupHash.ToString(aFullHash);

  return NS_OK;
}

NS_IMETHODIMP
nsUrlClassifierTestUtils::GenerateFullHashRaw(const nsACString& aFragment,
                                              nsACString& aFullHash) {
  if (NS_WARN_IF(aFragment.IsEmpty())) {
    return NS_ERROR_INVALID_ARG;
  }

  Completion lookupHash;
  lookupHash.FromPlaintext(aFragment);

  // Return raw bytes (32 bytes).
  aFullHash.Assign(reinterpret_cast<const char*>(lookupHash.buf),
                   Completion::sHashSize);

  return NS_OK;
}
