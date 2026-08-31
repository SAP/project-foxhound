/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef RESOURCESTREAM_H_
#define RESOURCESTREAM_H_

#include "ByteStream.h"
#include "MediaResource.h"

namespace mozilla {

DDLoggedTypeDeclNameAndBase(ResourceStream, ByteStream);

class ResourceStream : public ByteStream,
                       public DecoderDoctorLifeLogger<ResourceStream> {
 public:
  explicit ResourceStream(mozilla::MediaResource* aResource);

  virtual nsresult ReadAt(int64_t offset, void* aBuffer, size_t aCount,
                          size_t* aBytesRead) override;
  virtual nsresult CachedReadAt(int64_t aOffset, void* aBuffer, size_t aCount,
                                size_t* aBytesRead) override;
  virtual bool Length(int64_t* size) override;

  void Pin() {
    mResource.GetResource()->Pin();
    ++mPinCount;
  }

  void Unpin() {
    mResource.GetResource()->Unpin();
    MOZ_ASSERT(mPinCount);
    --mPinCount;
  }

 protected:
  virtual ~ResourceStream();

 private:
  mozilla::MediaResourceIndex mResource;
  uint32_t mPinCount;
};

}  // namespace mozilla

#endif  // RESOURCESTREAM_H_
