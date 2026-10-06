/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "SFV.h"
#include "nsStringFwd.h"
#include "nsError.h"

namespace mozilla {
namespace net {
namespace SFV {

template <>
nsresult ParseItem<Token>(const nsACString& aInput, nsACString& aOutput) {
  return sfv_parse_item_token(&aInput, &aOutput);
}

template <>
nsresult ParseItem<SFVString>(const nsACString& aInput, nsACString& aOutput) {
  return sfv_parse_item_string(&aInput, &aOutput);
}

template <>
nsresult ParseItem<ByteSeq>(const nsACString& aInput, nsACString& aOutput) {
  return sfv_parse_item_byte_seq(&aInput, &aOutput);
}

template <>
nsresult ParseItem<Integer>(const nsACString& aInput, int64_t& aOutput) {
  return sfv_parse_item_integer(&aInput, &aOutput);
}

template <>
nsresult ParseItem<Decimal>(const nsACString& aInput, double& aOutput) {
  return sfv_parse_item_decimal(&aInput, &aOutput);
}

template <>
nsresult ParseItem<SFVBool>(const nsACString& aInput, bool& aOutput) {
  return sfv_parse_item_bool(&aInput, &aOutput);
}

ItemResult::ItemResult(SFVItemHandle* aItem) : mItem(aItem) {}

ItemResult::~ItemResult() {
  if (mItem) {
    sfv_item_free(mItem);
  }
}

ItemResult::ItemResult(ItemResult&& aOther) noexcept : mItem(aOther.mItem) {
  aOther.mItem = nullptr;
}

ItemResult& ItemResult::operator=(ItemResult&& aOther) noexcept {
  if (this != &aOther) {
    if (mItem) {
      sfv_item_free(mItem);
    }
    mItem = aOther.mItem;
    aOther.mItem = nullptr;
  }
  return *this;
}

template <>
nsresult ItemResult::GetValue<Token>(nsACString& aOutput) const {
  if (!mItem) {
    return NS_ERROR_NOT_AVAILABLE;
  }
  return sfv_item_get_token(mItem, &aOutput);
}

template <>
nsresult ItemResult::GetValue<SFVString>(nsACString& aOutput) const {
  if (!mItem) {
    return NS_ERROR_NOT_AVAILABLE;
  }
  return sfv_item_get_string(mItem, &aOutput);
}

template <>
nsresult ItemResult::GetValue<ByteSeq>(nsACString& aOutput) const {
  if (!mItem) {
    return NS_ERROR_NOT_AVAILABLE;
  }
  return sfv_item_get_byte_seq(mItem, &aOutput);
}

template <>
nsresult ItemResult::GetValue<Integer>(int64_t& aOutput) const {
  if (!mItem) {
    return NS_ERROR_NOT_AVAILABLE;
  }
  return sfv_item_get_integer(mItem, &aOutput);
}

template <>
nsresult ItemResult::GetValue<Decimal>(double& aOutput) const {
  if (!mItem) {
    return NS_ERROR_NOT_AVAILABLE;
  }
  return sfv_item_get_decimal(mItem, &aOutput);
}

template <>
nsresult ItemResult::GetValue<SFVBool>(bool& aOutput) const {
  if (!mItem) {
    return NS_ERROR_NOT_AVAILABLE;
  }
  return sfv_item_get_bool(mItem, &aOutput);
}

template <>
nsresult ItemResult::GetParam<Token>(const nsACString& aKey,
                                     nsACString& aOutput) const {
  if (!mItem) {
    return NS_ERROR_NOT_AVAILABLE;
  }
  return sfv_item_get_param_token(mItem, &aKey, &aOutput);
}

template <>
nsresult ItemResult::GetParam<SFVString>(const nsACString& aKey,
                                         nsACString& aOutput) const {
  if (!mItem) {
    return NS_ERROR_NOT_AVAILABLE;
  }
  return sfv_item_get_param_string(mItem, &aKey, &aOutput);
}

template <>
nsresult ItemResult::GetParam<ByteSeq>(const nsACString& aKey,
                                       nsACString& aOutput) const {
  if (!mItem) {
    return NS_ERROR_NOT_AVAILABLE;
  }
  return sfv_item_get_param_byte_seq(mItem, &aKey, &aOutput);
}

template <>
nsresult ItemResult::GetParam<Integer>(const nsACString& aKey,
                                       int64_t& aOutput) const {
  if (!mItem) {
    return NS_ERROR_NOT_AVAILABLE;
  }
  return sfv_item_get_param_integer(mItem, &aKey, &aOutput);
}

template <>
nsresult ItemResult::GetParam<Decimal>(const nsACString& aKey,
                                       double& aOutput) const {
  if (!mItem) {
    return NS_ERROR_NOT_AVAILABLE;
  }
  return sfv_item_get_param_decimal(mItem, &aKey, &aOutput);
}

template <>
nsresult ItemResult::GetParam<SFVBool>(const nsACString& aKey,
                                       bool& aOutput) const {
  if (!mItem) {
    return NS_ERROR_NOT_AVAILABLE;
  }
  return sfv_item_get_param_bool(mItem, &aKey, &aOutput);
}

nsresult ItemResult::GetParamKeys(nsTArray<nsCString>& aKeys) const {
  if (!mItem) {
    return NS_ERROR_NOT_AVAILABLE;
  }
  return sfv_item_get_param_keys(mItem, &aKeys);
}

ItemResult ParseItemWithParams(const nsACString& aInput) {
  SFVItemHandle* item = nullptr;
  nsresult rv = sfv_parse_item_with_params(&aInput, &item);
  if (NS_FAILED(rv)) {
    return ItemResult(nullptr);
  }
  return ItemResult(item);
}

InnerListResult::InnerListResult(SFVInnerListHandle* aInnerList)
    : mInnerList(aInnerList) {}

InnerListResult::~InnerListResult() {
  if (mInnerList) {
    sfv_inner_list_free(mInnerList);
  }
}

InnerListResult::InnerListResult(InnerListResult&& aOther) noexcept
    : mInnerList(aOther.mInnerList) {
  aOther.mInnerList = nullptr;
}

InnerListResult& InnerListResult::operator=(InnerListResult&& aOther) noexcept {
  if (this != &aOther) {
    if (mInnerList) {
      sfv_inner_list_free(mInnerList);
    }
    mInnerList = aOther.mInnerList;
    aOther.mInnerList = nullptr;
  }
  return *this;
}

size_t InnerListResult::Length() const {
  if (!mInnerList) {
    return 0;
  }
  size_t length = 0;
  sfv_inner_list_length(mInnerList, &length);
  return length;
}

ItemResult InnerListResult::GetItemAt(size_t aIndex) const {
  if (!mInnerList) {
    return ItemResult(nullptr);
  }
  SFVItemHandle* item = nullptr;
  nsresult rv = sfv_inner_list_get_item_at(mInnerList, aIndex, &item);
  if (NS_FAILED(rv)) {
    return ItemResult(nullptr);
  }
  return ItemResult(item);
}

DictResult::DictResult(SFVDictHandle* aDict) : mDict(aDict) {}

DictResult::~DictResult() {
  if (mDict) {
    sfv_dict_free(mDict);
  }
}

DictResult::DictResult(DictResult&& aOther) noexcept : mDict(aOther.mDict) {
  aOther.mDict = nullptr;
}

DictResult& DictResult::operator=(DictResult&& aOther) noexcept {
  if (this != &aOther) {
    if (mDict) {
      sfv_dict_free(mDict);
    }
    mDict = aOther.mDict;
    aOther.mDict = nullptr;
  }
  return *this;
}

template <>
nsresult DictResult::GetItem<Token>(const nsACString& aKey,
                                    nsACString& aOutput) const {
  if (!mDict) {
    return NS_ERROR_NOT_AVAILABLE;
  }
  return sfv_dict_get_token(mDict, &aKey, &aOutput);
}

template <>
nsresult DictResult::GetItem<SFVString>(const nsACString& aKey,
                                        nsACString& aOutput) const {
  if (!mDict) {
    return NS_ERROR_NOT_AVAILABLE;
  }
  return sfv_dict_get_string(mDict, &aKey, &aOutput);
}

template <>
nsresult DictResult::GetItem<ByteSeq>(const nsACString& aKey,
                                      nsACString& aOutput) const {
  if (!mDict) {
    return NS_ERROR_NOT_AVAILABLE;
  }
  return sfv_dict_get_byte_seq(mDict, &aKey, &aOutput);
}

template <>
nsresult DictResult::GetItem<Integer>(const nsACString& aKey,
                                      int64_t& aOutput) const {
  if (!mDict) {
    return NS_ERROR_NOT_AVAILABLE;
  }
  return sfv_dict_get_integer(mDict, &aKey, &aOutput);
}

template <>
nsresult DictResult::GetItem<Decimal>(const nsACString& aKey,
                                      double& aOutput) const {
  if (!mDict) {
    return NS_ERROR_NOT_AVAILABLE;
  }
  return sfv_dict_get_decimal(mDict, &aKey, &aOutput);
}

template <>
nsresult DictResult::GetItem<SFVBool>(const nsACString& aKey,
                                      bool& aOutput) const {
  if (!mDict) {
    return NS_ERROR_NOT_AVAILABLE;
  }
  return sfv_dict_get_bool(mDict, &aKey, &aOutput);
}

InnerListResult DictResult::GetInnerList(const nsACString& aKey) const {
  if (!mDict) {
    return InnerListResult(nullptr);
  }
  SFVInnerListHandle* inner_list = nullptr;
  nsresult rv = sfv_dict_get_inner_list(mDict, &aKey, &inner_list);
  if (NS_FAILED(rv)) {
    return InnerListResult(nullptr);
  }
  return InnerListResult(inner_list);
}

nsresult DictResult::GetKeys(nsTArray<nsCString>& aKeys) const {
  if (!mDict) {
    return NS_ERROR_NOT_AVAILABLE;
  }
  return sfv_dict_get_keys(mDict, &aKeys);
}

DictResult ParseDict(const nsACString& aInput) {
  SFVDictHandle* dict = nullptr;
  nsresult rv = sfv_parse_dict(&aInput, &dict);
  if (NS_FAILED(rv)) {
    return DictResult(nullptr);
  }
  return DictResult(dict);
}

ListResult::ListResult(SFVListHandle* aList) : mList(aList) {}

ListResult::~ListResult() {
  if (mList) {
    sfv_list_free(mList);
  }
}

ListResult::ListResult(ListResult&& aOther) noexcept : mList(aOther.mList) {
  aOther.mList = nullptr;
}

ListResult& ListResult::operator=(ListResult&& aOther) noexcept {
  if (this != &aOther) {
    if (mList) {
      sfv_list_free(mList);
    }
    mList = aOther.mList;
    aOther.mList = nullptr;
  }
  return *this;
}

size_t ListResult::Length() const {
  if (!mList) {
    return 0;
  }
  size_t length = 0;
  sfv_list_length(mList, &length);
  return length;
}

ItemResult ListResult::GetItemAt(size_t aIndex) const {
  if (!mList) {
    return ItemResult(nullptr);
  }
  SFVItemHandle* item = nullptr;
  nsresult rv = sfv_list_get_item_at(mList, aIndex, &item);
  if (NS_FAILED(rv)) {
    return ItemResult(nullptr);
  }
  return ItemResult(item);
}

InnerListResult ListResult::GetInnerListAt(size_t aIndex) const {
  if (!mList) {
    return InnerListResult(nullptr);
  }
  SFVInnerListHandle* inner_list = nullptr;
  nsresult rv = sfv_list_get_inner_list_at(mList, aIndex, &inner_list);
  if (NS_FAILED(rv)) {
    return InnerListResult(nullptr);
  }
  return InnerListResult(inner_list);
}

ListResult ParseList(const nsACString& aInput) {
  SFVListHandle* list = nullptr;
  nsresult rv = sfv_parse_list(&aInput, &list);
  if (NS_FAILED(rv)) {
    return ListResult(nullptr);
  }
  return ListResult(list);
}

}  // namespace SFV
}  // namespace net
}  // namespace mozilla
