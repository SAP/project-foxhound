/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_widget_GSettings_h
#define mozilla_widget_GSettings_h

#include "nsStringFwd.h"
#include "mozilla/RefPtr.h"
#include "mozilla/Maybe.h"
#include "nsTArrayForwardDeclare.h"

using GSettings = struct _GSettings;
using GVariant = struct _GVariant;

namespace mozilla::widget::GSettings {

class Collection {
 public:
  explicit Collection(const nsCString& aSchema);
  ~Collection();

  explicit operator bool() const { return !!mSettings; }

  Collection(const Collection&) = delete;

  bool SetString(const nsCString& aKey, const nsCString& aValue);
  bool GetString(const nsCString& aKey, nsACString& aResult) const;
  bool GetStringList(const nsCString& aKey, nsTArray<nsCString>& aResult) const;

  Maybe<bool> GetBoolean(const nsCString&) const;
  Maybe<int32_t> GetInt(const nsCString&) const;

 private:
  RefPtr<GVariant> GetValue(const nsCString&) const;
  bool HasKey(const nsCString&) const;

  RefPtr<::GSettings> mSettings;
  char** mKeys = nullptr;
};

inline bool GetString(const nsCString& aSchema, const nsCString& aKey,
                      nsACString& aResult) {
  Collection collection(aSchema);
  return collection && collection.GetString(aKey, aResult);
}

inline Maybe<bool> GetBoolean(const nsCString& aSchema, const nsCString& aKey) {
  Collection collection(aSchema);
  if (!collection) {
    return {};
  }
  return collection.GetBoolean(aKey);
}

inline Maybe<int32_t> GetInt(const nsCString& aSchema, const nsCString& aKey) {
  Collection collection(aSchema);
  if (!collection) {
    return {};
  }
  return collection.GetInt(aKey);
}

}  // namespace mozilla::widget::GSettings

#endif
