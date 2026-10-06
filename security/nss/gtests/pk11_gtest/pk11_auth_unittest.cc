/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <stdlib.h>
#include <cstdint>
#include <cstring>
#include <vector>

#include "nss.h"
#include "keyhi.h"
#include "pk11pub.h"
#include "prenv.h"
#include "prerror.h"
#include "secerr.h"
#include "secmod.h"

#include "nss_scoped_ptrs.h"
#include "gtest/gtest.h"

namespace nss_test {

// Matches the auth-required slot in pkcs11testmodule.cpp.
static const char kAuthTokenName[] = "Test PKCS11 Auth Token";
static const char kInitialSoPin[] = "0000";
static const char kModuleName[] = "Pkcs11AuthTest";

// PR_SetEnv strings (must have static storage). An empty value reads as unset
// (NSS_FORCE_TOKEN_LOCK is treated as set only when non-empty; see pk11load.c).
static const char kForceLockOn[] = "NSS_FORCE_TOKEN_LOCK=1";
static const char kForceLockOff[] = "NSS_FORCE_TOKEN_LOCK=";

// Parameter controls whether the module is loaded as non-thread-safe.
// Both variants exercise the same NSS auth APIs so regressions in either
// lock path (thread-safe slot with defRWSession, or shared module lock for
// non-thread-safe slots) are caught.
class Pkcs11AuthTest : public ::testing::TestWithParam<bool> {
 protected:
  bool ForceLock() const { return GetParam(); }

  void SetUp() override {
    // NSS_FORCE_TOKEN_LOCK must be set before SECMOD_AddNewModule, which reads
    // it at load time. Use PR_SetEnv for portability (setenv/unsetenv don't
    // exist on Windows). Clear it again afterward (empty == unset) so unrelated
    // modules loaded later aren't forced to lock.
    PR_SetEnv(ForceLock() ? kForceLockOn : kForceLockOff);
    ASSERT_EQ(SECSuccess,
              SECMOD_AddNewModule(
                  kModuleName, DLL_PREFIX "pkcs11testmodule." DLL_SUFFIX, 0, 0))
        << PORT_ErrorToName(PORT_GetError());
    PR_SetEnv(kForceLockOff);
    slot_.reset(PK11_FindSlotByName(kAuthTokenName));
    ASSERT_NE(nullptr, slot_) << "auth token not found";
    // Confirm NSS_FORCE_TOKEN_LOCK actually produced the slot mode we want.
    ScopedSECMODModule mod(SECMOD_FindModule(kModuleName));
    ASSERT_NE(nullptr, mod);
    ASSERT_EQ(ForceLock() ? PR_FALSE : PR_TRUE, mod->isThreadSafe);
  }

  void TearDown() override {
    slot_.reset();
    int type;
    ASSERT_EQ(SECSuccess, SECMOD_DeleteModule(kModuleName, &type));
  }

