/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_MediaMetadata_h
#define mozilla_dom_MediaMetadata_h

#include "MediaEventSource.h"
#include "js/TypeDecls.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/MediaSessionBinding.h"
#include "mozilla/gfx/2D.h"
#include "nsCycleCollectionParticipant.h"
#include "nsWrapperCache.h"

class nsIGlobalObject;

namespace mozilla {
class ErrorResult;

namespace dom {

class MediaImageData {
 public:
  MediaImageData() = default;
  explicit MediaImageData(const MediaImage& aImage)
      : mSizes(aImage.mSizes), mSrc(aImage.mSrc), mType(aImage.mType) {}

  MediaImage ToMediaImage() const;

  nsString mSizes;
  nsString mSrc;
  nsString mType;
  // Maybe null, only the first valid artwork is fetched by
  // MediaMetadata::FetchArtwork.
  RefPtr<mozilla::gfx::DataSourceSurface> mDataSurface;
};

class MediaMetadataBase {
 public:
  MediaMetadataBase() = default;
  MediaMetadataBase(const nsString& aTitle, const nsString& aArtist,
                    const nsString& aAlbum)
      : mTitle(aTitle), mArtist(aArtist), mAlbum(aAlbum) {}

  static MediaMetadataBase EmptyData() { return MediaMetadataBase(); }

  nsString mTitle;
  nsString mArtist;
  nsString mAlbum;
  nsCString mUrl;
  CopyableTArray<MediaImageData> mArtwork;
};

using MediaMetadataBasePromise =
    mozilla::MozPromise<MediaMetadataBase, nsresult, true>;

class MediaMetadata final : public nsISupports,
                            public nsWrapperCache,
                            private MediaMetadataBase {
 public:
  // Ref counting and cycle collection
  NS_DECL_CYCLE_COLLECTING_ISUPPORTS_FINAL
  NS_DECL_CYCLE_COLLECTION_WRAPPERCACHE_CLASS(MediaMetadata)

  // WebIDL methods
  nsIGlobalObject* GetParentObject() const;

  JSObject* WrapObject(JSContext* aCx,
                       JS::Handle<JSObject*> aGivenProto) override;

  static already_AddRefed<MediaMetadata> Constructor(
      const GlobalObject& aGlobal, const MediaMetadataInit& aInit,
      ErrorResult& aRv);

  void GetTitle(nsString& aRetVal) const;

  void SetTitle(const nsAString& aTitle);

  void GetArtist(nsString& aRetVal) const;

  void SetArtist(const nsAString& aArtist);

  void GetAlbum(nsString& aRetVal) const;

  void SetAlbum(const nsAString& aAlbum);

  void GetArtwork(JSContext* aCx, nsTArray<JSObject*>& aRetVal,
                  ErrorResult& aRv) const;

  void SetArtwork(JSContext* aCx, const Sequence<JSObject*>& aArtwork,
                  ErrorResult& aRv);

  // This function will always resolve successfully, even when no artwork was
  // loaded.
  // At most, it returns one decoded image of the artwork.
  RefPtr<MediaMetadataBasePromise> LoadMetadataArtwork();

  // Before LoadMetadataArtwork() resolves the mDataSurface of the
  // MediaImageData is going to be null.
  MediaMetadataBase* AsMetadataBaseWithoutArtworkSurface() { return this; }
  MediaEventSource<void>& MetadataChangeEvent() { return mMetadataChangeEvent; }

 private:
  MediaMetadata(nsIGlobalObject* aParent, const nsString& aTitle,
                const nsString& aArtist, const nsString& aAlbum);

  ~MediaMetadata() = default;

  // Perform `convert artwork algorithm`. Set `mArtwork` to a converted
  // `aArtwork` if the conversion works, otherwise throw a type error in `aRv`.
  void SetArtworkInternal(const Sequence<MediaImage>& aArtwork,
                          ErrorResult& aRv);

  static RefPtr<MediaMetadataBasePromise> FetchArtwork(
      const MediaMetadataBase& aMetadata, nsIPrincipal* aPrincipal,
      const size_t aIndex);

  nsCOMPtr<nsIGlobalObject> mParent;
  MediaEventProducer<void> mMetadataChangeEvent;
};

}  // namespace dom
}  // namespace mozilla

#endif  // mozilla_dom_MediaMetadata_h
