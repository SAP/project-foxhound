/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "nsString.h"
#include "MacHelpers.h"
#include "MacStringHelpers.h"
#include "nsObjCExceptions.h"

#import <Foundation/Foundation.h>

namespace mozilla {

nsresult GetSelectedCityInfo(nsAString& aCountryCode) {
  NS_OBJC_BEGIN_TRY_BLOCK_RETURN;

  NSString* countryCode = NSLocale.currentLocale.countryCode;

  if (!countryCode) {
    return NS_ERROR_FAILURE;
  }

  mozilla::CopyNSStringToXPCOMString(countryCode, aCountryCode);

  return NS_OK;

  NS_OBJC_END_TRY_BLOCK_RETURN(NS_ERROR_FAILURE);
}

}  // namespace mozilla