  ScopedPK11SlotInfo slot_;
};

TEST_P(Pkcs11AuthTest, InitialStateNeedsUserInit) {
  EXPECT_TRUE(PK11_NeedUserInit(slot_.get()));
  EXPECT_FALSE(PK11_IsLoggedIn(slot_.get(), nullptr));
}

TEST_P(Pkcs11AuthTest, InitPinSucceedsAndLogsIn) {
  EXPECT_EQ(SECSuccess, PK11_InitPin(slot_.get(), kInitialSoPin, "1234"));
  EXPECT_FALSE(PK11_NeedUserInit(slot_.get()));
  EXPECT_TRUE(PK11_IsLoggedIn(slot_.get(), nullptr));
}

TEST_P(Pkcs11AuthTest, InitPinWrongSoPinFails) {
  EXPECT_EQ(SECFailure, PK11_InitPin(slot_.get(), "wrong", "1234"));
  EXPECT_TRUE(PK11_NeedUserInit(slot_.get()));
}

TEST_P(Pkcs11AuthTest, LogoutClearsLoginState) {
  ASSERT_EQ(SECSuccess, PK11_InitPin(slot_.get(), kInitialSoPin, "1234"));
  ASSERT_TRUE(PK11_IsLoggedIn(slot_.get(), nullptr));
  EXPECT_EQ(SECSuccess, PK11_Logout(slot_.get()));
  EXPECT_FALSE(PK11_IsLoggedIn(slot_.get(), nullptr));
}

TEST_P(Pkcs11AuthTest, CheckUserPasswordCorrect) {
  ASSERT_EQ(SECSuccess, PK11_InitPin(slot_.get(), kInitialSoPin, "1234"));
  ASSERT_EQ(SECSuccess, PK11_Logout(slot_.get()));
  EXPECT_EQ(SECSuccess, PK11_CheckUserPassword(slot_.get(), "1234"));
  EXPECT_TRUE(PK11_IsLoggedIn(slot_.get(), nullptr));
}

TEST_P(Pkcs11AuthTest, CheckUserPasswordWrong) {
  ASSERT_EQ(SECSuccess, PK11_InitPin(slot_.get(), kInitialSoPin, "1234"));
  ASSERT_EQ(SECSuccess, PK11_Logout(slot_.get()));
  EXPECT_EQ(SECWouldBlock, PK11_CheckUserPassword(slot_.get(), "wrong"));
  EXPECT_FALSE(PK11_IsLoggedIn(slot_.get(), nullptr));
}

// These differ from the user-PIN tests in two ways. First, there's no
// PK11_InitPin step: PK11_CheckSSOPassword verifies the Security Officer PIN,
// which the token has from the start ("0000" here), rather than the user PIN
// that PK11_InitPin establishes. Second, the PIN is copied into a local buffer
// because PK11_CheckSSOPassword takes a non-const char* (a string literal can't
// be passed directly).
TEST_P(Pkcs11AuthTest, CheckSSOPasswordCorrect) {
  char pin[] = "0000";
  EXPECT_EQ(SECSuccess, PK11_CheckSSOPassword(slot_.get(), pin));
}

TEST_P(Pkcs11AuthTest, CheckSSOPasswordWrong) {
  char pin[] = "wrong";
  EXPECT_EQ(SECWouldBlock, PK11_CheckSSOPassword(slot_.get(), pin));
}

TEST_P(Pkcs11AuthTest, ChangePWUpdatesUserPin) {
  ASSERT_EQ(SECSuccess, PK11_InitPin(slot_.get(), kInitialSoPin, "1234"));
  ASSERT_EQ(SECSuccess, PK11_Logout(slot_.get()));
  EXPECT_EQ(SECSuccess, PK11_ChangePW(slot_.get(), "1234", "5678"));
  EXPECT_EQ(SECWouldBlock, PK11_CheckUserPassword(slot_.get(), "1234"));
  ASSERT_EQ(SECSuccess, PK11_Logout(slot_.get()));
  EXPECT_EQ(SECSuccess, PK11_CheckUserPassword(slot_.get(), "5678"));
}

TEST_P(Pkcs11AuthTest, ChangePWWrongOldPinFails) {
  ASSERT_EQ(SECSuccess, PK11_InitPin(slot_.get(), kInitialSoPin, "1234"));
  ASSERT_EQ(SECSuccess, PK11_Logout(slot_.get()));
  EXPECT_EQ(SECFailure, PK11_ChangePW(slot_.get(), "wrong", "5678"));
  EXPECT_EQ(SECSuccess, PK11_CheckUserPassword(slot_.get(), "1234"));
}

// Drives PK11_DoPassword through PK11_Authenticate using a getPass callback.
static int doPasswordCallbackCount = 0;
static char* doPasswordCallback(PK11SlotInfo*, PRBool retry, void*) {
  doPasswordCallbackCount++;
  if (retry) return nullptr;  // refuse retry to keep test deterministic
  return PORT_Strdup("1234");
}

TEST_P(Pkcs11AuthTest, DoPasswordViaCallback) {
  ASSERT_EQ(SECSuccess, PK11_InitPin(slot_.get(), kInitialSoPin, "1234"));
  ASSERT_EQ(SECSuccess, PK11_Logout(slot_.get()));
  doPasswordCallbackCount = 0;
  PK11_SetPasswordFunc(doPasswordCallback);
  EXPECT_EQ(SECSuccess, PK11_Authenticate(slot_.get(), PR_FALSE, nullptr));
  PK11_SetPasswordFunc(nullptr);
  EXPECT_GE(doPasswordCallbackCount, 1);
  EXPECT_TRUE(PK11_IsLoggedIn(slot_.get(), nullptr));
}

// Exercises the askpw==1 ("log out after N minutes") timeout path in
// PK11_IsLoggedIn: a not-yet-expired timeout keeps us logged in (refreshes
// authTime), while an already-expired timeout forces a C_Logout.
TEST_P(Pkcs11AuthTest, LoginTimeoutLogsOutWhenExpired) {
  ASSERT_EQ(SECSuccess, PK11_InitPin(slot_.get(), kInitialSoPin, "1234"));
  ASSERT_EQ(SECSuccess, PK11_Logout(slot_.get()));
  // Log in via PK11_CheckUserPassword, which stamps slot->authTime with the
  // current time (PK11_InitPin does not), so the timeout below is measured
  // from "now".
  ASSERT_EQ(SECSuccess, PK11_CheckUserPassword(slot_.get(), "1234"));
  ASSERT_TRUE(PK11_IsLoggedIn(slot_.get(), nullptr));

  int savedAskpw, savedTimeout;
  PK11_GetSlotPWValues(slot_.get(), &savedAskpw, &savedTimeout);

  // askpw == 1 enables the timeout check. A large timeout has not elapsed, so
  // we stay logged in (the "else" branch refreshes authTime).
  PK11_SetSlotPWValues(slot_.get(), 1, 1000);
  EXPECT_TRUE(PK11_IsLoggedIn(slot_.get(), nullptr));

  // A negative timeout puts the deadline (authTime + timeout) in the
  // past, so the session counts as expired even if the clock hasn't advanced
  // since authTime was last refreshed (PR_Now's resolution is coarse on some
  // platforms). PK11_IsLoggedIn takes the expiry branch and logs the token out.
  PK11_SetSlotPWValues(slot_.get(), 1, -1);
  EXPECT_FALSE(PK11_IsLoggedIn(slot_.get(), nullptr));

  PK11_SetSlotPWValues(slot_.get(), savedAskpw, savedTimeout);
}

// Handle of the CKA_ALWAYS_AUTHENTICATE private key the test module exposes on
// the auth slot. Must match kAlwaysAuthPrivKeyHandle in pkcs11testmodule.cpp.
static const CK_OBJECT_HANDLE kAlwaysAuthPrivKeyHandle = 6;

// We don't have a way to mint a real key on the mock token, but the crypto-op
// entry points only need a key that references the slot and an object whose
// token reports CKA_ALWAYS_AUTHENTICATE, so build a minimal SECKEYPrivateKey by
// hand (SECKEYPrivateKey is a public struct).
static SECKEYPrivateKey MakeAlwaysAuthKey(PK11SlotInfo* slot) {
  SECKEYPrivateKey key;
  memset(&key, 0, sizeof(key));
  key.keyType = rsaKey;
  key.pkcs11Slot = slot;
  key.pkcs11ID = kAlwaysAuthPrivKeyHandle;
  key.wincx = nullptr;
  return key;
}

// Regression tests for bug 1885900.
//
// A crypto operation with a CKA_ALWAYS_AUTHENTICATE key takes the slot monitor
// and then calls PK11_DoPassword with alreadyLocked = PR_TRUE to perform a
// CKU_CONTEXT_SPECIFIC re-login between C_*Init and the operation. The bug was
// a PK11_IsLoggedIn() call inside PK11_DoPassword that ignored alreadyLocked
// and re-took the monitor, self-deadlocking. The NonThreadSafe variant is the
// one that actually deadlocked pre-fix (the monitor is the shared module lock
// and is always taken); either way the operation must complete rather than
// hang.
//
// PK11_SignWithMechanism (pk11obj.c) is one such caller.
TEST_P(Pkcs11AuthTest, AlwaysAuthenticateSignDoesNotDeadlock) {
  ASSERT_EQ(SECSuccess, PK11_InitPin(slot_.get(), kInitialSoPin, "1234"));
  ASSERT_EQ(SECSuccess, PK11_Logout(slot_.get()));
  ASSERT_EQ(SECSuccess, PK11_CheckUserPassword(slot_.get(), "1234"));
  ASSERT_TRUE(PK11_IsLoggedIn(slot_.get(), nullptr));

  doPasswordCallbackCount = 0;
  PK11_SetPasswordFunc(doPasswordCallback);  // supplies "1234"

  SECKEYPrivateKey key = MakeAlwaysAuthKey(slot_.get());
  std::vector<uint8_t> hashBuf(32, 0xab);
  SECItem hash = {siBuffer, hashBuf.data(),
                  static_cast<unsigned int>(hashBuf.size())};
  std::vector<uint8_t> sigBuf(64);
  SECItem sig = {siBuffer, sigBuf.data(),
                 static_cast<unsigned int>(sigBuf.size())};

  SECStatus rv =
      PK11_SignWithMechanism(&key, CKM_RSA_PKCS, nullptr, &sig, &hash);
  PK11_SetPasswordFunc(nullptr);

  EXPECT_EQ(SECSuccess, rv) << PORT_ErrorToName(PORT_GetError());
  // The CKA_ALWAYS_AUTHENTICATE re-login must have prompted for the PIN.
  EXPECT_GE(doPasswordCallbackCount, 1);
}

// PK11_PrivDecrypt (pk11obj.c) is the other caller with the same shape.
TEST_P(Pkcs11AuthTest, AlwaysAuthenticateDecryptDoesNotDeadlock) {
  ASSERT_EQ(SECSuccess, PK11_InitPin(slot_.get(), kInitialSoPin, "1234"));
  ASSERT_EQ(SECSuccess, PK11_Logout(slot_.get()));
  ASSERT_EQ(SECSuccess, PK11_CheckUserPassword(slot_.get(), "1234"));
  ASSERT_TRUE(PK11_IsLoggedIn(slot_.get(), nullptr));

  doPasswordCallbackCount = 0;
  PK11_SetPasswordFunc(doPasswordCallback);  // supplies "1234"

  SECKEYPrivateKey key = MakeAlwaysAuthKey(slot_.get());
  std::vector<uint8_t> ciphertext(64, 0xcd);
  std::vector<uint8_t> out(64);
  unsigned int outLen = 0;

  SECStatus rv =
      PK11_PrivDecrypt(&key, CKM_RSA_PKCS, nullptr, out.data(), &outLen,
                       static_cast<unsigned int>(out.size()), ciphertext.data(),
                       static_cast<unsigned int>(ciphertext.size()));
  PK11_SetPasswordFunc(nullptr);

  EXPECT_EQ(SECSuccess, rv) << PORT_ErrorToName(PORT_GetError());
  // The CKA_ALWAYS_AUTHENTICATE re-login must have prompted for the PIN.
  EXPECT_GE(doPasswordCallbackCount, 1);
}

INSTANTIATE_TEST_SUITE_P(ThreadSafetyVariants, Pkcs11AuthTest,
                         ::testing::Values(false, true),
                         [](const ::testing::TestParamInfo<bool>& param_info) {
                           return param_info.param ? "NonThreadSafe"
                                                   : "ThreadSafe";
                         });

}  // namespace nss_test
