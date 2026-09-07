/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_SessionStoreMessageUtils_h
#define mozilla_dom_SessionStoreMessageUtils_h

#include "ipc/IPCMessageUtils.h"
#include "mozilla/ipc/URIUtils.h"
#include "SessionStoreData.h"
#include "SessionStoreUtils.h"
#include "SessionStoreRestoreData.h"

namespace IPC {

template <>
struct ParamTraits<mozilla::dom::CollectedNonMultipleSelectValue> {
  typedef mozilla::dom::CollectedNonMultipleSelectValue paramType;

  static void Write(MessageWriter* aWriter, const paramType& aParam) {
    WriteParam(aWriter, aParam.mSelectedIndex);
    WriteParam(aWriter, aParam.mValue);
  }

  static bool Read(MessageReader* aReader, paramType* aResult) {
    return ReadParam(aReader, &aResult->mSelectedIndex) &&
           ReadParam(aReader, &aResult->mValue);
  }
};

template <>
struct ParamTraits<CollectedInputDataValue> {
  typedef CollectedInputDataValue paramType;

  static void Write(MessageWriter* aWriter, const paramType& aParam) {
    WriteParam(aWriter, aParam.id);
    WriteParam(aWriter, aParam.type);
    WriteParam(aWriter, aParam.value);
  }

  static bool Read(MessageReader* aReader, paramType* aResult) {
    return ReadParam(aReader, &aResult->id) &&
           ReadParam(aReader, &aResult->type) &&
           ReadParam(aReader, &aResult->value);
  }
};

template <>
struct ParamTraits<InputFormData> {
  typedef InputFormData paramType;

  static void Write(MessageWriter* aWriter, const paramType& aParam) {
    WriteParam(aWriter, aParam.descendants);
    WriteParam(aWriter, aParam.innerHTML);
    WriteParam(aWriter, aParam.url);
    WriteParam(aWriter, aParam.numId);
    WriteParam(aWriter, aParam.numXPath);
  }

  static bool Read(MessageReader* aReader, paramType* aResult) {
    return ReadParam(aReader, &aResult->descendants) &&
           ReadParam(aReader, &aResult->innerHTML) &&
           ReadParam(aReader, &aResult->url) &&
           ReadParam(aReader, &aResult->numId) &&
           ReadParam(aReader, &aResult->numXPath);
  }
};

template <>
struct ParamTraits<mozilla::dom::SessionStoreRestoreData*> {
  // Note that we intentionally don't de/serialize mChildren here. The receiver
  // won't be doing anything with the children lists, and it avoids sending form
  // data for subframes to the content processes of their embedders.

  static void Write(IPC::MessageWriter* aWriter,
                    mozilla::dom::SessionStoreRestoreData* aParam) {
    bool isNull = !aParam;
    WriteParam(aWriter, isNull);
    if (isNull) {
      return;
    }
    WriteParam(aWriter, aParam->mURI);
    WriteParam(aWriter, aParam->mInnerHTML);
    WriteParam(aWriter, aParam->mScroll);
    WriteParam(aWriter, aParam->mEntries);
  }

  static bool Read(IPC::MessageReader* aReader,
                   RefPtr<mozilla::dom::SessionStoreRestoreData>* aResult) {
    *aResult = nullptr;
    bool isNull;
    if (!ReadParam(aReader, &isNull)) {
      return false;
    }
    if (isNull) {
      return true;
    }
    auto data = mozilla::MakeRefPtr<mozilla::dom::SessionStoreRestoreData>();
    if (!ReadParam(aReader, &data->mURI) ||
        !ReadParam(aReader, &data->mInnerHTML) ||
        !ReadParam(aReader, &data->mScroll) ||
        !ReadParam(aReader, &data->mEntries)) {
      return false;
    }
    *aResult = std::move(data);
    return true;
  }
};

template <>
struct ParamTraits<mozilla::dom::SessionStoreRestoreData::Entry> {
  static void Write(IPC::MessageWriter* aWriter,
                    mozilla::dom::SessionStoreRestoreData::Entry aParam) {
    WriteParam(aWriter, aParam.mData);
    WriteParam(aWriter, aParam.mIsXPath);
  }

  static bool Read(IPC::MessageReader* aReader,
                   mozilla::dom::SessionStoreRestoreData::Entry* aResult) {
    return ReadParam(aReader, &aResult->mData) &&
           ReadParam(aReader, &aResult->mIsXPath);
  }
};

}  // namespace IPC

#endif  // mozilla_dom_SessionStoreMessageUtils_h
