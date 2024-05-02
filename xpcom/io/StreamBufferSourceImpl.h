/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_StreamBufferSourceImpl_h
#define mozilla_StreamBufferSourceImpl_h

#include "mozilla/StreamBufferSource.h"

#include "nsTArray.h"

namespace mozilla {

class nsTArraySource final : public StreamBufferSource {
 public:
  explicit nsTArraySource(nsTArray<uint8_t>&& aArray, const StringTaint& aTaint)
      : mArray(std::move(aArray)), mTaint(aTaint) {}

  Span<const char> Data() override {
    return Span{reinterpret_cast<const char*>(mArray.Elements()),
                mArray.Length()};
  }

  bool Owning() override { return true; }

  const StringTaint& Taint() override { return mTaint; }

  void setTaint(const StringTaint& aTaint) override { mTaint = aTaint; }

  size_t SizeOfExcludingThisEvenIfShared(MallocSizeOf aMallocSizeOf) override {
    return mArray.ShallowSizeOfExcludingThis(aMallocSizeOf);
  }

 private:
  const nsTArray<uint8_t> mArray;
  SafeStringTaint mTaint;
};

class nsCStringSource final : public StreamBufferSource {
 public:
  explicit nsCStringSource(nsACString&& aString)
      : mString(std::move(aString)) {}

  Span<const char> Data() override { return mString; }

  nsresult GetData(nsACString& aString) override {
    if (!aString.Assign(mString, fallible)) {
      return NS_ERROR_OUT_OF_MEMORY;
    }
    return NS_OK;
  }

  bool Owning() override { return true; }

  const StringTaint& Taint() override { return mString.Taint(); }

  void setTaint(const StringTaint& aTaint) override { mString.AssignTaint(aTaint); }

  size_t SizeOfExcludingThisIfUnshared(MallocSizeOf aMallocSizeOf) override {
    return mString.SizeOfExcludingThisIfUnshared(aMallocSizeOf);
  }

  size_t SizeOfExcludingThisEvenIfShared(MallocSizeOf aMallocSizeOf) override {
    return mString.SizeOfExcludingThisEvenIfShared(aMallocSizeOf);
  }

 private:
  nsCString mString;
};

class nsBorrowedSource final : public StreamBufferSource {
 public:
  explicit nsBorrowedSource(Span<const char> aBuffer, const StringTaint& aTaint)
    : mBuffer(aBuffer), mTaint(aTaint) {}

  Span<const char> Data() override { return mBuffer; }

  bool Owning() override { return false; }

  const StringTaint& Taint() override { return mTaint; }

  void setTaint(const StringTaint& aTaint) override { mTaint = aTaint; }

  size_t SizeOfExcludingThisEvenIfShared(MallocSizeOf aMallocSizeOf) override {
    return 0;
  }

 private:
  const Span<const char> mBuffer;
  SafeStringTaint mTaint;
};

}  // namespace mozilla

#endif  // mozilla_StreamBufferSourceImpl_h
