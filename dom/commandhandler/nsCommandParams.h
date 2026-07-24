/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef nsCommandParams_h
#define nsCommandParams_h

#include "mozilla/ErrorResult.h"
#include "nsCOMPtr.h"
#include "nsICommandParams.h"
#include "nsString.h"
#include "nsTHashMap.h"

class nsCommandParams : public nsICommandParams {
  using ErrorResult = mozilla::ErrorResult;
  using IgnoredErrorResult = mozilla::IgnoredErrorResult;

 public:
  nsCommandParams();

  NS_DECL_ISUPPORTS
  NS_DECL_NSICOMMANDPARAMS

  bool GetBool(const char* aName, ErrorResult& aRv) const;
  inline bool GetBool(const char* aName) const {
    IgnoredErrorResult error;
    return GetBool(aName, error);
  }
  int32_t GetInt(const char* aName, ErrorResult& aRv) const;
  inline int32_t GetInt(const char* aName) const {
    IgnoredErrorResult error;
    return GetInt(aName, error);
  }
  double GetDouble(const char* aName, ErrorResult& aRv) const;
  inline double GetDouble(const char* aName) const {
    IgnoredErrorResult error;
    return GetDouble(aName, error);
  }
  nsresult GetString(const char* aName, nsAString& aValue) const;
  nsresult GetCString(const char* aName, nsACString& aValue) const;
  already_AddRefed<nsISupports> GetISupports(const char* aName,
                                             ErrorResult& aRv) const;
  inline already_AddRefed<nsISupports> GetISupports(const char* aName) const {
    IgnoredErrorResult error;
    return GetISupports(aName, error);
  }

  nsresult SetBool(const char* aName, bool aValue);
  nsresult SetInt(const char* aName, int32_t aValue);
  nsresult SetDouble(const char* aName, double aValue);
  nsresult SetString(const char* aName, const nsAString& aValue);
  nsresult SetCString(const char* aName, const nsACString& aValue);
  nsresult SetISupports(const char* aName, nsISupports* aValue);

 protected:
  virtual ~nsCommandParams();

  template <typename T>
  T GenericGet(const char* aName, ErrorResult& aRv) const {
    MOZ_ASSERT(!aRv.Failed());
    auto entry = mValuesHash.Lookup(nsDependentCString(aName));
    if (entry && entry->is<T>()) {
      return entry->as<T>();
    }
    T result{};
    aRv.Throw(NS_ERROR_FAILURE);
    return result;
  }

  using EntryVariant = mozilla::Variant<bool, int32_t, double, nsString,
                                        nsCString, nsCOMPtr<nsISupports>>;

  nsTHashMap<nsCString, EntryVariant> mValuesHash;
};

nsCommandParams* nsICommandParams::AsCommandParams() {
  return static_cast<nsCommandParams*>(this);
}

const nsCommandParams* nsICommandParams::AsCommandParams() const {
  return static_cast<const nsCommandParams*>(this);
}

#endif  // nsCommandParams_h
