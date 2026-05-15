/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "nsCommandParams.h"

#include <new>

#include "nsCRT.h"
#include "nscore.h"

using namespace mozilla;

NS_IMPL_ISUPPORTS(nsCommandParams, nsICommandParams)

nsCommandParams::nsCommandParams() = default;

nsCommandParams::~nsCommandParams() = default;

NS_IMETHODIMP
nsCommandParams::GetValueType(const char* aName, int16_t* aRetVal) {
  NS_ENSURE_ARG_POINTER(aRetVal);

  auto foundEntry = mValuesHash.Lookup(nsDependentCString(aName));
  if (!foundEntry) {
    *aRetVal = eNoType;
    return NS_ERROR_FAILURE;
  }

  if (foundEntry->is<bool>()) {
    *aRetVal = eBooleanType;
  } else if (foundEntry->is<int32_t>()) {
    *aRetVal = eLongType;
  } else if (foundEntry->is<double>()) {
    *aRetVal = eDoubleType;
  } else if (foundEntry->is<nsString>()) {
    *aRetVal = eWStringType;
  } else if (foundEntry->is<nsCString>()) {
    *aRetVal = eStringType;
  } else if (foundEntry->is<nsCOMPtr<nsISupports>>()) {
    *aRetVal = eISupportsType;
  } else {
    MOZ_ASSERT_UNREACHABLE("unknown type");
  }

  return NS_OK;
}

NS_IMETHODIMP
nsCommandParams::GetBooleanValue(const char* aName, bool* aRetVal) {
  NS_ENSURE_ARG_POINTER(aRetVal);

  ErrorResult error;
  *aRetVal = GetBool(aName, error);
  return error.StealNSResult();
}

bool nsCommandParams::GetBool(const char* aName, ErrorResult& aRv) const {
  return GenericGet<bool>(aName, aRv);
}

NS_IMETHODIMP
nsCommandParams::GetLongValue(const char* aName, int32_t* aRetVal) {
  NS_ENSURE_ARG_POINTER(aRetVal);

  ErrorResult error;
  *aRetVal = GetInt(aName, error);
  return error.StealNSResult();
}

int32_t nsCommandParams::GetInt(const char* aName, ErrorResult& aRv) const {
  return GenericGet<int32_t>(aName, aRv);
}

NS_IMETHODIMP
nsCommandParams::GetDoubleValue(const char* aName, double* aRetVal) {
  NS_ENSURE_ARG_POINTER(aRetVal);

  ErrorResult error;
  *aRetVal = GetDouble(aName, error);
  return error.StealNSResult();
}

double nsCommandParams::GetDouble(const char* aName, ErrorResult& aRv) const {
  return GenericGet<double>(aName, aRv);
}

NS_IMETHODIMP
nsCommandParams::GetStringValue(const char* aName, nsAString& aRetVal) {
  return GetString(aName, aRetVal);
}

nsresult nsCommandParams::GetString(const char* aName,
                                    nsAString& aRetVal) const {
  ErrorResult error;
  aRetVal = GenericGet<nsString>(aName, error);
  return error.StealNSResult();
}

NS_IMETHODIMP
nsCommandParams::GetCStringValue(const char* aName, nsACString& aRetVal) {
  return GetCString(aName, aRetVal);
}

nsresult nsCommandParams::GetCString(const char* aName,
                                     nsACString& aRetVal) const {
  ErrorResult error;
  aRetVal = GenericGet<nsCString>(aName, error);
  return error.StealNSResult();
}

NS_IMETHODIMP
nsCommandParams::GetISupportsValue(const char* aName, nsISupports** aRetVal) {
  NS_ENSURE_ARG_POINTER(aRetVal);

  ErrorResult error;
  nsCOMPtr<nsISupports> result = GetISupports(aName, error);
  if (result) {
    result.forget(aRetVal);
  } else {
    *aRetVal = nullptr;
  }
  return error.StealNSResult();
}

already_AddRefed<nsISupports> nsCommandParams::GetISupports(
    const char* aName, ErrorResult& aRv) const {
  nsCOMPtr<nsISupports> result = GenericGet<nsCOMPtr<nsISupports>>(aName, aRv);
  return result.forget();
}

NS_IMETHODIMP
nsCommandParams::SetBooleanValue(const char* aName, bool aValue) {
  return SetBool(aName, aValue);
}

nsresult nsCommandParams::SetBool(const char* aName, bool aValue) {
  mValuesHash.InsertOrUpdate(nsDependentCString(aName), AsVariant(aValue));
  return NS_OK;
}

NS_IMETHODIMP
nsCommandParams::SetLongValue(const char* aName, int32_t aValue) {
  return SetInt(aName, aValue);
}

nsresult nsCommandParams::SetInt(const char* aName, int32_t aValue) {
  mValuesHash.InsertOrUpdate(nsDependentCString(aName), AsVariant(aValue));
  return NS_OK;
}

NS_IMETHODIMP
nsCommandParams::SetDoubleValue(const char* aName, double aValue) {
  return SetDouble(aName, aValue);
}

nsresult nsCommandParams::SetDouble(const char* aName, double aValue) {
  mValuesHash.InsertOrUpdate(nsDependentCString(aName), AsVariant(aValue));
  return NS_OK;
}

NS_IMETHODIMP
nsCommandParams::SetStringValue(const char* aName, const nsAString& aValue) {
  return SetString(aName, aValue);
}

nsresult nsCommandParams::SetString(const char* aName,
                                    const nsAString& aValue) {
  mValuesHash.InsertOrUpdate(nsDependentCString(aName),
                             AsVariant(nsString{aValue}));
  return NS_OK;
}

NS_IMETHODIMP
nsCommandParams::SetCStringValue(const char* aName, const nsACString& aValue) {
  return SetCString(aName, aValue);
}

nsresult nsCommandParams::SetCString(const char* aName,
                                     const nsACString& aValue) {
  mValuesHash.InsertOrUpdate(nsDependentCString(aName),
                             AsVariant(nsCString{aValue}));
  return NS_OK;
}

NS_IMETHODIMP
nsCommandParams::SetISupportsValue(const char* aName, nsISupports* aValue) {
  return SetISupports(aName, aValue);
}

nsresult nsCommandParams::SetISupports(const char* aName, nsISupports* aValue) {
  mValuesHash.InsertOrUpdate(nsDependentCString(aName),
                             AsVariant(nsCOMPtr{aValue}));
  return NS_OK;
}

NS_IMETHODIMP
nsCommandParams::RemoveValue(const char* aName) {
  mValuesHash.Remove(nsDependentCString(aName));
  return NS_OK;
}
