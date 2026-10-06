/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef NETWERK_BASE_HTTP_SFV_SFV_H_
#define NETWERK_BASE_HTTP_SFV_SFV_H_

#include "mozilla/net/http_sfv_ffi_generated.h"
#include "nsStringFwd.h"
#include "nsError.h"
#include "nsTArray.h"

namespace mozilla {
namespace net {
namespace SFV {

struct Token {};
struct SFVString {};
struct Integer {};
struct SFVBool {};
struct Decimal {};
struct ByteSeq {};

template <typename T>
nsresult ParseItem(const nsACString& aInput, nsACString& aOutput);

template <>
nsresult ParseItem<Token>(const nsACString& aInput, nsACString& aOutput);

template <>
nsresult ParseItem<SFVString>(const nsACString& aInput, nsACString& aOutput);

template <>
nsresult ParseItem<ByteSeq>(const nsACString& aInput, nsACString& aOutput);

template <typename T>
nsresult ParseItem(const nsACString& aInput, int64_t& aOutput);

template <>
nsresult ParseItem<Integer>(const nsACString& aInput, int64_t& aOutput);

template <typename T>
nsresult ParseItem(const nsACString& aInput, double& aOutput);

template <>
nsresult ParseItem<Decimal>(const nsACString& aInput, double& aOutput);

template <typename T>
nsresult ParseItem(const nsACString& aInput, bool& aOutput);

template <>
nsresult ParseItem<SFVBool>(const nsACString& aInput, bool& aOutput);

class ItemResult {
 public:
  explicit ItemResult(SFVItemHandle* aItem);
  ~ItemResult();

  ItemResult(const ItemResult&) = delete;
  ItemResult& operator=(const ItemResult&) = delete;

  ItemResult(ItemResult&& aOther) noexcept;
  ItemResult& operator=(ItemResult&& aOther) noexcept;

  template <typename T>
  nsresult GetValue(nsACString& aOutput) const;

  template <typename T>
  nsresult GetValue(int64_t& aOutput) const;

  template <typename T>
  nsresult GetValue(double& aOutput) const;

  template <typename T>
  nsresult GetValue(bool& aOutput) const;

  template <typename T>
  nsresult GetParam(const nsACString& aKey, nsACString& aOutput) const;

  template <typename T>
  nsresult GetParam(const nsACString& aKey, int64_t& aOutput) const;

  template <typename T>
  nsresult GetParam(const nsACString& aKey, double& aOutput) const;

  template <typename T>
  nsresult GetParam(const nsACString& aKey, bool& aOutput) const;

  nsresult GetParamKeys(nsTArray<nsCString>& aKeys) const;

  bool IsValid() const { return mItem != nullptr; }

 private:
  SFVItemHandle* mItem;
};

ItemResult ParseItemWithParams(const nsACString& aInput);

class InnerListResult {
 public:
  explicit InnerListResult(SFVInnerListHandle* aInnerList);
  ~InnerListResult();

  InnerListResult(const InnerListResult&) = delete;
  InnerListResult& operator=(const InnerListResult&) = delete;

  InnerListResult(InnerListResult&& aOther) noexcept;
  InnerListResult& operator=(InnerListResult&& aOther) noexcept;

  size_t Length() const;
  ItemResult GetItemAt(size_t aIndex) const;

  bool IsValid() const { return mInnerList != nullptr; }

 private:
  SFVInnerListHandle* mInnerList;
};

class DictResult {
 public:
  explicit DictResult(SFVDictHandle* aDict);
  ~DictResult();

  DictResult(const DictResult&) = delete;
  DictResult& operator=(const DictResult&) = delete;

  DictResult(DictResult&& aOther) noexcept;
  DictResult& operator=(DictResult&& aOther) noexcept;

  template <typename T>
  nsresult GetItem(const nsACString& aKey, nsACString& aOutput) const;

  template <typename T>
  nsresult GetItem(const nsACString& aKey, int64_t& aOutput) const;

  template <typename T>
  nsresult GetItem(const nsACString& aKey, double& aOutput) const;

  template <typename T>
  nsresult GetItem(const nsACString& aKey, bool& aOutput) const;

  InnerListResult GetInnerList(const nsACString& aKey) const;

  nsresult GetKeys(nsTArray<nsCString>& aKeys) const;

  bool IsValid() const { return mDict != nullptr; }

 private:
  SFVDictHandle* mDict;
};

DictResult ParseDict(const nsACString& aInput);

class ListResult {
 public:
  explicit ListResult(SFVListHandle* aList);
  ~ListResult();

  ListResult(const ListResult&) = delete;
  ListResult& operator=(const ListResult&) = delete;

  ListResult(ListResult&& aOther) noexcept;
  ListResult& operator=(ListResult&& aOther) noexcept;

  size_t Length() const;

  ItemResult GetItemAt(size_t aIndex) const;
  InnerListResult GetInnerListAt(size_t aIndex) const;

  bool IsValid() const { return mList != nullptr; }

 private:
  SFVListHandle* mList;
};

ListResult ParseList(const nsACString& aInput);

}  // namespace SFV
}  // namespace net
}  // namespace mozilla

#endif  // NETWERK_BASE_HTTP_SFV_SFV_H_
