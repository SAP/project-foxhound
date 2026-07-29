/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "MP3Decoder.h"

#include "MediaContainerType.h"
#include "PDMFactorySupport.h"

namespace mozilla {

/* static */
bool MP3Decoder::IsEnabled() {
  return !PDMFactorySupport::IsTypeSupported("audio/mpeg"_ns).isEmpty();
}

/* static */
bool MP3Decoder::IsSupportedType(const MediaContainerType& aContainerType) {
  if (aContainerType.Type() == MEDIAMIMETYPE("audio/mp3") ||
      aContainerType.Type() == MEDIAMIMETYPE("audio/mpeg")) {
    return IsEnabled() && (aContainerType.ExtendedType().Codecs().IsEmpty() ||
                           aContainerType.ExtendedType().Codecs() == "mp3");
  }
  return false;
}

/* static */
nsTArray<UniquePtr<TrackInfo>> MP3Decoder::GetTracksInfo(
    const MediaContainerType& aType) {
  nsTArray<UniquePtr<TrackInfo>> tracks;
  if (!IsSupportedType(aType)) {
    return tracks;
  }

  tracks.AppendElement(
      CreateTrackInfoWithMIMETypeAndContainerTypeExtraParameters(
          "audio/mpeg"_ns, aType));

  return tracks;
}

}  // namespace mozilla
