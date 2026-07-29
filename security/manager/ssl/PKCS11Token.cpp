/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "PKCS11Token.h"
#include "ScopedNSSTypes.h"
#include "mozilla/Casting.h"
#include "mozilla/Logging.h"
#include "nsISupports.h"
#include "nsNSSCertHelper.h"
#include "nsNSSComponent.h"
#include "nsPromiseFlatString.h"
#include "nsReadableUtils.h"
#include "nsServiceManagerUtils.h"
#include "prerror.h"
#include "secerr.h"

extern mozilla::LazyLogModule gPIPNSSLog;

NS_IMPL_ISUPPORTS(PKCS11Token, nsIPKCS11Token)

PKCS11Token::PKCS11Token() : mUIContext(new PipUIContext()) {}

nsresult PKCS11Token::Init() {
  static NS_DEFINE_CID(kNSSComponentCID, NS_NSSCOMPONENT_CID);
  nsCOMPtr<nsINSSComponent> nss(do_GetService(kNSSComponentCID));
  if (!nss) {
    return NS_ERROR_FAILURE;
  }
  mSlot.reset(PK11_GetInternalKeySlot());
  mIsInternalCryptoToken = false;
  mIsInternalKeyToken = true;
  mSeries = PK11_GetSlotSeries(mSlot.get());
  return refreshTokenInfo();
}

PKCS11Token::PKCS11Token(PK11SlotInfo* slot) : mUIContext(new PipUIContext()) {
  MOZ_ASSERT(slot);
  mSlot.reset(PK11_ReferenceSlot(slot));
  mIsInternalCryptoToken =
      PK11_IsInternal(mSlot.get()) && !PK11_IsInternalKeySlot(mSlot.get());
  mIsInternalKeyToken = PK11_IsInternalKeySlot(mSlot.get());
  mSeries = PK11_GetSlotSeries(slot);
  (void)refreshTokenInfo();
}

nsresult PKCS11Token::refreshTokenInfo() {
  if (mIsInternalCryptoToken) {
    nsresult rv;
    if (PK11_IsFIPS()) {
      rv = GetPIPNSSBundleString("Fips140TokenDescription", mTokenName);
    } else {
      rv = GetPIPNSSBundleString("TokenDescription", mTokenName);
    }
    if (NS_FAILED(rv)) {
      return rv;
    }
  } else if (mIsInternalKeyToken) {
    nsresult rv = GetPIPNSSBundleString("PrivateTokenDescription", mTokenName);
    if (NS_FAILED(rv)) {
      return rv;
    }
  } else {
    mTokenName.Assign(PK11_GetTokenName(mSlot.get()));
  }

  CK_TOKEN_INFO tokInfo;
  nsresult rv = mozilla::MapSECStatus(PK11_GetTokenInfo(mSlot.get(), &tokInfo));
  if (NS_FAILED(rv)) {
    return rv;
  }

  // Set the Manufacturer field
  if (mIsInternalCryptoToken || mIsInternalKeyToken) {
    rv = GetPIPNSSBundleString("ManufacturerID", mTokenManufacturerID);
    if (NS_FAILED(rv)) {
      return rv;
    }
  } else {
    const char* ccManID =
        mozilla::BitwiseCast<char*, CK_UTF8CHAR*>(tokInfo.manufacturerID);
    mTokenManufacturerID.Assign(
        ccManID, strnlen(ccManID, sizeof(tokInfo.manufacturerID)));
    mTokenManufacturerID.Trim(" ", false, true);
  }

  // Set the Hardware Version field
  mTokenHWVersion.Truncate();
  mTokenHWVersion.AppendInt(tokInfo.hardwareVersion.major);
  mTokenHWVersion.Append('.');
  mTokenHWVersion.AppendInt(tokInfo.hardwareVersion.minor);

  // Set the Firmware Version field
  mTokenFWVersion.Truncate();
  mTokenFWVersion.AppendInt(tokInfo.firmwareVersion.major);
  mTokenFWVersion.Append('.');
  mTokenFWVersion.AppendInt(tokInfo.firmwareVersion.minor);

  // Set the Serial Number field
  const char* ccSerial =
      mozilla::BitwiseCast<char*, CK_CHAR*>(tokInfo.serialNumber);
  mTokenSerialNum.Assign(ccSerial,
                         strnlen(ccSerial, sizeof(tokInfo.serialNumber)));
  mTokenSerialNum.Trim(" ", false, true);

  return NS_OK;
}

nsresult PKCS11Token::GetAttributeHelper(const nsACString& attribute,
                                         /*out*/ nsACString& xpcomOutParam) {
  // Handle removals/insertions.
  if (PK11_GetSlotSeries(mSlot.get()) != mSeries) {
    nsresult rv = refreshTokenInfo();
    if (NS_FAILED(rv)) {
      return rv;
    }
  }

  xpcomOutParam = attribute;
  return NS_OK;
}

