/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef RealTimeRequestSimulator_h_
#define RealTimeRequestSimulator_h_

#include "mozilla/StaticPtr.h"
#include "nsString.h"
#include "Entries.h"

namespace mozilla {
namespace safebrowsing {

class RealTimeRequestSimulator final {
 public:
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(RealTimeRequestSimulator)

  static RealTimeRequestSimulator* GetInstance();

  // Called from the URL Classifier background thread only.
  void SimulateRealTimeRequest(const nsACString& aURL, bool aIsPrivate);

  // A test-only function to clean the simulated local cache.
  void CleanCache();

 private:
  RealTimeRequestSimulator() = default;
  ~RealTimeRequestSimulator() = default;

  void ComputeFullHashesFromURL(const nsACString& aURL,
                                nsTArray<Completion>& aHashes);

  bool ShouldSimulateHit();

  // Estimates the size of the request URL for a V5 hash lookup request.
  // See MakeFindFullHashRequestV5 in nsUrlClassifierUtils.cpp for the actual
  // implementation.
  static uint32_t EstimateRequestSize(uint32_t aHashPrefixCount);

  // Estimates the size of the response body for a V5 hash lookup response.
  // The response is a protobuf-encoded SearchHashesResponse message.
  // See safebrowsing_v5.proto for the message definition.
  static uint32_t EstimateResponseSize(uint32_t aNumHits);

  // aWouldSendRequest: true if a real-time request would be triggered
  // aRequestBytes: estimated request size in bytes (0 if no request)
  // aResponseBytes: estimated response size in bytes (0 if no request)
  void NotifyResult(bool aWouldSendRequest, uint32_t aRequestBytes,
                    uint32_t aResponseBytes, bool aIsPrivate);

  // Only accessed from the URL Classifier background thread.
  FullHashResponseMap mSimulatedCache;

  static StaticRefPtr<RealTimeRequestSimulator> sInstance;
};

}  // namespace safebrowsing
}  // namespace mozilla

#endif  // RealTimeRequestSimulator_h_
