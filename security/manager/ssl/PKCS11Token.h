/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef PKCS11Token_h
#define PKCS11Token_h

#include "nsCOMPtr.h"
#include "nsIPKCS11Token.h"
#include "nsISupports.h"
#include "nsNSSHelper.h"
#include "nsString.h"
#include "pk11func.h"
#include "ScopedNSSTypes.h"

class PKCS11Token : public nsIPKCS11Token {
 public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSIPKCS11TOKEN

  explicit PKCS11Token(PK11SlotInfo* slot);

  PKCS11Token();
  nsresult Init();

 protected:
  virtual ~PKCS11Token() = default;

 private:
  nsresult refreshTokenInfo();

  nsCString mTokenName;
  nsCString mTokenManufacturerID;
  nsCString mTokenHWVersion;
  nsCString mTokenFWVersion;
  nsCString mTokenSerialNum;
  mozilla::UniquePK11SlotInfo mSlot;
  // True if this is the "PKCS#11 token" that provides cryptographic functions.
  bool mIsInternalCryptoToken;
  // True if this is the "PKCS#11 token" where private keys are stored.
  bool mIsInternalKeyToken;
  int mSeries;
  nsCOMPtr<nsIInterfaceRequestor> mUIContext;
  nsresult GetAttributeHelper(const nsACString& attribute,
                              /*out*/ nsACString& xpcomOutParam);
};

#endif  // PKCS11Token_h
