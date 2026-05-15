/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef _nsstreamconverterservice_h_
#define _nsstreamconverterservice_h_

#include "nsIStreamConverterService.h"

#include "nsClassHashtable.h"
#include "nsStringFwd.h"
#include "nsTArrayForwardDeclare.h"

class nsAtom;

class nsStreamConverterService : public nsIStreamConverterService {
 public:
  /////////////////////////////////////////////////////
  // nsISupports methods
  NS_DECL_ISUPPORTS

  /////////////////////////////////////////////////////
  // nsIStreamConverterService methods
  NS_DECL_NSISTREAMCONVERTERSERVICE

  /////////////////////////////////////////////////////
  // nsStreamConverterService methods
  nsStreamConverterService() = default;

 private:
  virtual ~nsStreamConverterService() = default;

  // Responsible for finding a converter for the given MIME-type.
  nsresult FindConverter(const char* aContractID,
                         nsTArray<nsCString>** aEdgeList);
  nsresult BuildGraph(void);
  nsresult AddAdjacency(const char* aContractID);
  nsresult ParseFromTo(const char* aContractID, nsCString& aFromRes,
                       nsCString& aToRes);

  // member variables
  nsClassHashtable<nsCStringHashKey, nsTArray<RefPtr<nsAtom>>> mAdjacencyList;
};

#endif  // _nsstreamconverterservice_h_
