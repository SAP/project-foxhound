/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_MEDIA_IPC_MFMEDIAENGINEUTILS_H_
#define DOM_MEDIA_IPC_MFMEDIAENGINEUTILS_H_

#include "MFMediaEngineExtra.h"
#include "ipc/EnumSerializer.h"
#include "mozilla/Logging.h"
#include "mozilla/Maybe.h"
#include "mozilla/ProfilerMarkerTypes.h"
#include "mozilla/gfx/Types.h"
#include "nsPrintfCString.h"

// MFVideoTransFunc_HLG was added in the Windows SDK 10.0.15063. Define it
// here for older SDK versions.
#ifndef MFVideoTransFunc_HLG
#  define MFVideoTransFunc_HLG static_cast<MFVideoTransferFunction>(16)
#endif

namespace mozilla {

inline LazyLogModule gMFMediaEngineLog{"MFMediaEngine"};

// https://docs.microsoft.com/en-us/windows/win32/api/mfmediaengine/ne-mfmediaengine-mf_media_engine_event
using MFMediaEngineEvent = MF_MEDIA_ENGINE_EVENT;

// https://docs.microsoft.com/en-us/windows/win32/api/mfmediaengine/ne-mfmediaengine-mf_media_engine_err
using MFMediaEngineError = MF_MEDIA_ENGINE_ERR;

#define LOG_AND_WARNING(msg, ...)                                          \
  do {                                                                     \
    nsPrintfCString _logStr(msg, ##__VA_ARGS__);                           \
    NS_WARNING(_logStr.get());                                             \
    MOZ_LOG_FMT(gMFMediaEngineLog, LogLevel::Debug, "{}:{}, {}", __FILE__, \
                __LINE__, _logStr.get());                                  \
  } while (false)

#ifndef LOG_IF_FAILED
#  define LOG_IF_FAILED(x)                              \
    do {                                                \
      HRESULT rv = x;                                   \
      if (MOZ_UNLIKELY(FAILED(rv))) {                   \
        LOG_AND_WARNING("(" #x ") failed, rv=%lx", rv); \
      }                                                 \
    } while (false)
#endif

#ifndef RETURN_IF_FAILED
#  define RETURN_IF_FAILED(x)                           \
    do {                                                \
      HRESULT rv = x;                                   \
      if (MOZ_UNLIKELY(FAILED(rv))) {                   \
        LOG_AND_WARNING("(" #x ") failed, rv=%lx", rv); \
        return rv;                                      \
      }                                                 \
    } while (false)
#endif

#ifndef RETURN_VOID_IF_FAILED
#  define RETURN_VOID_IF_FAILED(x)                      \
    do {                                                \
      HRESULT rv = x;                                   \
      if (MOZ_UNLIKELY(FAILED(rv))) {                   \
        LOG_AND_WARNING("(" #x ") failed, rv=%lx", rv); \
        return;                                         \
      }                                                 \
    } while (false)
#endif

#ifndef RETURN_PARAM_IF_FAILED
#  define RETURN_PARAM_IF_FAILED(x, defaultOut)         \
    do {                                                \
      HRESULT rv = x;                                   \
      if (MOZ_UNLIKELY(FAILED(rv))) {                   \
        LOG_AND_WARNING("(" #x ") failed, rv=%lx", rv); \
        return defaultOut;                              \
      }                                                 \
    } while (false)
#endif

#ifndef SHUTDOWN_IF_POSSIBLE
#  define SHUTDOWN_IF_POSSIBLE(class)                                        \
    do {                                                                     \
      IMFShutdown* pShutdown = nullptr;                                      \
      HRESULT rv = class->QueryInterface(IID_PPV_ARGS(&pShutdown));          \
      if (SUCCEEDED(rv)) {                                                   \
        rv = pShutdown->Shutdown();                                          \
        if (FAILED(rv)) {                                                    \
          LOG_AND_WARNING(#class " failed to shutdown, rv=%lx", rv);         \
        } else {                                                             \
          MOZ_LOG_FMT(gMFMediaEngineLog, LogLevel::Verbose,                  \
                      #class " shutdowned successfully");                    \
        }                                                                    \
        pShutdown->Release();                                                \
      } else {                                                               \
        LOG_AND_WARNING(#class " doesn't support IMFShutdown?, rv=%lx", rv); \
      }                                                                      \
    } while (false)
#endif

#define ENGINE_MARKER(markerName) \
  PROFILER_MARKER(markerName, MEDIA_PLAYBACK, {}, MediaEngineMarker, Id())

#define ENGINE_MARKER_TEXT(markerName, text)                                   \
  PROFILER_MARKER(markerName, MEDIA_PLAYBACK, {}, MediaEngineTextMarker, Id(), \
                  text)

#ifdef MOZ_WMF_CDM
// This eror can happen during OS sleep/resume, or moving video to different
// graphics adapters.
inline constexpr HRESULT DRM_E_TEE_INVALID_HWDRM_STATE =
    static_cast<HRESULT>(0x8004CD12);

// AMD-specific hardware DRM state error (active display security failure).
inline constexpr HRESULT DRM_OEM_E_ASD_ACTIVE_DISPLAY_FAIL =
    static_cast<HRESULT>(0x8004CD00);

// PlayReady CDM failed to create a decryptor for the stream. This typically
// occurs when the system lacks hardware DRM support, such as a Trusted
// Execution Environment (TEE) or secure video path. Most common when the
// license requires a hardware decryptor, but the platform lacks secure decode
// or necessary hardware capability (e.g., most VMs).
inline constexpr HRESULT MSPR_E_NO_DECRYPTOR_AVAILABLE =
    static_cast<HRESULT>(0x8004B895);

// Hardware DRM is not supported on this system (e.g. no TEE, no secure video
// path). Semantically equivalent to MSPR_E_NO_DECRYPTOR_AVAILABLE — triggers
// SL3000→SL2000 fallback. mferror.h defines this as a macro on systems where
// it ships with the SDK; guard against redefinition.
#  ifndef MF_E_HARDWARE_DRM_UNSUPPORTED
inline constexpr HRESULT MF_E_HARDWARE_DRM_UNSUPPORTED =
    static_cast<HRESULT>(0xC00D3706);
#  endif
#endif

const char* MediaEventTypeToStr(MediaEventType aType);
const char* MediaEngineEventToStr(MF_MEDIA_ENGINE_EVENT aEvent);
const char* MFMediaEngineErrorToStr(MFMediaEngineError aError);
const char* GUIDToStr(GUID aGUID);
const char* MFVideoRotationFormatToStr(MFVideoRotationFormat aFormat);
const char* MFVideoTransferFunctionToStr(MFVideoTransferFunction aFunc);
const char* MFVideoPrimariesToStr(MFVideoPrimaries aPrimaries);
MFVideoTransferFunction ToMFVideoTransFunc(
    const Maybe<gfx::TransferFunction>& aTransferFunction);
void ByteArrayFromGUID(REFGUID aGuidIn, nsTArray<uint8_t>& aByteArrayOut);
void GUIDFromByteArray(const nsTArray<uint8_t>& aByteArrayIn, GUID& aGuidOut);
BSTR CreateBSTRFromConstChar(const char* aNarrowStr);

// See cdm::SubsampleEntry
struct MediaFoundationSubsampleEntry {
  uint32_t mClearBytes;
  uint32_t mCipherBytes;
};

template <typename T>
class ScopedCoMem {
 public:
  ScopedCoMem() : mPtr(nullptr) {}

  ~ScopedCoMem() { Reset(nullptr); }

  ScopedCoMem(const ScopedCoMem&) = delete;
  ScopedCoMem& operator=(const ScopedCoMem&) = delete;

  T** operator&() {               // NOLINT
    MOZ_ASSERT(mPtr == nullptr);  // To catch memory leaks.
    return &mPtr;
  }

  operator T*() { return mPtr; }

  T* operator->() {
    MOZ_ASSERT(mPtr != nullptr);
    return mPtr;
  }

  const T* operator->() const {
    MOZ_ASSERT(mPtr != nullptr);
    return mPtr;
  }

  explicit operator bool() const { return mPtr; }

  friend bool operator==(const ScopedCoMem& lhs, std::nullptr_t) {
    return lhs.Get() == nullptr;
  }

  friend bool operator==(std::nullptr_t, const ScopedCoMem& rhs) {
    return rhs.Get() == nullptr;
  }

  friend bool operator!=(const ScopedCoMem& lhs, std::nullptr_t) {
    return lhs.Get() != nullptr;
  }

  friend bool operator!=(std::nullptr_t, const ScopedCoMem& rhs) {
    return rhs.Get() != nullptr;
  }

  void Reset(T* ptr) {
    if (mPtr) CoTaskMemFree(mPtr);
    mPtr = ptr;
  }

  T* Get() const { return mPtr; }

 private:
  T* mPtr;
};

}  // namespace mozilla

namespace IPC {

template <>
struct ParamTraits<mozilla::MFMediaEngineError>
    : public ContiguousEnumSerializerInclusive<
          mozilla::MFMediaEngineError,
          mozilla::MFMediaEngineError::MF_MEDIA_ENGINE_ERR_ABORTED,
          mozilla::MFMediaEngineError::MF_MEDIA_ENGINE_ERR_ENCRYPTED> {};

struct MFMediaEngineEventValidator {
  using IntegralType = std::underlying_type_t<mozilla::MFMediaEngineEvent>;

  static bool IsLegalValue(const IntegralType e) {
    // This enum is non-contiguous and the valid values could be changed by
    // Microsoft.
    return true;
  }
};

template <>
struct ParamTraits<mozilla::MFMediaEngineEvent>
    : public EnumSerializer<mozilla::MFMediaEngineEvent,
                            MFMediaEngineEventValidator> {};

}  // namespace IPC

#endif  // DOM_MEDIA_IPC_MFMEDIAENGINECHILD_H_
