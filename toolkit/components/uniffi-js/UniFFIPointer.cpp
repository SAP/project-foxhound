/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "nsPrintfCString.h"
#include "js/GCAPI.h"
#include "mozilla/EndianUtils.h"
#include "mozilla/dom/UniFFIPointer.h"
#include "mozilla/dom/UniFFIBinding.h"
#include "mozilla/Logging.h"
#include "UniFFIRust.h"

static mozilla::LazyLogModule sUniFFIPointerLogger("uniffi_logger");

namespace mozilla::dom {
using uniffi::RUST_CALL_SUCCESS;
using uniffi::RustCallStatus;
using uniffi::UniFFIPointerType;

NS_IMPL_CYCLE_COLLECTION_WRAPPERCACHE_0(UniFFIPointer)

NS_IMPL_CYCLE_COLLECTING_ADDREF(UniFFIPointer)
NS_IMPL_CYCLE_COLLECTING_RELEASE(UniFFIPointer)
NS_INTERFACE_MAP_BEGIN_CYCLE_COLLECTION(UniFFIPointer)
  NS_WRAPPERCACHE_INTERFACE_MAP_ENTRY
  NS_INTERFACE_MAP_ENTRY(nsISupports)
NS_INTERFACE_MAP_END

// Static function
already_AddRefed<UniFFIPointer> UniFFIPointer::Create(
    void* aPtr, const UniFFIPointerType* aType) {
  RefPtr<UniFFIPointer> uniFFIPointer = new UniFFIPointer(aPtr, aType);
  return uniFFIPointer.forget();
}

already_AddRefed<UniFFIPointer> UniFFIPointer::Read(
    const ArrayBuffer& aArrayBuff, uint32_t aPosition,
    const UniFFIPointerType* aType, ErrorResult& aError) {
  MOZ_LOG(sUniFFIPointerLogger, LogLevel::Info,
          ("[UniFFI] Reading Pointer from buffer"));

  CheckedUint32 end = CheckedUint32(aPosition) + 8;
  uint8_t data_ptr[8];
  if (!end.isValid() ||
      !aArrayBuff.CopyDataTo(
          data_ptr, [&](size_t aLength) -> Maybe<std::pair<size_t, size_t>> {
            if (end.value() > aLength) {
              return Nothing();
            }
            return Some(std::make_pair(aPosition, 8));
          })) {
    aError.ThrowRangeError("position is out of range");
    return nullptr;
  }

  // in Rust and Write(), a pointer is converted to a void* then written as u64
  // BigEndian we do the reverse here
  void* ptr = (void*)mozilla::BigEndian::readUint64(data_ptr);
  return UniFFIPointer::Create(ptr, aType);
}

void UniFFIPointer::Write(const ArrayBuffer& aArrayBuff, uint32_t aPosition,
                          const UniFFIPointerType* aType,
                          ErrorResult& aError) const {
  if (!this->IsSamePtrType(aType)) {
    aError.ThrowUnknownError(nsPrintfCString(
        "Attempt to write pointer with wrong type: %s (expected: %s)",
        aType->typeName.get(), this->mType->typeName.get()));
    return;
  }
  MOZ_LOG(sUniFFIPointerLogger, LogLevel::Info,
          ("[UniFFI] Writing Pointer to buffer"));

  // Clone the pointer outside of ProcessData, since the JS hazard checker
  // assumes the call could result in a GC pass.
  //
  // This means that if the code below fails, we will leak a reference to the
  // pointer.  This is acceptable because the code should will only fail if
  // UniFFI incorrectly sizes the array buffers which should be caught by our
  // unit tests.  Also, there's no way to protect against this in general since
  // if anything fails after writing a pointer to the array then the reference
  // will leak.
  void* clone = ClonePtr();
  CheckedUint32 end = CheckedUint32(aPosition) + 8;
  if (!end.isValid() || !aArrayBuff.ProcessData([&](const Span<uint8_t>& aData,
                                                    JS::AutoCheckCannotGC&&) {
        if (end.value() > aData.Length()) {
          return false;
        }
        // in Rust and Read(), a u64 is read as BigEndian and then converted to
        // a pointer we do the reverse here
        const auto& data_ptr = aData.Subspan(aPosition, 8);
        mozilla::BigEndian::writeUint64(data_ptr.Elements(), (uint64_t)clone);
        return true;
      })) {
    aError.ThrowRangeError("position is out of range");
    return;
  }
}

UniFFIPointer::UniFFIPointer(void* aPtr, const UniFFIPointerType* aType) {
  mPtr = aPtr;
  mType = aType;
}

JSObject* UniFFIPointer::WrapObject(JSContext* aCx,
                                    JS::Handle<JSObject*> aGivenProto) {
  return dom::UniFFIPointer_Binding::Wrap(aCx, this, aGivenProto);
}

void* UniFFIPointer::ClonePtr() const {
  MOZ_LOG(sUniFFIPointerLogger, LogLevel::Info,
          ("[UniFFI] Cloning raw pointer"));
  RustCallStatus status{};
  auto cloned = this->mType->clone(this->mPtr, &status);
  MOZ_DIAGNOSTIC_ASSERT(status.code == RUST_CALL_SUCCESS,
                        "UniFFI clone call returned a non-success result");
  return cloned;
}

bool UniFFIPointer::IsSamePtrType(const UniFFIPointerType* aType) const {
  return this->mType == aType;
}

UniFFIPointer::~UniFFIPointer() {
  MOZ_LOG(sUniFFIPointerLogger, LogLevel::Info,
          ("[UniFFI] Destroying pointer"));
  RustCallStatus status{};
  this->mType->destructor(this->mPtr, &status);
  MOZ_DIAGNOSTIC_ASSERT(status.code == RUST_CALL_SUCCESS,
                        "UniFFI destructor call returned a non-success result");
}

}  // namespace mozilla::dom
