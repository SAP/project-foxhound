/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

// Comprehensive tests for PK11 URI resolution via PK11_FindCertsFromURI and
// PK11_FindCertFromURI (lib/pk11wrap/pk11cert.c: find_certs_from_uri /
// transfer_uri_certs_to_collection).
//
// The pkcs11testmodule exposes a "public certs" token (slot 4) with:
//   cert1: CKA_ID = {0x00..0x0f}, CKA_LABEL = "cert1"
//   cert2: CKA_ID = {0x10..0x1f}, CKA_LABEL = "cert2"
//   Token label:        "Test PKCS11 Public Certs Token"
//   Manufacturer ID:    "Test PKCS11 Manufacturer ID"
//   Model:              "Test Model"
//   Serial:             (16 bytes, all spaces/zeros)
//
// cert1 and cert2 share identical DER (certValue/serial/issuer), so NSS
// deduplicates them to one NSSCertificate under cert1's label when no id=
// filter is applied.
//
// Two fixtures are used:
//
//   PK11URIResolutionTest — cold cache; cert lookup goes entirely through the
//     token-search path (nssToken_FindObjectsByTemplate).
//
//   PK11URIResolutionCachedTest — warm cache; SetUp primes the NSS
//     trust-domain cert cache with a bare pkcs11: lookup so that subsequent
//     calls exercise transfer_uri_certs_to_collection past its count==0 early
//     return.

#include <string>
#include "nss.h"
#include "pk11pub.h"
#include "prerror.h"
#include "secmod.h"

#include "nss_scoped_ptrs.h"
#include "gtest/gtest.h"

namespace nss_test {

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

class PK11URITestBase : public ::testing::Test {
 protected:
  size_t CountCerts(CERTCertList* list) {
    if (!list) return 0;
    size_t n = 0;
    for (CERTCertListNode* node = CERT_LIST_HEAD(list);
         !CERT_LIST_END(node, list); node = CERT_LIST_NEXT(node)) {
      n++;
    }
    return n;
  }

  bool HasCertWithNickname(CERTCertList* list, const char* nickname) {
    for (CERTCertListNode* node = CERT_LIST_HEAD(list);
         !CERT_LIST_END(node, list); node = CERT_LIST_NEXT(node)) {
      if (node->cert->nickname && strcmp(node->cert->nickname, nickname) == 0)
        return true;
    }
    return false;
  }
};

// ---------------------------------------------------------------------------
// Cold-cache fixture — token-search path
// ---------------------------------------------------------------------------

class PK11URIResolutionTest : public PK11URITestBase {
 public:
  void SetUp() override {
    ASSERT_EQ(SECSuccess, SECMOD_AddNewModule(
                              "PK11URIResolutionTest",
                              DLL_PREFIX "pkcs11testmodule." DLL_SUFFIX, 0, 0))
        << PORT_ErrorToName(PORT_GetError());
  }

  void TearDown() override {
    int type;
    ASSERT_EQ(SECSuccess, SECMOD_DeleteModule("PK11URIResolutionTest", &type));
    ASSERT_EQ(SECMOD_EXTERNAL, type);
  }
};

// ---------------------------------------------------------------------------
// Warm-cache fixture — exercises transfer_uri_certs_to_collection body
// ---------------------------------------------------------------------------

class PK11URIResolutionCachedTest : public PK11URITestBase {
 public:
  void SetUp() override {
    ASSERT_EQ(SECSuccess, SECMOD_AddNewModule(
                              "PK11URIResolutionCachedTest",
                              DLL_PREFIX "pkcs11testmodule." DLL_SUFFIX, 0, 0))
        << PORT_ErrorToName(PORT_GetError());
    // A bare pkcs11: lookup goes through the token-search path and registers
    // the discovered NSSCertificate objects in the trust-domain cache.  We
    // keep the returned CERTCertList alive in prime_ so that each
    // NSSCertificate's refcount stays above zero throughout the test body.
    // nssTrustDomain_GetCertsFromCache uses the issuerAndSN hash, which only
    // contains certs with refcount > 0; dropping the last reference (by
    // letting a local ScopedCERTCertList go out of scope here) would evict
    // the cert and leave the cache empty again for the actual test call.
    prime_.reset(PK11_FindCertsFromURI("pkcs11:", nullptr));
    ASSERT_NE(nullptr, prime_.get());
  }

  void TearDown() override {
    // Release prime_ first so that its CERT_DestroyCertificate calls happen
    // before RemoveTokenCertsFromCache runs inside SECMOD_DeleteModule.
    prime_.reset();
    int type;
    ASSERT_EQ(SECSuccess,
              SECMOD_DeleteModule("PK11URIResolutionCachedTest", &type));
    ASSERT_EQ(SECMOD_EXTERNAL, type);
  }

