/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/dom/EncodedAudioChunk.h"

#include <utility>

#include "MediaData.h"
#include "TimeUnits.h"
#include "mozilla/CheckedInt.h"
#include "mozilla/Logging.h"
#include "mozilla/PodOperations.h"
#include "mozilla/dom/BufferSourceBinding.h"
#include "mozilla/dom/EncodedAudioChunkBinding.h"
#include "mozilla/dom/StructuredCloneHolder.h"
#include "mozilla/dom/StructuredCloneTags.h"
#include "mozilla/dom/WebCodecsUtils.h"
#include "nsTHashSet.h"

extern mozilla::LazyLogModule gWebCodecsLog;
using mozilla::media::TimeUnit;

namespace mozilla::dom {

#ifdef LOG_INTERNAL
#  undef LOG_INTERNAL
#endif  // LOG_INTERNAL
#define LOG_INTERNAL(level, msg, ...) \
  MOZ_LOG_FMT(gWebCodecsLog, LogLevel::level, msg, ##__VA_ARGS__)

#ifdef LOGW
#  undef LOGW
#endif  // LOGW
#define LOGW(msg, ...) LOG_INTERNAL(Warning, msg, ##__VA_ARGS__)

#ifdef LOGE
#  undef LOGE
#endif  // LOGE
#define LOGE(msg, ...) LOG_INTERNAL(Error, msg, ##__VA_ARGS__)

// Only needed for refcounted objects.
NS_IMPL_CYCLE_COLLECTION_WRAPPERCACHE(EncodedAudioChunk, mParent)
NS_IMPL_CYCLE_COLLECTING_ADDREF(EncodedAudioChunk)
NS_IMPL_CYCLE_COLLECTING_RELEASE(EncodedAudioChunk)
NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(EncodedAudioChunk)
  NS_WRAPPERCACHE_INTERFACE_MAP_ENTRY
  NS_INTERFACE_MAP_ENTRY(nsISupports)
NS_INTERFACE_MAP_END

EncodedAudioChunkData::EncodedAudioChunkData(
    already_AddRefed<MediaAlignedByteBuffer> aBuffer,
    const EncodedAudioChunkType& aType, int64_t aTimestamp,
    Maybe<uint64_t>&& aDuration)
    : mBuffer(aBuffer),
      mType(aType),
      mTimestamp(aTimestamp),
      mDuration(aDuration) {
  MOZ_ASSERT(mBuffer);
  MOZ_ASSERT(mBuffer->Length() == mBuffer->Size());
  MOZ_ASSERT(mBuffer->Length() <=
             static_cast<size_t>(std::numeric_limits<uint32_t>::max()));
}

UniquePtr<EncodedAudioChunkData> EncodedAudioChunkData::Clone() const {
  if (!mBuffer) {
    LOGE("No buffer in EncodedAudioChunkData {} to clone!", fmt::ptr(this));
    return nullptr;
  }

  // Since EncodedAudioChunkData can be zero-sized, cloning a zero-sized chunk
  // is allowed.
  if (mBuffer->Size() == 0) {
    LOGW("Cloning an empty EncodedAudioChunkData {}", fmt::ptr(this));
  }

  auto buffer =
      MakeRefPtr<MediaAlignedByteBuffer>(mBuffer->Data(), mBuffer->Length());
  if (!buffer || buffer->Size() != mBuffer->Size()) {
    LOGE("OOM to copy EncodedAudioChunkData {}", fmt::ptr(this));
    return nullptr;
  }

  return MakeUnique<EncodedAudioChunkData>(buffer.forget(), mType, mTimestamp,
                                           Maybe<uint64_t>(mDuration));
}

already_AddRefed<MediaRawData> EncodedAudioChunkData::TakeData() {
  if (!mBuffer || !(*mBuffer)) {
    LOGE("EncodedAudioChunkData {} has no data!", fmt::ptr(this));
    return nullptr;
  }

  RefPtr<MediaRawData> sample(new MediaRawData(std::move(*mBuffer)));
  sample->mKeyframe = mType == EncodedAudioChunkType::Key;
  sample->mTime = TimeUnit::FromMicroseconds(mTimestamp);
  sample->mTimecode = TimeUnit::FromMicroseconds(mTimestamp);

  if (mDuration) {
    CheckedInt64 duration(*mDuration);
    if (!duration.isValid()) {
      LOGE("EncodedAudioChunkData {} 's duration exceeds TimeUnit's limit",
           fmt::ptr(this));
      return nullptr;
    }
    sample->mDuration = TimeUnit::FromMicroseconds(duration.value());
  }

  return sample.forget();
}

nsCString EncodedAudioChunkData::ToString() const {
  return nsFmtCString(
      "EncodedAudioChunkData[bytes: {}, type: {}, ts: {}, dur: {}]",
      mBuffer ? mBuffer->Length() : 0, GetEnumString(mType).get(), mTimestamp,
      mDuration ? std::to_string(*mDuration).c_str() : "none");
}

EncodedAudioChunk::EncodedAudioChunk(
    nsIGlobalObject* aParent, already_AddRefed<MediaAlignedByteBuffer> aBuffer,
    const EncodedAudioChunkType& aType, int64_t aTimestamp,
    Maybe<uint64_t>&& aDuration)
    : EncodedAudioChunkData(std::move(aBuffer), aType, aTimestamp,
                            std::move(aDuration)),
      mParent(aParent) {}

EncodedAudioChunk::EncodedAudioChunk(nsIGlobalObject* aParent,
                                     const EncodedAudioChunkData& aData)
    : EncodedAudioChunkData(aData), mParent(aParent) {}

nsIGlobalObject* EncodedAudioChunk::GetParentObject() const {
  AssertIsOnOwningThread();

  return mParent.get();
}

JSObject* EncodedAudioChunk::WrapObject(JSContext* aCx,
                                        JS::Handle<JSObject*> aGivenProto) {
  AssertIsOnOwningThread();

  return EncodedAudioChunk_Binding::Wrap(aCx, this, aGivenProto);
}

// https://w3c.github.io/webcodecs/#encodedaudiochunk-constructors
/* static */
already_AddRefed<EncodedAudioChunk> EncodedAudioChunk::Constructor(
    const GlobalObject& aGlobal, const EncodedAudioChunkInit& aInit,
    ErrorResult& aRv) {
  nsCOMPtr<nsIGlobalObject> global = do_QueryInterface(aGlobal.GetAsSupports());
  if (!global) {
    aRv.Throw(NS_ERROR_FAILURE);
    return nullptr;
  }

  nsTHashSet<const JSObject*> transferSet;
  for (const auto& buffer : aInit.mTransfer) {
    // 8.1.2.1. If init.transfer contains more than one reference to the same
    // ArrayBuffer, then throw a DataCloneError DOMException.
    if (transferSet.Contains(buffer.Obj())) {
      LOGE(
          "EncodedAudioChunk Constructor -- duplicate transferred ArrayBuffer");
      aRv.ThrowDataCloneError(
          "Transfer contains duplicate ArrayBuffer objects");
      return nullptr;
    }
    transferSet.Insert(buffer.Obj());
  }
  for (const auto& buffer : aInit.mTransfer) {
    if (JS::IsDetachedArrayBufferObject(buffer.Obj())) {
      // 8.1.2.2.1. If [[Detached]] internal slot is true, then
      // throw a DataCloneError DOMException.
      LOGE("EncodedAudioChunk Constructor -- detached transferred ArrayBuffer");
      aRv.ThrowDataCloneError("Transfer contains detached ArrayBuffer objects");
      return nullptr;
    }
  }

  const auto& data = aInit.mData;
  // 8.1.2.3.5. If init.transfer contains an ArrayBuffer referenced by
  // init.data the User Agent MAY choose to:
  // 8.1.2.3.5.1. Let resource be a new media resource referencing
  // sample data in init.data.
  void* transferData = nullptr;
  size_t transferOffset = 0;
  size_t transferLength;
  if (data.IsArrayBuffer()) {
    JS::Rooted<JSObject*> transferBuffer(aGlobal.Context(),
                                         data.GetAsArrayBuffer().Obj());
    if (transferSet.Contains(transferBuffer)) {
      transferLength = JS::GetArrayBufferByteLength(transferBuffer);
      transferData =
          JS::StealArrayBufferContents(aGlobal.Context(), transferBuffer);
    }
  } else if (data.IsArrayBufferView()) {
    JS::Rooted<JSObject*> transferView(aGlobal.Context(),
                                       data.GetAsArrayBufferView().Obj());
    bool isShared;
    JS::Rooted<JSObject*> transferBuffer(
        aGlobal.Context(), JS_GetArrayBufferViewBuffer(
                               aGlobal.Context(), transferView, &isShared));
    if (transferSet.Contains(transferBuffer)) {
      transferOffset = JS_GetArrayBufferViewByteOffset(transferView);
      transferLength = JS_GetArrayBufferViewByteLength(transferView);
      transferData =
          JS::StealArrayBufferContents(aGlobal.Context(), transferBuffer);
    }
  }

  RefPtr<MediaAlignedByteBuffer> buffer;
  if (transferData) {
    // Make sure it's in uint32_t's range.
    CheckedUint32 byteLength(transferLength);
    if (!byteLength.isValid()) {
      aRv.Throw(NS_ERROR_INVALID_ARG);
      return nullptr;
    }
    buffer = MakeRefPtr<MediaAlignedByteBuffer>(
        static_cast<uint8_t*>(transferData), transferOffset, transferLength,
        true);
    if (!buffer || buffer->Size() != transferLength) {
      aRv.Throw(NS_ERROR_OUT_OF_MEMORY);
      return nullptr;
    }
  } else {
    bool isInputBufferEmpty = false;
    buffer = ProcessTypedArrays(
        data,
        [&](const Span<uint8_t>& aData,
            JS::AutoCheckCannotGC&&) -> RefPtr<MediaAlignedByteBuffer> {
          // Make sure it's in uint32_t's range.
          CheckedUint32 byteLength(aData.Length());
          if (!byteLength.isValid()) {
            aRv.Throw(NS_ERROR_INVALID_ARG);
            return nullptr;
          }
          isInputBufferEmpty = aData.Length() == 0;
          RefPtr<MediaAlignedByteBuffer> buf =
              MakeRefPtr<MediaAlignedByteBuffer>(aData.Elements(),
                                                 aData.Length());

          // Instead of checking *buf, size comparision is used to allow
          // constructing a zero-sized EncodedAudioChunk.
          if (!buf || buf->Size() != aData.Length()) {
            aRv.Throw(NS_ERROR_OUT_OF_MEMORY);
            return nullptr;
          }
          return buf;
        });
    if (aRv.Failed()) {
      return nullptr;
    }
    if (isInputBufferEmpty) {
      LOGW("Buffer for constructing EncodedAudioChunk is empty!");
    }
  }

  // 8.1.2.4. For each transferable in init.transfer:
  // 8.1.2.4.1. Perform DetachArrayBuffer on transferable
  for (const auto& buffer : aInit.mTransfer) {
    JS::Rooted<JSObject*> obj(aGlobal.Context(), buffer.Obj());
    JS::DetachArrayBuffer(aGlobal.Context(), obj);
  }

  return MakeAndAddRef<EncodedAudioChunk>(global, buffer.forget(), aInit.mType,
                                          aInit.mTimestamp,
                                          OptionalToMaybe(aInit.mDuration));
}

EncodedAudioChunkType EncodedAudioChunk::Type() const {
  AssertIsOnOwningThread();

  return mType;
}

int64_t EncodedAudioChunk::Timestamp() const {
  AssertIsOnOwningThread();

  return mTimestamp;
}

Nullable<uint64_t> EncodedAudioChunk::GetDuration() const {
  AssertIsOnOwningThread();
  return MaybeToNullable(mDuration);
}

uint32_t EncodedAudioChunk::ByteLength() const {
  AssertIsOnOwningThread();
  MOZ_ASSERT(mBuffer);

  return static_cast<uint32_t>(mBuffer->Length());
}

// https://w3c.github.io/webcodecs/#dom-encodedaudiochunk-copyto
void EncodedAudioChunk::CopyTo(const AllowSharedBufferSource& aDestination,
                               ErrorResult& aRv) {
  AssertIsOnOwningThread();

  ProcessTypedArraysFixed(aDestination, [&](const Span<uint8_t>& aData) {
    if (mBuffer->Size() > aData.size_bytes()) {
      aRv.ThrowTypeError(
          "Destination ArrayBuffer smaller than source EncodedAudioChunk");
      return;
    }

    PodCopy(aData.data(), mBuffer->Data(), mBuffer->Size());
  });
}

// https://w3c.github.io/webcodecs/#ref-for-deserialization-steps
/* static */
JSObject* EncodedAudioChunk::ReadStructuredClone(
    JSContext* aCx, nsIGlobalObject* aGlobal, JSStructuredCloneReader* aReader,
    const EncodedAudioChunkData& aData) {
  JS::Rooted<JS::Value> value(aCx, JS::NullValue());
  // To avoid a rooting hazard error from returning a raw JSObject* before
  // running the RefPtr destructor, RefPtr needs to be destructed before
  // returning the raw JSObject*, which is why the RefPtr<EncodedAudioChunk> is
  // created in the scope below. Otherwise, the static analysis infers the
  // RefPtr cannot be safely destructed while the unrooted return JSObject* is
  // on the stack.
  {
    auto frame = MakeRefPtr<EncodedAudioChunk>(aGlobal, aData);
    if (!GetOrCreateDOMReflector(aCx, frame, &value) || !value.isObject()) {
      return nullptr;
    }
  }
  return value.toObjectOrNull();
}

// https://w3c.github.io/webcodecs/#ref-for-serialization-steps
bool EncodedAudioChunk::WriteStructuredClone(
    JSStructuredCloneWriter* aWriter, StructuredCloneHolder* aHolder) const {
  AssertIsOnOwningThread();

  // Indexing the chunk and send the index to the receiver.
  const uint32_t index =
      static_cast<uint32_t>(aHolder->EncodedAudioChunks().Length());
  // The serialization is limited to the same process scope so it's ok to
  // serialize a reference instead of a copy.
  aHolder->EncodedAudioChunks().AppendElement(EncodedAudioChunkData(*this));
  return !NS_WARN_IF(
      !JS_WriteUint32Pair(aWriter, SCTAG_DOM_ENCODEDAUDIOCHUNK, index));
}

#undef LOGW
#undef LOGE
#undef LOG_INTERNAL

}  // namespace mozilla::dom
