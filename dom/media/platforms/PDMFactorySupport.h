/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#if !defined(PDMFactorySupport_h_)
#  define PDMFactorySupport_h_

#  include "MediaCodecsSupport.h"
#  include "PDMFactory.h"
#  include "mozilla/RefPtr.h"
#  include "mozilla/StaticMutex.h"
#  include "nsStringFwd.h"

namespace mozilla {

class DecoderDoctorDiagnostics;
struct SupportDecoderParams;

// `PDMFactorySupport` is a process-wide cache of `PDMFactory` support
// queries. Use it whenever you only need to ask whether a mime type or
// decoder configuration is supported; it avoids constructing a fresh
// `PDMFactory` per call. Constructing a `PDMFactory` is expensive — it
// enumerates every available platform decoder module and logs their
// configuration — and that cost dominates query-only paths like
// `MediaSource.isTypeSupported`. Sharing a single `PDMFactory` across
// queries pays that cost once per process and reuses the result for every
// subsequent query, while pref and `gfxVar` listeners ensure the cached
// answer stays consistent with the current configuration. Decoder creation
// paths must continue to use `new PDMFactory()` directly because they
// depend on per-stream state.
//
// Used primarily in the content process, where the bulk of the
// `isTypeSupported` traffic originates. The RDD, GPU, and
// utility-media-service processes also reach this class indirectly via
// `PDMFactory::Supported()` when a `gfxVar` update arrives over IPC and
// they need to recompute their `MediaCodecsSupported` snapshot.
class PDMFactorySupport final {
 public:
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(PDMFactorySupport)

  // Public query API. These resolve the singleton internally and return an
  // empty `DecodeSupportSet` (semantically "not supported") past
  // `AppShutdownConfirmed`.
  static media::DecodeSupportSet IsTypeSupported(const nsACString& aMimeType);
  static media::DecodeSupportSet IsSupported(
      const SupportDecoderParams& aParams,
      DecoderDoctorDiagnostics* aDiagnostics);

  // Singleton accessor. Thread-safe; lazily builds the cached factory on
  // first call. Returns null after `AppShutdownConfirmed`. Prefer the static
  // query methods above for query-only call sites; `Instance()` is exposed
  // mainly so gtests can exercise the singleton's lifecycle directly.
  static RefPtr<PDMFactorySupport> Instance();

  // Marks the singleton as stale so the next `Instance()` call rebuilds it.
  // Cheap, lock-free, callable from any thread.
  static void Invalidate();

 private:
  PDMFactorySupport();
  ~PDMFactorySupport() = default;

  media::DecodeSupportSet SupportsMimeType(const nsACString& aMimeType) const {
    return mFactory->SupportsMimeType(aMimeType);
  }

  media::DecodeSupportSet Supports(
      const SupportDecoderParams& aParams,
      DecoderDoctorDiagnostics* aDiagnostics) const {
    return mFactory->Supports(aParams, aDiagnostics);
  }

  // Returns false if registration fails on the main thread
  static bool EnsureInvalidationListenersRegistered();
  static void OnInvalidatingPrefChanged(const char* aPref, void* aData);
  static void OnInvalidatingGfxVarChanged();

  const RefPtr<PDMFactory> mFactory;
};

}  // namespace mozilla

#endif  // PDMFactorySupport_h_