 private:
  ScopedCERTCertList prime_;
};

// ---------------------------------------------------------------------------
// Shared nickname constants
// ---------------------------------------------------------------------------

static const char kNickname1[] = "Test PKCS11 Public Certs Token:cert1";
static const char kNickname2[] = "Test PKCS11 Public Certs Token:cert2";

// ===========================================================================
// PK11URIResolutionTest — cold-cache tests (token-search path)
// ===========================================================================

// pkcs11: with no attributes must return certs from all tokens. cert1 and
// cert2 in the test module share identical DER (same certValue/serial/issuer),
// so NSS deduplicates them into a single NSSCertificate under cert1's label.
// The result set therefore contains cert1 (from slot 4) plus whatever certs
// live in the internal softoken db — we check the token cert is present
// without asserting an exact count.
TEST_F(PK11URIResolutionTest, BareURIReturnsAllCerts) {
  ScopedCERTCertList certs(PK11_FindCertsFromURI("pkcs11:", nullptr));
  ASSERT_NE(nullptr, certs.get());
  EXPECT_TRUE(HasCertWithNickname(certs.get(), kNickname1));
}

// id= matching cert1 (0x00..0x0f) returns only cert1.
TEST_F(PK11URIResolutionTest, FilterById_MatchesCert1) {
  ScopedCERTCertList certs(PK11_FindCertsFromURI(
      "pkcs11:id=%00%01%02%03%04%05%06%07%08%09%0a%0b%0c%0d%0e%0f", nullptr));
  ASSERT_NE(nullptr, certs.get());
  EXPECT_EQ(1UL, CountCerts(certs.get()));
  EXPECT_TRUE(HasCertWithNickname(certs.get(), kNickname1));
}

// id= matching cert2 (0x10..0x1f) returns only cert2.
TEST_F(PK11URIResolutionTest, FilterById_MatchesCert2) {
  ScopedCERTCertList certs(PK11_FindCertsFromURI(
      "pkcs11:id=%10%11%12%13%14%15%16%17%18%19%1a%1b%1c%1d%1e%1f", nullptr));
  ASSERT_NE(nullptr, certs.get());
  EXPECT_EQ(1UL, CountCerts(certs.get()));
  EXPECT_TRUE(HasCertWithNickname(certs.get(), kNickname2));
}

// id= with uppercase percent-encoding (%0A–%0F) must be accepted; the
// pk11uri_Unescape 'A'–'F' branch is exercised.
TEST_F(PK11URIResolutionTest, FilterById_UppercaseHex) {
  ScopedCERTCertList certs(PK11_FindCertsFromURI(
      "pkcs11:id=%00%01%02%03%04%05%06%07%08%09%0A%0B%0C%0D%0E%0F", nullptr));
  ASSERT_NE(nullptr, certs.get());
  EXPECT_EQ(1UL, CountCerts(certs.get()));
  EXPECT_TRUE(HasCertWithNickname(certs.get(), kNickname1));
}

// id= with correct length but bytes that match neither cert returns null.
TEST_F(PK11URIResolutionTest, FilterById_WrongBytes) {
  ScopedCERTCertList certs(PK11_FindCertsFromURI(
      "pkcs11:id=%aa%bb%cc%dd%ee%ff%aa%bb%cc%dd%ee%ff%aa%bb%cc%dd", nullptr));
  EXPECT_EQ(nullptr, certs.get());
}

// id= whose length differs from any cert ID returns null.
TEST_F(PK11URIResolutionTest, FilterById_WrongLength) {
  ScopedCERTCertList certs(
      PK11_FindCertsFromURI("pkcs11:id=%00%01%02", nullptr));
  EXPECT_EQ(nullptr, certs.get());
}

// type=cert is the only permitted value; all certs are returned.
TEST_F(PK11URIResolutionTest, FilterByType_CertAllowed) {
  ScopedCERTCertList certs(PK11_FindCertsFromURI("pkcs11:type=cert", nullptr));
  ASSERT_NE(nullptr, certs.get());
  EXPECT_EQ(2UL, CountCerts(certs.get()));
}

// type=private must be rejected immediately (not a certificate type).
TEST_F(PK11URIResolutionTest, FilterByType_PrivateRejected) {
  ScopedCERTCertList certs(
      PK11_FindCertsFromURI("pkcs11:type=private", nullptr));
  EXPECT_EQ(nullptr, certs.get());
}

// type=secret-key must also be rejected.
TEST_F(PK11URIResolutionTest, FilterByType_SecretKeyRejected) {
  ScopedCERTCertList certs(
      PK11_FindCertsFromURI("pkcs11:type=secret-key", nullptr));
  EXPECT_EQ(nullptr, certs.get());
}

// token= matching the public-certs token label returns that token's cert.
// cert1 and cert2 share the same DER and deduplicate to one NSSCertificate.
TEST_F(PK11URIResolutionTest, FilterByToken_Match) {
  ScopedCERTCertList certs(PK11_FindCertsFromURI(
      "pkcs11:token=Test%20PKCS11%20Public%20Certs%20Token", nullptr));
  ASSERT_NE(nullptr, certs.get());
  EXPECT_EQ(1UL, CountCerts(certs.get()));
  EXPECT_TRUE(HasCertWithNickname(certs.get(), kNickname1));
}

// token= that matches no loaded token returns null.
TEST_F(PK11URIResolutionTest, FilterByToken_NoMatch) {
  ScopedCERTCertList certs(
      PK11_FindCertsFromURI("pkcs11:token=Nonexistent%20Token", nullptr));
  EXPECT_EQ(nullptr, certs.get());
}

// manufacturer= matching the test module manufacturer returns cert1 (cert1 and
// cert2 deduplicate; the internal NSS slots have a different manufacturer so
// they are excluded).
TEST_F(PK11URIResolutionTest, FilterByManufacturer_Match) {
  ScopedCERTCertList certs(PK11_FindCertsFromURI(
      "pkcs11:manufacturer=Test%20PKCS11%20Manufacturer%20ID", nullptr));
  ASSERT_NE(nullptr, certs.get());
  EXPECT_EQ(1UL, CountCerts(certs.get()));
  EXPECT_TRUE(HasCertWithNickname(certs.get(), kNickname1));
}

// manufacturer= with an unknown value returns null.
TEST_F(PK11URIResolutionTest, FilterByManufacturer_NoMatch) {
  ScopedCERTCertList certs(PK11_FindCertsFromURI(
      "pkcs11:manufacturer=No%20Such%20Manufacturer", nullptr));
  EXPECT_EQ(nullptr, certs.get());
}

// model= matching the test token model returns cert1 (same deduplication
// argument as manufacturer; internal NSS slots use a different model string).
TEST_F(PK11URIResolutionTest, FilterByModel_Match) {
  ScopedCERTCertList certs(
      PK11_FindCertsFromURI("pkcs11:model=Test%20Model", nullptr));
  ASSERT_NE(nullptr, certs.get());
  EXPECT_EQ(1UL, CountCerts(certs.get()));
  EXPECT_TRUE(HasCertWithNickname(certs.get(), kNickname1));
}

// model= with an unknown value returns null.
TEST_F(PK11URIResolutionTest, FilterByModel_NoMatch) {
  ScopedCERTCertList certs(
      PK11_FindCertsFromURI("pkcs11:model=No%20Such%20Model", nullptr));
  EXPECT_EQ(nullptr, certs.get());
}

// Combining id= and token= must narrow results to one cert on the right token.
TEST_F(PK11URIResolutionTest, FilterByIdAndToken) {
  ScopedCERTCertList certs(PK11_FindCertsFromURI(
      "pkcs11:id=%00%01%02%03%04%05%06%07%08%09%0a%0b%0c%0d%0e%0f;"
      "token=Test%20PKCS11%20Public%20Certs%20Token",
      nullptr));
  ASSERT_NE(nullptr, certs.get());
  EXPECT_EQ(1UL, CountCerts(certs.get()));
  EXPECT_TRUE(HasCertWithNickname(certs.get(), kNickname1));
}

// Combining id= with a wrong token= must return null.
TEST_F(PK11URIResolutionTest, FilterByIdAndToken_WrongToken) {
  ScopedCERTCertList certs(PK11_FindCertsFromURI(
      "pkcs11:id=%00%01%02%03%04%05%06%07%08%09%0a%0b%0c%0d%0e%0f;"
      "token=Wrong%20Token",
      nullptr));
  EXPECT_EQ(nullptr, certs.get());
}

// object= (CKA_LABEL) matching cert1 returns cert1 via the token-search path
// (nssTrustDomain_GetCertsForNicknameFromCache misses on short label; the
// token search uses a CKA_LABEL attribute template that matches).
TEST_F(PK11URIResolutionTest, FilterByObject_Label) {
  ScopedCERTCertList certs(
      PK11_FindCertsFromURI("pkcs11:object=cert1", nullptr));
  ASSERT_NE(nullptr, certs.get());
  EXPECT_EQ(1UL, CountCerts(certs.get()));
  EXPECT_TRUE(HasCertWithNickname(certs.get(), kNickname1));
}

// A URI with a query component (pin-value) must still resolve certs normally;
// the query string exercises pk11uri_CompareQueryAttributeName during parsing.
TEST_F(PK11URIResolutionTest, URIWithQueryAttribute) {
  ScopedCERTCertList certs(PK11_FindCertsFromURI(
      "pkcs11:token=Test%20PKCS11%20Public%20Certs%20Token?pin-value=",
      nullptr));
  ASSERT_NE(nullptr, certs.get());
  EXPECT_EQ(1UL, CountCerts(certs.get()));
  EXPECT_TRUE(HasCertWithNickname(certs.get(), kNickname1));
}

// A string lacking the pkcs11: scheme must be rejected.
TEST_F(PK11URIResolutionTest, InvalidURI_NoScheme) {
  ScopedCERTCertList certs(PK11_FindCertsFromURI("not-a-pkcs11-uri", nullptr));
  EXPECT_EQ(nullptr, certs.get());
}

// Malformed percent-encoding in the URI must be rejected.
TEST_F(PK11URIResolutionTest, InvalidURI_BadPercentEncoding) {
  ScopedCERTCertList certs(
      PK11_FindCertsFromURI("pkcs11:id=%2;manufacturer=test", nullptr));
  EXPECT_EQ(nullptr, certs.get());
}

// Bug 2023478: PK11URI_ParseURI must reject a bare '%' at the end of the
// string.  strchr(PK11URI_HEXDIG, '\0') returns non-NULL (C standard: NUL is
// part of the string for strchr), so an unguarded check treats the NUL byte as
// a valid hex digit and reads 1-2 bytes past the heap allocation.
// These three inputs cover the three trigger cases from the bug report.
TEST_F(PK11URIResolutionTest, InvalidURI_TruncatedPercent_BareAtEnd) {
  ScopedPK11URI uri(PK11URI_ParseURI("pkcs11:id=%"));
  EXPECT_EQ(nullptr, uri.get());
}

TEST_F(PK11URIResolutionTest, InvalidURI_TruncatedPercent_OneDigitAtEnd) {
  ScopedPK11URI uri(PK11URI_ParseURI("pkcs11:id=%A"));
  EXPECT_EQ(nullptr, uri.get());
}

TEST_F(PK11URIResolutionTest, InvalidURI_TruncatedPercent_TokenAttr) {
  ScopedPK11URI uri(PK11URI_ParseURI("pkcs11:token=%2"));
  EXPECT_EQ(nullptr, uri.get());
}

// Duplicate path attribute must be rejected.
TEST_F(PK11URIResolutionTest, InvalidURI_DuplicateAttribute) {
  ScopedCERTCertList certs(
      PK11_FindCertsFromURI("pkcs11:token=aaa;token=bbb", nullptr));
  EXPECT_EQ(nullptr, certs.get());
}

// PK11_FindCertFromURI with a matching id= returns the expected cert.
TEST_F(PK11URIResolutionTest, FindCertFromURI_IdMatch) {
  ScopedCERTCertificate cert(PK11_FindCertFromURI(
      "pkcs11:id=%00%01%02%03%04%05%06%07%08%09%0a%0b%0c%0d%0e%0f", nullptr));
  ASSERT_NE(nullptr, cert.get());
  EXPECT_EQ(0, strcmp(cert->nickname, kNickname1));
}

// PK11_FindCertFromURI with a non-matching id= returns null.
TEST_F(PK11URIResolutionTest, FindCertFromURI_NoMatch) {
  ScopedCERTCertificate cert(
      PK11_FindCertFromURI("pkcs11:id=%00%01%02", nullptr));
  EXPECT_EQ(nullptr, cert.get());
}

// PK11_FindCertFromURI with type=private must return null.
TEST_F(PK11URIResolutionTest, FindCertFromURI_WrongType) {
  ScopedCERTCertificate cert(
      PK11_FindCertFromURI("pkcs11:type=private", nullptr));
  EXPECT_EQ(nullptr, cert.get());
}

// PK11_GetTokenURI builds a pkcs11: URI from the slot's token info fields,
// exercising PK11URI_CreateURI, PK11URI_FormatURI, and pk11uri_Escape (which
// percent-encodes spaces and other chars not in PK11URI_PCHAR).
TEST_F(PK11URIResolutionTest, GetTokenURI) {
  ScopedPK11SlotInfo slot(
      PK11_FindSlotByName("Test PKCS11 Public Certs Token"));
  ASSERT_NE(nullptr, slot.get());

  char* raw = PK11_GetTokenURI(slot.get());
  ASSERT_NE(nullptr, raw);
  EXPECT_EQ(0, strncmp(raw, "pkcs11:", 7));
  EXPECT_NE(nullptr,
            strstr(raw, "token=Test%20PKCS11%20Public%20Certs%20Token"));
  EXPECT_NE(nullptr, strstr(raw, "model=Test%20Model"));
  PORT_Free(raw);
}

// PK11_GetModuleURI builds a pkcs11: URI from the module's library info,
// exercising the library-manufacturer / library-description / library-version
// path attributes.
TEST_F(PK11URIResolutionTest, GetModuleURI) {
  ScopedSECMODModule mod(SECMOD_FindModule("PK11URIResolutionTest"));
  ASSERT_NE(nullptr, mod.get());

  char* raw = PK11_GetModuleURI(mod.get());
  ASSERT_NE(nullptr, raw);
  EXPECT_EQ(0, strncmp(raw, "pkcs11:", 7));
  EXPECT_NE(nullptr,
            strstr(raw, "library-description=Test%20PKCS11%20Library"));
  PORT_Free(raw);
}

// PK11_FindSlotByName dispatches to pk11_FindSlotByTokenURI when the name
// starts with "pkcs11:", exercising pk11_MatchSlotByTokenURI.
TEST_F(PK11URIResolutionTest, FindSlotByTokenURI) {
  ScopedPK11SlotInfo slot(PK11_FindSlotByName(
      "pkcs11:token=Test%20PKCS11%20Public%20Certs%20Token"));
  ASSERT_NE(nullptr, slot.get());
  EXPECT_STREQ("Test PKCS11 Public Certs Token", PK11_GetTokenName(slot.get()));
}

// PK11URI_GetQueryAttribute and PK11URI_GetQueryAttributeItem retrieve named
// query attributes from a parsed URI.  Inserting two query attributes also
// exercises pk11uri_CompareQueryAttributeName.
TEST_F(PK11URIResolutionTest, QueryAttributeAccessors) {
  ScopedPK11URI uri(PK11URI_ParseURI(
      "pkcs11:token=test?pin-value=1234&pin-source=test-source"));
  ASSERT_NE(nullptr, uri.get());

  const char* pin_value = PK11URI_GetQueryAttribute(uri.get(), "pin-value");
  ASSERT_NE(nullptr, pin_value);
  EXPECT_STREQ("1234", pin_value);

  const char* pin_source = PK11URI_GetQueryAttribute(uri.get(), "pin-source");
  ASSERT_NE(nullptr, pin_source);
  EXPECT_STREQ("test-source", pin_source);

  const SECItem* item = PK11URI_GetQueryAttributeItem(uri.get(), "pin-value");
  ASSERT_NE(nullptr, item);
  EXPECT_EQ(4U, item->len);

  EXPECT_EQ(nullptr, PK11URI_GetQueryAttribute(uri.get(), "module-name"));
}

// Unrecognized path attribute names become vendor path attributes (stored in
// vpattrs).  PK11URI_GetPathAttribute finds them by searching vpattrs after
// the named pattrs list — exercising the vpattrs loop in pk11uri_GetAttribute.
TEST_F(PK11URIResolutionTest, VendorPathAttr_ParseAndLookup) {
  ScopedPK11URI uri(PK11URI_ParseURI("pkcs11:token=test;x-vendor=hello"));
  ASSERT_NE(nullptr, uri.get());

  EXPECT_STREQ("test",
               PK11URI_GetPathAttribute(uri.get(), PK11URI_PATTR_TOKEN));
  const char* vendor_val = PK11URI_GetPathAttribute(uri.get(), "x-vendor");
  ASSERT_NE(nullptr, vendor_val);
  EXPECT_STREQ("hello", vendor_val);
}

// PK11URI_CreateURI with vendor path/query attrs and PK11URI_FormatURI cover:
//  - pk11uri_InsertAttributes vendor branch (attrs not in the named list)
//  - pk11uri_GetPathAttribute / GetQueryAttribute vpattrs/vqattrs lookup
//  - PK11URI_FormatURI: named+vendor path separator (";"), query "?" separator,
//    and named+vendor query separator ("&").
TEST_F(PK11URIResolutionTest, CreateAndFormatURI_VendorAndQueryAttrs) {
  const PK11URIAttribute pattrs[] = {
      {PK11URI_PATTR_TOKEN, "mytoken"},
      {"x-pvendor", "pval"},
  };
  const PK11URIAttribute qattrs[] = {
      {PK11URI_QATTR_PIN_VALUE, "1234"},
      {"x-qvendor", "qval"},
  };
  ScopedPK11URI uri(PK11URI_CreateURI(pattrs, 2, qattrs, 2));
  ASSERT_NE(nullptr, uri.get());

  EXPECT_STREQ("mytoken",
               PK11URI_GetPathAttribute(uri.get(), PK11URI_PATTR_TOKEN));
  EXPECT_STREQ("pval", PK11URI_GetPathAttribute(uri.get(), "x-pvendor"));
  EXPECT_STREQ("1234",
               PK11URI_GetQueryAttribute(uri.get(), PK11URI_QATTR_PIN_VALUE));
  EXPECT_STREQ("qval", PK11URI_GetQueryAttribute(uri.get(), "x-qvendor"));

  char* raw = PK11URI_FormatURI(nullptr, uri.get());
  ASSERT_NE(nullptr, raw);
  EXPECT_EQ(0, strncmp(raw, "pkcs11:", 7));
  EXPECT_NE(nullptr, strstr(raw, "token=mytoken"));
  EXPECT_NE(nullptr, strstr(raw, "x-pvendor=pval"));
  EXPECT_NE(nullptr, strstr(raw, "pin-value=1234"));
  EXPECT_NE(nullptr, strstr(raw, "x-qvendor=qval"));
  PORT_Free(raw);
}

// ===========================================================================
// pk11cert.c — additional cert-lookup functions exercised with the test module
// ===========================================================================

// PK11_FindCertFromNickname with "TokenName:CertLabel" format finds the cert
// via the token-search path (find_certs_from_nickname +
// transfer_token_certs_to_collection).
TEST_F(PK11URIResolutionTest, FindCertFromNickname_TokenColonName) {
  ScopedCERTCertificate cert(PK11_FindCertFromNickname(
      "Test PKCS11 Public Certs Token:cert1", nullptr));
  ASSERT_NE(nullptr, cert.get());
  EXPECT_EQ(0, strcmp(cert->nickname, kNickname1));
}

// PK11_FindCertFromNickname with a pkcs11: URI dispatches to
// find_certs_from_uri internally.
TEST_F(PK11URIResolutionTest, FindCertFromNickname_URIDispatch) {
  ScopedCERTCertificate cert(PK11_FindCertFromNickname(
      "pkcs11:id=%00%01%02%03%04%05%06%07%08%09%0a%0b%0c%0d%0e%0f", nullptr));
  ASSERT_NE(nullptr, cert.get());
  EXPECT_EQ(0, strcmp(cert->nickname, kNickname1));
}

// PK11_FindCertsFromNickname with "TokenName:CertLabel" format returns a list.
TEST_F(PK11URIResolutionTest, FindCertsFromNickname_TokenColonName) {
  ScopedCERTCertList certs(PK11_FindCertsFromNickname(
      "Test PKCS11 Public Certs Token:cert1", nullptr));
  ASSERT_NE(nullptr, certs.get());
  EXPECT_GE(CountCerts(certs.get()), 1UL);
  EXPECT_TRUE(HasCertWithNickname(certs.get(), kNickname1));
}

// PK11_ListCertsInSlot enumerates all certs on a slot via
// PK11_TraverseCertsInSlot / listCertsCallback.
TEST_F(PK11URIResolutionTest, ListCertsInSlot_PublicCertsToken) {
  ScopedPK11SlotInfo slot(
      PK11_FindSlotByName("Test PKCS11 Public Certs Token"));
  ASSERT_NE(nullptr, slot.get());

  ScopedCERTCertList certs(PK11_ListCertsInSlot(slot.get()));
  ASSERT_NE(nullptr, certs.get());
  EXPECT_GE(CountCerts(certs.get()), 1UL);
}

// PK11_GetAllSlotsForCert returns a slot list containing the slot on which
// the cert lives.
TEST_F(PK11URIResolutionTest, GetAllSlotsForCert) {
  ScopedCERTCertificate cert(PK11_FindCertFromURI(
      "pkcs11:token=Test%20PKCS11%20Public%20Certs%20Token", nullptr));
  ASSERT_NE(nullptr, cert.get());

  ScopedPK11SlotList slots(PK11_GetAllSlotsForCert(cert.get(), nullptr));
  ASSERT_NE(nullptr, slots.get());
  EXPECT_NE(nullptr, slots->head);
}

// ===========================================================================
// PK11URIResolutionCachedTest — warm-cache tests
//
// These tests exercise the body of transfer_uri_certs_to_collection, which
// is only reached when nssTrustDomain_GetCertsFromCache returns a non-empty
// list.  The SetUp primes the cache; every test below then drives a specific
// branch inside the function, including the memcmp(id->data, ...) that was
// the site of the bug2030570 heap OOB read.
// ===========================================================================

// Cache path: id= matches cert1's CKA_ID — exercises memcmp(id->data, ...)
// returning 0 and adding the cert to the collection.
TEST_F(PK11URIResolutionCachedTest, IdMatch_Cert1) {
  ScopedCERTCertList certs(PK11_FindCertsFromURI(
      "pkcs11:id=%00%01%02%03%04%05%06%07%08%09%0a%0b%0c%0d%0e%0f", nullptr));
  ASSERT_NE(nullptr, certs.get());
  EXPECT_EQ(1UL, CountCerts(certs.get()));
  EXPECT_TRUE(HasCertWithNickname(certs.get(), kNickname1));
}

// Cache path: id= has correct length but wrong bytes — memcmp returns non-zero,
// the cert is skipped via continue, and the token search also misses.
TEST_F(PK11URIResolutionCachedTest, IdMismatch_WrongBytes) {
  ScopedCERTCertList certs(PK11_FindCertsFromURI(
      "pkcs11:id=%aa%bb%cc%dd%ee%ff%aa%bb%cc%dd%ee%ff%aa%bb%cc%dd", nullptr));
  EXPECT_EQ(nullptr, certs.get());
}

// Cache path: id= length differs from cert's CKA_ID size — the length guard
// (id->len != certs[i]->id.size) fires and skips the cert.
TEST_F(PK11URIResolutionCachedTest, IdMismatch_WrongLength) {
  ScopedCERTCertList certs(
      PK11_FindCertsFromURI("pkcs11:id=%00%01%02", nullptr));
  EXPECT_EQ(nullptr, certs.get());
}

// Cache path: no id filter but wrong token= — cert passes id check (no id
// in URI) but fails the token label check inside the token loop → continue.
TEST_F(PK11URIResolutionCachedTest, TokenMismatch) {
  ScopedCERTCertList certs(
      PK11_FindCertsFromURI("pkcs11:token=Wrong%20Token", nullptr));
  EXPECT_EQ(nullptr, certs.get());
}

// Cache path: wrong manufacturer= — cert passes id check but fails the
// manufacturerID comparison → continue.
TEST_F(PK11URIResolutionCachedTest, ManufacturerMismatch) {
  ScopedCERTCertList certs(PK11_FindCertsFromURI(
      "pkcs11:manufacturer=No%20Such%20Manufacturer", nullptr));
  EXPECT_EQ(nullptr, certs.get());
}

// Cache path: wrong model= — cert passes id and manufacturer checks but fails
// the model comparison → continue.
TEST_F(PK11URIResolutionCachedTest, ModelMismatch) {
  ScopedCERTCertList certs(
      PK11_FindCertsFromURI("pkcs11:model=No%20Such%20Model", nullptr));
  EXPECT_EQ(nullptr, certs.get());
}

// Cache path: wrong serial= — cert passes id/manufacturer/model checks but
// fails the serialNumber comparison → continue.
TEST_F(PK11URIResolutionCachedTest, SerialMismatch) {
  ScopedCERTCertList certs(PK11_FindCertsFromURI(
      "pkcs11:serial=FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF", nullptr));
  EXPECT_EQ(nullptr, certs.get());
}

// Cache path: correct token= — the cached cert passes all filters and is
// added to the collection (exercises the nssPKIObjectCollection_AddObject /
// break path).
TEST_F(PK11URIResolutionCachedTest, TokenMatch) {
  ScopedCERTCertList certs(PK11_FindCertsFromURI(
      "pkcs11:token=Test%20PKCS11%20Public%20Certs%20Token", nullptr));
  ASSERT_NE(nullptr, certs.get());
  EXPECT_EQ(1UL, CountCerts(certs.get()));
  EXPECT_TRUE(HasCertWithNickname(certs.get(), kNickname1) ||
              HasCertWithNickname(certs.get(), kNickname2));
}

// PK11_TraverseSlotCerts traverses certs registered in the trust-domain cache,
// calling convert_cert → fake_der_cb → user callback for each entry.
// prime_ ensures cert1 is in the cache when this runs.
TEST_F(PK11URIResolutionCachedTest, TraverseSlotCerts_Count) {
  int count = 0;
  SECStatus rv = PK11_TraverseSlotCerts(
      [](CERTCertificate* cert, SECItem* der, void* arg) -> SECStatus {
        (*static_cast<int*>(arg))++;
        return SECSuccess;
      },
      &count, nullptr);
  EXPECT_EQ(SECSuccess, rv);
  EXPECT_GE(count, 1);
}

// PK11_FindCertsFromEmailAddress exercises PK11_TraverseSlotCerts +
// FindCertsEmailCallback.  The test-module certs carry no email address so
// FindCertsEmailCallback takes the early-return (cert_email == NULL) branch
// and the result is an empty / NULL list.
TEST_F(PK11URIResolutionCachedTest, FindCertsFromEmailAddress_NoEmail) {
  ScopedCERTCertList certs(
      PK11_FindCertsFromEmailAddress("nobody@example.com", nullptr));
  EXPECT_EQ(nullptr, certs.get());
}

// PK11_ListCerts enumerates certs registered in the trust-domain issuerAndSN
// hash via NSSTrustDomain_TraverseCertificates + pk11ListCertCallback.
// prime_ in SetUp ensures cert1 is present in the hash.
TEST_F(PK11URIResolutionCachedTest, ListCerts_AllCerts) {
  ScopedCERTCertList certs(PK11_ListCerts(PK11CertListAll, nullptr));
  ASSERT_NE(nullptr, certs.get());
  EXPECT_GE(CountCerts(certs.get()), 1UL);
}

// PK11_ListCerts with PK11CertListUnique exercises the isUnique=PR_TRUE branch
// inside pk11ListCertCallback (CERT_DupCertificate +
// STAN_GetCERTCertificateName
// + slot-based tail/head insertion).
TEST_F(PK11URIResolutionCachedTest, ListCerts_Unique) {
  ScopedCERTCertList certs(PK11_ListCerts(PK11CertListUnique, nullptr));
  ASSERT_NE(nullptr, certs.get());
  EXPECT_GE(CountCerts(certs.get()), 1UL);
}

// With a warm cache, PK11_FindCertsFromNickname("Token:label") hits the body of
// transfer_token_certs_to_collection (count > 0 path) because cert1 is already
// in the nickname cache under "cert1" from the prime_ call in SetUp.
TEST_F(PK11URIResolutionCachedTest, FindCertsFromNickname_CachedByLabel) {
  ScopedCERTCertList certs(PK11_FindCertsFromNickname(
      "Test PKCS11 Public Certs Token:cert1", nullptr));
  ASSERT_NE(nullptr, certs.get());
  EXPECT_GE(CountCerts(certs.get()), 1UL);
}

// ===========================================================================
// PK11URIResolutionTest — additional pk11cert.c function coverage
// ===========================================================================

// PK11_FindCertByIssuerAndSN locates a cert by its DER issuer and serial
// number.  issuerSN is populated from a cert we already hold.
TEST_F(PK11URIResolutionTest, FindCertByIssuerAndSN) {
  ScopedCERTCertificate found(PK11_FindCertFromNickname(
      "Test PKCS11 Public Certs Token:cert1", nullptr));
  ASSERT_NE(nullptr, found.get());

  CERTIssuerAndSN issuerAndSN = {};
  issuerAndSN.derIssuer = found->derIssuer;
  issuerAndSN.serialNumber = found->serialNumber;

  PK11SlotInfo* slot = nullptr;
  ScopedCERTCertificate cert(
      PK11_FindCertByIssuerAndSN(&slot, &issuerAndSN, nullptr));
  if (slot) PK11_FreeSlot(slot);
  ASSERT_NE(nullptr, cert.get());
}

// PK11_FindObjectForCert returns the CK_OBJECT_HANDLE for a cert and fills in
// *pSlot with the owning token's slot.
TEST_F(PK11URIResolutionTest, FindObjectForCert) {
  ScopedCERTCertificate cert(PK11_FindCertFromNickname(
      "Test PKCS11 Public Certs Token:cert1", nullptr));
  ASSERT_NE(nullptr, cert.get());

  PK11SlotInfo* pSlot = nullptr;
  CK_OBJECT_HANDLE h = PK11_FindObjectForCert(cert.get(), nullptr, &pSlot);
  if (pSlot) PK11_FreeSlot(pSlot);
  EXPECT_NE(static_cast<CK_OBJECT_HANDLE>(CK_INVALID_HANDLE), h);
}

// PK11_FindEncodedCertInSlot searches a slot for a cert matching the given DER.
TEST_F(PK11URIResolutionTest, FindEncodedCertInSlot) {
  ScopedPK11SlotInfo slot(
      PK11_FindSlotByName("Test PKCS11 Public Certs Token"));
  ASSERT_NE(nullptr, slot.get());

  ScopedCERTCertificate cert(PK11_FindCertFromNickname(
      "Test PKCS11 Public Certs Token:cert1", nullptr));
  ASSERT_NE(nullptr, cert.get());

  CK_OBJECT_HANDLE h =
      PK11_FindEncodedCertInSlot(slot.get(), &cert->derCert, nullptr);
  EXPECT_NE(static_cast<CK_OBJECT_HANDLE>(CK_INVALID_HANDLE), h);
}

// PK11_FindCertInSlot finds the PKCS#11 object handle for a cert in a given
// slot, going through the series-check path when cert->slot matches.
TEST_F(PK11URIResolutionTest, FindCertInSlot) {
  ScopedPK11SlotInfo slot(
      PK11_FindSlotByName("Test PKCS11 Public Certs Token"));
  ASSERT_NE(nullptr, slot.get());

  ScopedCERTCertificate cert(PK11_FindCertFromNickname(
      "Test PKCS11 Public Certs Token:cert1", nullptr));
  ASSERT_NE(nullptr, cert.get());

  CK_OBJECT_HANDLE h = PK11_FindCertInSlot(slot.get(), cert.get(), nullptr);
  EXPECT_NE(static_cast<CK_OBJECT_HANDLE>(CK_INVALID_HANDLE), h);
}

// PK11_GetLowLevelKeyIDForCert with slot=NULL resolves the slot internally
// via PK11_FindObjectForCert.
TEST_F(PK11URIResolutionTest, GetLowLevelKeyIDForCert) {
  ScopedCERTCertificate cert(PK11_FindCertFromNickname(
      "Test PKCS11 Public Certs Token:cert1", nullptr));
  ASSERT_NE(nullptr, cert.get());

  ScopedSECItem item(
      PK11_GetLowLevelKeyIDForCert(nullptr, cert.get(), nullptr));
  ASSERT_NE(nullptr, item.get());
  EXPECT_GT(item->len, 0U);
}

// PK11_TraverseCertsForSubjectInSlot narrows the traversal to one slot.
TEST_F(PK11URIResolutionTest, TraverseCertsForSubjectInSlot) {
  ScopedPK11SlotInfo slot(
      PK11_FindSlotByName("Test PKCS11 Public Certs Token"));
  ASSERT_NE(nullptr, slot.get());

  ScopedCERTCertificate cert(PK11_FindCertFromNickname(
      "Test PKCS11 Public Certs Token:cert1", nullptr));
  ASSERT_NE(nullptr, cert.get());

  int count = 0;
  SECStatus rv = PK11_TraverseCertsForSubjectInSlot(
      cert.get(), slot.get(),
      [](CERTCertificate*, void* arg) -> SECStatus {
        (*static_cast<int*>(arg))++;
        return SECSuccess;
      },
      &count);
  EXPECT_EQ(SECSuccess, rv);
  EXPECT_GT(count, 0);
}

// PK11_FindCertsFromNickname with no ':' exercises the else path inside
// find_certs_from_nickname: slot = PK11_GetInternalKeySlot().  The cert is not
// in the internal token, so the result is null — but the path is covered.
TEST_F(PK11URIResolutionTest, FindCertsFromNickname_SimpleName) {
  ScopedCERTCertList certs(PK11_FindCertsFromNickname("cert1", nullptr));
  EXPECT_EQ(nullptr, certs.get());
}

// PK11_FindCertsFromNickname with a "pkcs11:..." nickname that matches no
// cert exercises the URI-then-colon-split fallthrough: find_certs_from_uri
// returns NULL, the code falls through, splits on ':', looks for a token
// named "pkcs11" (none exists), and returns null.
TEST_F(PK11URIResolutionTest, FindCertsFromNickname_URIFallthrough) {
  ScopedCERTCertList certs(
      PK11_FindCertsFromNickname("pkcs11:id=%ff%ff%ff", nullptr));
  EXPECT_EQ(nullptr, certs.get());
}

// PK11_TraverseCertsForNicknameInSlot traverses by CKA_LABEL within a slot.
// Passing the label without a null terminator exercises the nssUTF8_Create
// copy path (nickname->data[len-1] != '\0').
TEST_F(PK11URIResolutionTest, TraverseCertsForNicknameInSlot) {
  ScopedPK11SlotInfo slot(
      PK11_FindSlotByName("Test PKCS11 Public Certs Token"));
  ASSERT_NE(nullptr, slot.get());

  unsigned char label[] = {'c', 'e', 'r', 't', '1'};
  SECItem nickname = {siBuffer, label, sizeof(label)};

  int count = 0;
  SECStatus rv = PK11_TraverseCertsForNicknameInSlot(
      &nickname, slot.get(),
      [](CERTCertificate*, void* arg) -> SECStatus {
        (*static_cast<int*>(arg))++;
        return SECSuccess;
      },
      &count);
  EXPECT_EQ(SECSuccess, rv);
  EXPECT_GT(count, 0);
}

}  // namespace nss_test
