/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
#ifndef DOM_MEDIA_WEBM_MATROSKADEMUXER_H_
#define DOM_MEDIA_WEBM_MATROSKADEMUXER_H_

#include "WebMDemuxer.h"

namespace mozilla {

// WebM is a subset of Matroska, so we can build a Matroska demuxer on top of
// the WebM demuxer, and support more features which are not included in WebM.
// Currently the only differences are the codecs supported, besides that, all
// other parts are the same. The track demuxer is also the same as WebM's.
class MatroskaDemuxer : public WebMDemuxer {
 public:
  explicit MatroskaDemuxer(MediaResource* aResource);

 private:
  nsresult SetVideoCodecInfo(nestegg* aContext, int aTrackId) override;
  nsresult SetAudioCodecInfo(nestegg* aContext, int aTrackId,
                             const nestegg_audio_params& aParams) override;
  bool CheckKeyFrameByExamineByteStream(const MediaRawData* aSample) override;

  nsresult SetCodecPrivateToVideoExtraData(nestegg* aContext, int aTrackId);
};

}  // namespace mozilla

#endif