NS_IMETHODIMP
PKCS11Token::GetTokenName(/*out*/ nsACString& tokenName) {
  return GetAttributeHelper(mTokenName, tokenName);
}

NS_IMETHODIMP
PKCS11Token::GetIsInternalKeyToken(/*out*/ bool* _retval) {
  NS_ENSURE_ARG_POINTER(_retval);
  *_retval = mIsInternalKeyToken;
  return NS_OK;
}

NS_IMETHODIMP
PKCS11Token::GetTokenManID(/*out*/ nsACString& tokenManufacturerID) {
  return GetAttributeHelper(mTokenManufacturerID, tokenManufacturerID);
}

NS_IMETHODIMP
PKCS11Token::GetTokenHWVersion(/*out*/ nsACString& tokenHWVersion) {
  return GetAttributeHelper(mTokenHWVersion, tokenHWVersion);
}

NS_IMETHODIMP
PKCS11Token::GetTokenFWVersion(/*out*/ nsACString& tokenFWVersion) {
  return GetAttributeHelper(mTokenFWVersion, tokenFWVersion);
}

NS_IMETHODIMP
PKCS11Token::GetTokenSerialNumber(/*out*/ nsACString& tokenSerialNum) {
  return GetAttributeHelper(mTokenSerialNum, tokenSerialNum);
}

NS_IMETHODIMP
PKCS11Token::GetIsLoggedIn(bool* isLoggedIn) {
  *isLoggedIn = PK11_IsLoggedIn(mSlot.get(), nullptr);
  return NS_OK;
}

NS_IMETHODIMP
PKCS11Token::Login() {
  return mozilla::MapSECStatus(
      PK11_Authenticate(mSlot.get(), true, mUIContext));
}

NS_IMETHODIMP
PKCS11Token::Logout() {
  // PK11_Logout() can fail if the user wasn't logged in beforehand. We want
  // this method to succeed even in this case, so we ignore the return value.
  (void)PK11_Logout(mSlot.get());
  return NS_OK;
}

NS_IMETHODIMP
PKCS11Token::Reset() {
  SECStatus rv = PK11_ResetToken(mSlot.get(), nullptr);
  if (rv != SECSuccess) {
    return mozilla::MapSECStatus(rv);
  }
  // If this is the internal key token, set an empty password to enable the SQL
  // DB to work properly.
  if (mIsInternalKeyToken) {
    rv = PK11_InitPin(mSlot.get(), nullptr, nullptr);
    if (rv != SECSuccess) {
      return mozilla::MapSECStatus(rv);
    }
  }
  return NS_OK;
}

NS_IMETHODIMP
PKCS11Token::ChangePassword(const nsACString& oldPassword,
                            const nsACString& newPassword) {
  if (oldPassword.IsEmpty() && PK11_NeedUserInit(mSlot.get())) {
    return mozilla::MapSECStatus(
        PK11_InitPin(mSlot.get(), "", PromiseFlatCString(newPassword).get()));
  }
  SECStatus rv = PK11_CheckUserPassword(mSlot.get(),
                                        PromiseFlatCString(oldPassword).get());
  if (rv != SECSuccess) {
    return mozilla::MapSECStatus(rv);
  }
  return mozilla::MapSECStatus(
      PK11_ChangePW(mSlot.get(), PromiseFlatCString(oldPassword).get(),
                    PromiseFlatCString(newPassword).get()));
}

// Two PKCS#11 flags are relevant here: CKF_LOGIN_REQUIRED and
// CKF_USER_PIN_INITIALIZED.
// CKF_LOGIN_REQUIRED is set if there are some cryptographic operations on the
// token that require logging in to perform. If this flag is not set, no
// password is required.
// CKF_USER_PIN_INITIALIZED is set if the token's user pin (password) has been
// set.
// CKF_LOGIN_REQUIRED is obtained by calling PK11_NeedLogin.
// CKF_USER_PIN_INITIALIZED is obtained by negating the result of calling
// PK11_NeedUserInit.

NS_IMETHODIMP
PKCS11Token::GetCanHavePassword(bool* canHavePassword) {
  // A token is considered able to have a password if CKF_LOGIN_REQUIRED is set
  // or if CKF_USER_PIN_INITIALIZED is set.
  *canHavePassword =
      PK11_NeedLogin(mSlot.get()) || !PK11_NeedUserInit(mSlot.get());
  ;
  return NS_OK;
}

NS_IMETHODIMP
PKCS11Token::GetHasPassword(bool* hasPassword) {
  // A token has a password if CKF_LOGIN_REQUIRED is set and
  // CKF_USER_PIN_INITIALIZED is set.
  *hasPassword = PK11_NeedLogin(mSlot.get()) && !PK11_NeedUserInit(mSlot.get());
  return NS_OK;
}
