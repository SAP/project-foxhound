/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef FFmpegRuntimeLinker_h_
#define FFmpegRuntimeLinker_h_

#include "PlatformDecoderModule.h"
#include "PlatformEncoderModule.h"
#include "mozilla/StaticMutex.h"

namespace mozilla {

class FFmpegRuntimeLinker {
 public:
  static bool Init() MOZ_EXCLUDES(sMutex);
  static already_AddRefed<PlatformDecoderModule> CreateDecoder();
  static already_AddRefed<PlatformEncoderModule> CreateEncoder();
  enum LinkStatus {
    LinkStatus_INIT = 0,   // Never been linked.
    LinkStatus_SUCCEEDED,  // Found a usable library.
    // The following error statuses are sorted from most to least preferred
    // (i.e., if more than one happens, the top one is chosen.)
    LinkStatus_INVALID_FFMPEG_CANDIDATE,  // Found ffmpeg with unexpected
                                          // contents.
    LinkStatus_UNUSABLE_LIBAV57,         // Found LibAV 57, which we cannot use.
    LinkStatus_INVALID_LIBAV_CANDIDATE,  // Found libav with unexpected
                                         // contents.
    LinkStatus_OBSOLETE_FFMPEG,
    LinkStatus_OBSOLETE_LIBAV,
    LinkStatus_INVALID_CANDIDATE,  // Found some lib with unexpected contents.
    LinkStatus_NOT_FOUND,  // Haven't found any library with an expected name.
  };
  static LinkStatus LinkStatusCode() {
    StaticMutexAutoLock lock(sMutex);
    return sLinkStatus;
  }
  static const char* LinkStatusString();
  // Library name to which the sLinkStatus applies, or "" if not applicable.
  static const char* LinkStatusLibraryName() {
    StaticMutexAutoLock lock(sMutex);
    return sLinkStatusLibraryName;
  }

 private:
  static void PrefCallbackLogLevel(const char* aPref, void* aData);

  static StaticMutex sMutex;
  static LinkStatus sLinkStatus MOZ_GUARDED_BY(sMutex);
  static const char* sLinkStatusLibraryName MOZ_GUARDED_BY(sMutex);
};

}  // namespace mozilla

#endif  // FFmpegRuntimeLinker_h_
