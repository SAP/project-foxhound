/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Regression test for bug 1972278: MFShutdown vs MFTEnumEx deadlock.
//
// The encoder support probe (CanCreateWMFEncoder, triggered by
// GPUParent::RecvInit / RecvUpdateVar) calls MFTEnumEx on an implicit-MTA
// background thread while MFShutdown runs concurrently. mfplat's RTWorkQ and
// MFTEnumCache take locks in opposite order:
//
//   MFShutdown:  holds RTWorkQ lock -> wants MFTEnumCache lock
//   MFTEnumEx:   holds MFTEnumCache lock -> wants RTWorkQ lock
//
// The fix holds sMFTEnumShutdownMutex in both wmf::MFTEnumEx and
// MediaFoundationInitializer::MFShutdown so the two operations are serialized.

#include <atomic>

#include "EncoderConfig.h"
#include "MediaCodecsSupport.h"
#include "WMF.h"
#include "gtest/gtest.h"
#include "mozilla/mscom/EnsureMTA.h"
#include "nsThreadUtils.h"

namespace mozilla {
// Forward declaration to avoid pulling in WMFDataEncoderUtils.h and its
// transitive libyuv dependency.
media::EncodeSupportSet CanCreateWMFEncoder(const EncoderConfig& aConfig);

TEST(WMFDeadlock, ShutdownRace)
{
  using MFStartupFn = HRESULT(STDMETHODCALLTYPE*)(ULONG, DWORD);
  using MFShutdownFn = HRESULT(STDMETHODCALLTYPE*)();

  // HasInitialized starts MF on the persistent MTA thread, matching the real
  // process setup.
  ASSERT_TRUE(wmf::MediaFoundationInitializer::HasInitialized());

  HMODULE mfplat = GetModuleHandleW(L"mfplat.dll");
  ASSERT_TRUE(mfplat);
  auto mfStartup =
      reinterpret_cast<MFStartupFn>(GetProcAddress(mfplat, "MFStartup"));
  auto mfShutdown =
      reinterpret_cast<MFShutdownFn>(GetProcAddress(mfplat, "MFShutdown"));
  ASSERT_TRUE(mfStartup && mfShutdown);

  // Minimal encoder config, enough to reach MFTEnumEx via CanCreateWMFEncoder.
  EncoderConfig cfg;
  cfg.mCodec = CodecType::H264;
  cfg.mSize = gfx::IntSize(640, 480);

  // This has been observed to trigger in <=5 iterations on try, using 20 to try
  // and ensure triggering, but to not take too long when there is no deadlock.
  constexpr int kMaxIterations = 20;
  // MF_WIN7_VERSION matches what MediaFoundationInitializer::MFStartup uses.
  constexpr ULONG kMFVersion = (0x0002 << 16 | MF_API_VERSION);

  for (int iter = 0; iter < kMaxIterations; ++iter) {
    if (iter > 0) {
      HRESULT hr = E_FAIL;
      mscom::EnsureMTA([&]() { hr = mfStartup(kMFVersion, MFSTARTUP_FULL); });
      ASSERT_HRESULT_SUCCEEDED(hr);
    }

    std::atomic<bool> ready{false};
    std::atomic<bool> go{false};
    std::atomic<bool> done{false};

    // A background pool thread (implicit MTA) calls CanCreateWMFEncoder, the
    // exact probe path that triggered the original bug. EnsureMTA inside
    // CanCreateWMFEncoder runs inline on this implicit-MTA thread, racing with
    // MFShutdown on the persistent MTA thread.
    NS_DispatchBackgroundTask(NS_NewRunnableFunction(
        "WMFDeadlockReproEnum", [&go, &ready, &done, &cfg]() {
          ready.store(true);
          while (!go.load()) {
          }
          (void)CanCreateWMFEncoder(cfg);
          done.store(true);
        }));

    while (!ready.load()) {
    }

    // Release the probe and race MFShutdown with CanCreateWMFEncoder.
    // We acquire sMFTEnumShutdownMutex here directly because
    // MediaFoundationInitializer::MFShutdown() is deliberately private; this
    // mirrors what the real MFShutdown() wrapper does.
    HRESULT hr = E_FAIL;
    mscom::EnsureMTA([&]() {
      go.store(true);
      StaticMutexAutoLock lock(wmf::sMFTEnumShutdownMutex);
      hr = mfShutdown();
    });

    while (!done.load()) {
    }

    ASSERT_HRESULT_SUCCEEDED(hr);
  }

  // Re-balance the MFStartup that HasInitialized() called: the loop's final
  // MFShutdown leaves MF fully torn down, breaking subsequent tests.
  HRESULT hrRestore = E_FAIL;
  mscom::EnsureMTA(
      [&]() { hrRestore = mfStartup(kMFVersion, MFSTARTUP_FULL); });
  ASSERT_HRESULT_SUCCEEDED(hrRestore);
}

}  // namespace mozilla
