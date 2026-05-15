/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
#ifndef DOM_MEDIA_WEBM_MATROSKADECODER_H_
#define DOM_MEDIA_WEBM_MATROSKADECODER_H_

#include "mozilla/UniquePtr.h"
#include "nsTArray.h"

namespace mozilla {

class DecoderDoctorDiagnostics;
class MediaContainerType;
class MediaResult;
class TrackInfo;

class MatroskaDecoder {
 public:
  // Returns true if aContainerType is a Matroska type that we think we can
  // render with an enabled platform decoder backend.
  static bool IsSupportedType(const MediaContainerType& aContainerType,
                              DecoderDoctorDiagnostics* aDiagnostics);

  static nsTArray<UniquePtr<TrackInfo>> GetTracksInfo(
      const MediaContainerType& aType);

  static bool IsMatroskaType(const MediaContainerType& aType);

 private:
  static nsTArray<UniquePtr<TrackInfo>> GetTracksInfo(
      const MediaContainerType& aType, MediaResult& aError);
};

}  // namespace mozilla

#endif
