/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "RealTimeRequestSimulator.h"
#include "mozilla/ClearOnShutdown.h"
#include "mozilla/Preferences.h"
#include "mozilla/RandomNum.h"
#include "mozilla/Services.h"
#include "mozilla/StaticPrefs_browser.h"
#include "mozilla/glean/UrlClassifierMetrics.h"
#include "nsIObserverService.h"
#include "nsThreadUtils.h"
#include "nsUrlClassifierDBService.h"
#include "LookupCache.h"
#include "prtime.h"

namespace mozilla {
namespace safebrowsing {

StaticRefPtr<RealTimeRequestSimulator> RealTimeRequestSimulator::sInstance;

/* static */
RealTimeRequestSimulator* RealTimeRequestSimulator::GetInstance() {
  MOZ_ASSERT(NS_IsMainThread());

  if (!sInstance) {
    sInstance = new RealTimeRequestSimulator();
    ClearOnShutdown(&sInstance);
  }
  return sInstance.get();
}

void RealTimeRequestSimulator::ComputeFullHashesFromURL(
    const nsACString& aURL, nsTArray<Completion>& aHashes) {
  nsTArray<nsCString> fragments;
  LookupCache::GetLookupFragments(aURL, &fragments);

  aHashes.SetCapacity(fragments.Length());
  for (const auto& fragment : fragments) {
    Completion hash;
    hash.FromPlaintext(fragment);
    aHashes.AppendElement(hash);
  }
}

// static
uint32_t RealTimeRequestSimulator::EstimateRequestSize(
    uint32_t aHashPrefixCount) {
  if (aHashPrefixCount == 0) {
    return 0;
  }

  // The request URL format is:
  //   <gethashURL>&hashPrefixes=<base64>&hashPrefixes=<base64>&...
  //
  // The gethash URL from browser.safebrowsing.provider.google5.gethashURL is:
  //   https://safebrowsing.googleapis.com/v5/hashes:search?key=<API_KEY>
  //   (approximately 70 bytes with the API key)
  //
  // For query parameters, each hash prefix contributes:
  //   - "&" separator: 1 byte
  //   - "hashPrefixes=" : 13 bytes
  //   - Base64 encoded 4-byte prefix: 8 bytes (4 bytes -> 6 chars + "=="
  //   padding)
  //
  // Total per prefix: 1 + 13 + 8 = 22 bytes
  constexpr uint32_t kBaseURLSize = 70;
  constexpr uint32_t kSeparatorSize = 1;     // "&"
  constexpr uint32_t kParamNameSize = 13;    // "hashPrefixes="
  constexpr uint32_t kBase64PrefixSize = 8;  // Base64 encoded 4-byte prefix

  uint32_t perPrefixSize = kSeparatorSize + kParamNameSize + kBase64PrefixSize;
  return kBaseURLSize + aHashPrefixCount * perPrefixSize;
}

// static
uint32_t RealTimeRequestSimulator::EstimateResponseSize(uint32_t aNumHits) {
  // The response is a protobuf-encoded SearchHashesResponse message.
  // See safebrowsing_v5.proto for the message definition.
  //
  // SearchHashesResponse contains:
  //   - repeated FullHash full_hashes = 1;
  //   - Duration cache_duration = 2;
  //
  // Protobuf encoding overhead:
  //   - Each field has a tag (1 byte for small field numbers)
  //   - Length-delimited fields (bytes, embedded messages) have a length prefix
  //
  // Duration message (cache_duration):
  //   - tag (1 byte) + length (1 byte) + seconds field (~3 bytes for typical
  //     values like 300s)
  //   Estimated: ~5 bytes
  //
  // FullHash message (only present on hit):
  //   - full_hash (field 1): tag (1) + length (1) + 32 bytes = 34 bytes
  //   - full_hash_details (field 2): tag (1) + length (1) + FullHashDetail
  //     - FullHashDetail: threat_type enum (~2 bytes)
  //     Estimated: ~4 bytes
  //   - FullHash wrapper: tag (1) + length (1) + content (~38) = ~40 bytes
  //
  // Total estimates:
  //   - Miss (no full hashes): ~5 bytes (just cache_duration)
  //   - Hit (N full hashes): ~5 + N * ~40 bytes
  constexpr uint32_t kCacheDurationSize = 5;
  constexpr uint32_t kFullHashSize = 40;

  return kCacheDurationSize + aNumHits * kFullHashSize;
}

bool RealTimeRequestSimulator::ShouldSimulateHit() {
  constexpr uint32_t kMaxProbability = 1000000;

  uint32_t probability =
      StaticPrefs::browser_safebrowsing_realTime_simulation_hitProbability();

  if (probability == 0) {
    return false;
  }
  if (probability >= kMaxProbability) {
    return true;
  }

  Maybe<uint64_t> randomVal = RandomUint64();
  if (!randomVal) {
    return false;
  }

  return (*randomVal % kMaxProbability) < probability;
}

void RealTimeRequestSimulator::SimulateRealTimeRequest(const nsACString& aURL,
                                                       bool aIsPrivate) {
  MOZ_ASSERT(nsUrlClassifierDBService::BackgroundThread() ==
             NS_GetCurrentThread());

  nsTArray<Completion> fullHashes;
  ComputeFullHashesFromURL(aURL, fullHashes);

  int64_t now = PR_Now() / PR_USEC_PER_SEC;

  // Filter out cached hashes and check for cache hits.
  nsTArray<Completion> hashesToSend;
  for (const auto& fullHash : fullHashes) {
    uint32_t prefix = fullHash.ToUint32();
    nsCString fullHashString(reinterpret_cast<const char*>(fullHash.buf),
                             COMPLETE_SIZE);

    CachedFullHashResponse* cachedResponse = mSimulatedCache.Get(prefix);
    if (!cachedResponse) {
      hashesToSend.AppendElement(fullHash);
      continue;
    }

    // The cache entry is expired. Remove it and send this hash.
    if (cachedResponse->negativeCacheExpirySec < now) {
      mSimulatedCache.Remove(prefix);
      hashesToSend.AppendElement(fullHash);
      continue;
    }

    // We find a match in the cache, so we don't need to send the request.
    if (cachedResponse->fullHashes.Contains(fullHashString)) {
      NotifyResult(false, 0, 0, aIsPrivate);
      return;
    }

    // The prefix is cached but no full hash match. Still need to send.
    hashesToSend.AppendElement(fullHash);
  }

  if (hashesToSend.IsEmpty()) {
    NotifyResult(false, 0, 0, aIsPrivate);
    return;
  }

  // We will need to simulate a request. Let's estimate the request size.
  // Include noise entries in the count.
  uint32_t noiseCount =
      StaticPrefs::browser_safebrowsing_realTime_simulation_noiseEntryCount();
  uint32_t requestBytes =
      EstimateRequestSize(hashesToSend.Length() + noiseCount);
  uint32_t ttl =
      StaticPrefs::browser_safebrowsing_realTime_simulation_cacheTTLSec();
  int64_t expiry = now + ttl;

  uint32_t numHits = 0;

  for (const auto& fullHash : hashesToSend) {
    // If the server doesn't hit the given full hash, we will continue.
    if (!ShouldSimulateHit()) {
      continue;
    }

    numHits++;

    nsDependentCSubstring fullHashString(
        reinterpret_cast<const char*>(fullHash.buf), COMPLETE_SIZE);

    // There is a hit, so we create a cache entry for it.
    CachedFullHashResponse* response =
        mSimulatedCache.GetOrInsertNew(fullHash.ToUint32());
    response->negativeCacheExpirySec = expiry;
    response->fullHashes.InsertOrUpdate(fullHashString, expiry);
  }

  // Estimate the response size based on the number of hits.
  uint32_t responseBytes = EstimateResponseSize(numHits);

  NotifyResult(true, requestBytes, responseBytes, aIsPrivate);
}

void RealTimeRequestSimulator::NotifyResult(bool aWouldSendRequest,
                                            uint32_t aRequestBytes,
                                            uint32_t aResponseBytes,
                                            bool aIsPrivate) {
  NS_DispatchToMainThread(NS_NewRunnableFunction(
      "RealTimeRequestSimulator::NotifyResult",
      [aWouldSendRequest, aRequestBytes, aResponseBytes, aIsPrivate]() {
        if (aWouldSendRequest) {
          nsAutoCString etpCategory;
          nsresult rv = Preferences::GetCString(
              "browser.contentblocking.category", etpCategory);

          if (NS_SUCCEEDED(rv)) {
            nsAutoCString label;
            if (etpCategory.EqualsLiteral("standard") ||
                etpCategory.EqualsLiteral("strict") ||
                etpCategory.EqualsLiteral("custom")) {
              label = etpCategory;
            } else {
              label = "other"_ns;
            }
            label.Append('_');
            label.Append(aIsPrivate ? "private"_ns : "normal"_ns);

            glean::urlclassifier::realtime_simulation_request_count.Get(label)
                .Add(1);
            glean::urlclassifier::realtime_simulation_request_size.Get(label)
                .Add(aRequestBytes);
            glean::urlclassifier::realtime_simulation_response_size.Get(label)
                .Add(aResponseBytes);
          }
        }

        if (Preferences::GetBool("browser.safebrowsing.realTime.debug",
                                 false)) {
          nsAutoCString data;
          data.AppendInt(aWouldSendRequest ? 1 : 0);
          data.Append(',');
          data.AppendInt(aRequestBytes);
          data.Append(',');
          data.AppendInt(aResponseBytes);

          nsCOMPtr<nsIObserverService> observerService =
              mozilla::services::GetObserverService();
          if (observerService) {
            observerService->NotifyObservers(
                nullptr, "urlclassifier-realtime-simulation-result",
                NS_ConvertUTF8toUTF16(data).get());
          }
        }
      }));
}

void RealTimeRequestSimulator::CleanCache() {
  MOZ_ASSERT(nsUrlClassifierDBService::BackgroundThread() ==
             NS_GetCurrentThread());

  mSimulatedCache.Clear();
}

}  // namespace safebrowsing
}  // namespace mozilla
