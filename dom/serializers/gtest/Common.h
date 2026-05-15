/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef dom_serializers_gtest_Common_h
#define dom_serializers_gtest_Common_h

#include "nsIParserUtils.h"
#include "nsServiceManagerUtils.h"
#include "nsString.h"

const uint32_t kDefaultWrapColumn = 72;

inline void ConvertBufToPlainText(nsString& aConBuf, int aFlag,
                                  uint32_t aWrapColumn) {
  nsCOMPtr<nsIParserUtils> utils = do_GetService(NS_PARSERUTILS_CONTRACTID);
  utils->ConvertToPlainText(aConBuf, aFlag, aWrapColumn, aConBuf);
}

#endif  // dom_serializers_gtest_Common_h
