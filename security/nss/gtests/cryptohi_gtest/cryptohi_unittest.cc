/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <string>

#if defined(__LP64__) || defined(_WIN64)
#define NSS_TEST_HAVE_LARGE_VA 1
#if defined(_WIN32)
#include <windows.h>
#else
#include <sys/mman.h>
#endif
#endif

#include "gtest/gtest.h"

#include "nss_scoped_ptrs.h"
#include "cryptohi.h"
#include "keyt.h"
#include "keyhi.h"
#include "secitem.h"
#include "secerr.h"

namespace nss_test {

class SignParamsTestF : public ::testing::Test {
 protected:
  ScopedPLArenaPool arena_;
  ScopedSECKEYPrivateKey privk_;
  ScopedSECKEYPublicKey pubk_;
  ScopedSECKEYPrivateKey ecPrivk_;
  ScopedSECKEYPublicKey ecPubk_;

  void SetUp() {
    arena_.reset(PORT_NewArena(2048));

    SECKEYPublicKey *pubk;
    SECKEYPrivateKey *privk = SECKEY_CreateRSAPrivateKey(1024, &pubk, NULL);
    ASSERT_NE(nullptr, pubk);
    pubk_.reset(pubk);
    ASSERT_NE(nullptr, privk);
    privk_.reset(privk);

    SECKEYECParams ecParams = {siBuffer, NULL, 0};
    SECOidData *oidData;
    oidData = SECOID_FindOIDByTag(SEC_OID_CURVE25519);
    ASSERT_NE(nullptr, oidData);
    ASSERT_NE(nullptr,
              SECITEM_AllocItem(NULL, &ecParams, (2 + oidData->oid.len)))
        << "Couldn't allocate memory for OID.";
    ecParams.data[0] = SEC_ASN1_OBJECT_ID; /* we have to prepend 0x06 */
    ecParams.data[1] = oidData->oid.len;
    memcpy(ecParams.data + 2, oidData->oid.data, oidData->oid.len);
    SECKEYPublicKey *ecPubk;
    SECKEYPrivateKey *ecPrivk =
        SECKEY_CreateECPrivateKey(&ecParams, &ecPubk, NULL);
    SECITEM_FreeItem(&ecParams, PR_FALSE);
    ASSERT_NE(nullptr, ecPubk);
    ecPubk_.reset(ecPubk);
    ASSERT_NE(nullptr, ecPrivk);
    ecPrivk_.reset(ecPrivk);
  }

  void CreatePssParams(SECKEYRSAPSSParams *params, SECOidTag hashAlgTag) {
    PORT_Memset(params, 0, sizeof(SECKEYRSAPSSParams));

    params->hashAlg = (SECAlgorithmID *)PORT_ArenaZAlloc(
        arena_.get(), sizeof(SECAlgorithmID));
    ASSERT_NE(nullptr, params->hashAlg);
    SECStatus rv =
        SECOID_SetAlgorithmID(arena_.get(), params->hashAlg, hashAlgTag, NULL);
    ASSERT_EQ(SECSuccess, rv);
  }

  void CreatePssParams(SECKEYRSAPSSParams *params, SECOidTag hashAlgTag,
                       SECOidTag maskHashAlgTag) {
    CreatePssParams(params, hashAlgTag);

    SECAlgorithmID maskHashAlg;
    PORT_Memset(&maskHashAlg, 0, sizeof(maskHashAlg));
    SECStatus rv =
        SECOID_SetAlgorithmID(arena_.get(), &maskHashAlg, maskHashAlgTag, NULL);
    ASSERT_EQ(SECSuccess, rv);

    SECItem *maskHashAlgItem =
        SEC_ASN1EncodeItem(arena_.get(), NULL, &maskHashAlg,
                           SEC_ASN1_GET(SECOID_AlgorithmIDTemplate));

    params->maskAlg = (SECAlgorithmID *)PORT_ArenaZAlloc(
        arena_.get(), sizeof(SECAlgorithmID));
    ASSERT_NE(nullptr, params->maskAlg);

    rv = SECOID_SetAlgorithmID(arena_.get(), params->maskAlg,
                               SEC_OID_PKCS1_MGF1, maskHashAlgItem);
    ASSERT_EQ(SECSuccess, rv);
  }

  void CreatePssParams(SECKEYRSAPSSParams *params, SECOidTag hashAlgTag,
                       SECOidTag maskHashAlgTag, unsigned long saltLength) {
    CreatePssParams(params, hashAlgTag, maskHashAlgTag);

    SECItem *saltLengthItem =
        SEC_ASN1EncodeInteger(arena_.get(), &params->saltLength, saltLength);
    ASSERT_EQ(&params->saltLength, saltLengthItem);
  }

  void CheckHashAlg(SECKEYRSAPSSParams *params, SECOidTag hashAlgTag) {
    // If hash algorithm is SHA-1, it must be omitted in the parameters
    if (hashAlgTag == SEC_OID_SHA1) {
      EXPECT_EQ(nullptr, params->hashAlg);
    } else {
      EXPECT_NE(nullptr, params->hashAlg);
      EXPECT_EQ(hashAlgTag, SECOID_GetAlgorithmTag(params->hashAlg));
    }
  }

  void CheckMaskAlg(SECKEYRSAPSSParams *params, SECOidTag hashAlgTag) {
    SECStatus rv;

    // If hash algorithm is SHA-1, it must be omitted in the parameters
    if (hashAlgTag == SEC_OID_SHA1)
      EXPECT_EQ(nullptr, params->hashAlg);
    else {
      EXPECT_NE(nullptr, params->maskAlg);
      EXPECT_EQ(SEC_OID_PKCS1_MGF1, SECOID_GetAlgorithmTag(params->maskAlg));

      SECAlgorithmID hashAlg;
      rv = SEC_QuickDERDecodeItem(arena_.get(), &hashAlg,
                                  SEC_ASN1_GET(SECOID_AlgorithmIDTemplate),
                                  &params->maskAlg->parameters);
      ASSERT_EQ(SECSuccess, rv);

      EXPECT_EQ(hashAlgTag, SECOID_GetAlgorithmTag(&hashAlg));
    }
  }

  void CheckSaltLength(SECKEYRSAPSSParams *params, SECOidTag hashAlg) {
    // If the salt length parameter is missing, that means it is 20 (default)
    if (!params->saltLength.data) {
      return;
    }

    unsigned long value;
    SECStatus rv = SEC_ASN1DecodeInteger(&params->saltLength, &value);
    ASSERT_EQ(SECSuccess, rv);

    // The salt length are usually the same as the hash length,
    // except for the case where the hash length exceeds the limit
    // set by the key length
    switch (hashAlg) {
      case SEC_OID_SHA1:
        EXPECT_EQ(20UL, value);
        break;
      case SEC_OID_SHA224:
        EXPECT_EQ(28UL, value);
        break;
      case SEC_OID_SHA256:
        EXPECT_EQ(32UL, value);
        break;
      case SEC_OID_SHA384:
        EXPECT_EQ(48UL, value);
        break;
      case SEC_OID_SHA512:
        // Truncated from 64, because our private key is 1024-bit
        EXPECT_EQ(62UL, value);
        break;
      default:
        FAIL();
    }
  }
};

class SignParamsTest
    : public SignParamsTestF,
      public ::testing::WithParamInterface<std::tuple<SECOidTag, SECOidTag>> {};

class SignParamsSourceTest : public SignParamsTestF,
                             public ::testing::WithParamInterface<SECOidTag> {};

TEST_P(SignParamsTest, CreateRsa) {
  SECOidTag hashAlg = std::get<0>(GetParam());
  SECOidTag srcHashAlg = std::get<1>(GetParam());

  SECItem *srcParams;
  if (srcHashAlg != SEC_OID_UNKNOWN) {
    SECKEYRSAPSSParams pssParams;
    ASSERT_NO_FATAL_FAILURE(
        CreatePssParams(&pssParams, srcHashAlg, srcHashAlg));
    srcParams = SEC_ASN1EncodeItem(arena_.get(), nullptr, &pssParams,
                                   SEC_ASN1_GET(SECKEY_RSAPSSParamsTemplate));
    ASSERT_NE(nullptr, srcParams);
  } else {
    srcParams = NULL;
  }

  SECItem *params = SEC_CreateSignatureAlgorithmParameters(
      arena_.get(), nullptr, SEC_OID_PKCS1_RSA_ENCRYPTION, hashAlg, srcParams,
      privk_.get());

  // PKCS#1 RSA actually doesn't take any parameters, but if it is
  // given, return a copy of it
  if (srcHashAlg != SEC_OID_UNKNOWN) {
    EXPECT_EQ(srcParams->len, params->len);
    EXPECT_EQ(0, memcmp(params->data, srcParams->data, srcParams->len));
  } else {
    EXPECT_EQ(nullptr, params);
  }
}

TEST_P(SignParamsTest, CreateRsaPss) {
  SECOidTag hashAlg = std::get<0>(GetParam());
  SECOidTag srcHashAlg = std::get<1>(GetParam());

  SECItem *srcParams;
  if (srcHashAlg != SEC_OID_UNKNOWN) {
    SECKEYRSAPSSParams pssParams;
    ASSERT_NO_FATAL_FAILURE(
        CreatePssParams(&pssParams, srcHashAlg, srcHashAlg));
    srcParams = SEC_ASN1EncodeItem(arena_.get(), nullptr, &pssParams,
                                   SEC_ASN1_GET(SECKEY_RSAPSSParamsTemplate));
    ASSERT_NE(nullptr, srcParams);
  } else {
    srcParams = NULL;
  }

  SECItem *params = SEC_CreateSignatureAlgorithmParameters(
      arena_.get(), nullptr, SEC_OID_PKCS1_RSA_PSS_SIGNATURE, hashAlg,
      srcParams, privk_.get());

  if (hashAlg != SEC_OID_UNKNOWN && srcHashAlg != SEC_OID_UNKNOWN &&
      hashAlg != srcHashAlg) {
    EXPECT_EQ(nullptr, params);
    return;
  }

  EXPECT_NE(nullptr, params);

  SECKEYRSAPSSParams pssParams;
  PORT_Memset(&pssParams, 0, sizeof(pssParams));
  SECStatus rv =
      SEC_QuickDERDecodeItem(arena_.get(), &pssParams,
                             SEC_ASN1_GET(SECKEY_RSAPSSParamsTemplate), params);
  ASSERT_EQ(SECSuccess, rv);

  if (hashAlg == SEC_OID_UNKNOWN) {
    if (!pssParams.hashAlg) {
      hashAlg = SEC_OID_SHA1;
    } else {
      hashAlg = SECOID_GetAlgorithmTag(pssParams.hashAlg);
    }

    if (srcHashAlg == SEC_OID_UNKNOWN) {
      // If both hashAlg and srcHashAlg is unset, NSS will decide the hash
      // algorithm based on the key length; in this case it's SHA256
      EXPECT_EQ(SEC_OID_SHA256, hashAlg);
    } else {
      EXPECT_EQ(srcHashAlg, hashAlg);
    }
  }

  ASSERT_NO_FATAL_FAILURE(CheckHashAlg(&pssParams, hashAlg));
  ASSERT_NO_FATAL_FAILURE(CheckMaskAlg(&pssParams, hashAlg));
  ASSERT_NO_FATAL_FAILURE(CheckSaltLength(&pssParams, hashAlg));

  // The default trailer field (1) must be omitted
  EXPECT_EQ(nullptr, pssParams.trailerField.data);
}

TEST_P(SignParamsTest, CreateRsaPssWithECPrivateKey) {
  SECOidTag hashAlg = std::get<0>(GetParam());
  SECOidTag srcHashAlg = std::get<1>(GetParam());

  SECItem *srcParams;
  if (srcHashAlg != SEC_OID_UNKNOWN) {
    SECKEYRSAPSSParams pssParams;
    ASSERT_NO_FATAL_FAILURE(
        CreatePssParams(&pssParams, srcHashAlg, srcHashAlg));
    srcParams = SEC_ASN1EncodeItem(arena_.get(), nullptr, &pssParams,
                                   SEC_ASN1_GET(SECKEY_RSAPSSParamsTemplate));
    ASSERT_NE(nullptr, srcParams);
  } else {
    srcParams = NULL;
  }

  SECItem *params = SEC_CreateSignatureAlgorithmParameters(
      arena_.get(), nullptr, SEC_OID_PKCS1_RSA_PSS_SIGNATURE, hashAlg,
      srcParams, ecPrivk_.get());

  EXPECT_EQ(nullptr, params);
}

TEST_P(SignParamsTest, CreateRsaPssWithInvalidHashAlg) {
  SECOidTag srcHashAlg = std::get<1>(GetParam());

  SECItem *srcParams;
  if (srcHashAlg != SEC_OID_UNKNOWN) {
    SECKEYRSAPSSParams pssParams;
    ASSERT_NO_FATAL_FAILURE(
        CreatePssParams(&pssParams, srcHashAlg, srcHashAlg));
    srcParams = SEC_ASN1EncodeItem(arena_.get(), nullptr, &pssParams,
                                   SEC_ASN1_GET(SECKEY_RSAPSSParamsTemplate));
    ASSERT_NE(nullptr, srcParams);
  } else {
    srcParams = NULL;
  }

  SECItem *params = SEC_CreateSignatureAlgorithmParameters(
      arena_.get(), nullptr, SEC_OID_PKCS1_RSA_PSS_SIGNATURE, SEC_OID_MD5,
      srcParams, privk_.get());

  EXPECT_EQ(nullptr, params);
}

TEST_P(SignParamsSourceTest, CreateRsaPssWithInvalidHashAlg) {
  SECOidTag hashAlg = GetParam();

  SECItem *srcParams;
  SECKEYRSAPSSParams pssParams;
  ASSERT_NO_FATAL_FAILURE(
      CreatePssParams(&pssParams, SEC_OID_MD5, SEC_OID_MD5));
  srcParams = SEC_ASN1EncodeItem(arena_.get(), nullptr, &pssParams,
                                 SEC_ASN1_GET(SECKEY_RSAPSSParamsTemplate));
  ASSERT_NE(nullptr, srcParams);

  SECItem *params = SEC_CreateSignatureAlgorithmParameters(
      arena_.get(), nullptr, SEC_OID_PKCS1_RSA_PSS_SIGNATURE, hashAlg,
      srcParams, privk_.get());

  EXPECT_EQ(nullptr, params);
}

TEST_P(SignParamsSourceTest, CreateRsaPssWithInvalidSaltLength) {
  SECOidTag hashAlg = GetParam();

  SECItem *srcParams;
  SECKEYRSAPSSParams pssParams;
  ASSERT_NO_FATAL_FAILURE(
      CreatePssParams(&pssParams, SEC_OID_SHA512, SEC_OID_SHA512, 100));
  srcParams = SEC_ASN1EncodeItem(arena_.get(), nullptr, &pssParams,
                                 SEC_ASN1_GET(SECKEY_RSAPSSParamsTemplate));
  ASSERT_NE(nullptr, srcParams);

  SECItem *params = SEC_CreateSignatureAlgorithmParameters(
      arena_.get(), nullptr, SEC_OID_PKCS1_RSA_PSS_SIGNATURE, hashAlg,
      srcParams, privk_.get());

  EXPECT_EQ(nullptr, params);
}

TEST_P(SignParamsSourceTest, CreateRsaPssWithHashMismatch) {
  SECOidTag hashAlg = GetParam();

  SECItem *srcParams;
  SECKEYRSAPSSParams pssParams;
  ASSERT_NO_FATAL_FAILURE(
      CreatePssParams(&pssParams, SEC_OID_SHA256, SEC_OID_SHA512));
  srcParams = SEC_ASN1EncodeItem(arena_.get(), nullptr, &pssParams,
                                 SEC_ASN1_GET(SECKEY_RSAPSSParamsTemplate));
  ASSERT_NE(nullptr, srcParams);

  SECItem *params = SEC_CreateSignatureAlgorithmParameters(
      arena_.get(), nullptr, SEC_OID_PKCS1_RSA_PSS_SIGNATURE, hashAlg,
      srcParams, privk_.get());

  EXPECT_EQ(nullptr, params);
}

INSTANTIATE_TEST_SUITE_P(
    SignParamsTestCases, SignParamsTest,
    ::testing::Combine(::testing::Values(SEC_OID_UNKNOWN, SEC_OID_SHA1,
                                         SEC_OID_SHA224, SEC_OID_SHA256,
                                         SEC_OID_SHA384, SEC_OID_SHA512),
                       ::testing::Values(SEC_OID_UNKNOWN, SEC_OID_SHA1,
                                         SEC_OID_SHA224, SEC_OID_SHA256,
                                         SEC_OID_SHA384, SEC_OID_SHA512)));

INSTANTIATE_TEST_SUITE_P(SignParamsSourceTestCases, SignParamsSourceTest,
                         ::testing::Values(SEC_OID_UNKNOWN, SEC_OID_SHA1,
                                           SEC_OID_SHA224, SEC_OID_SHA256,
                                           SEC_OID_SHA384, SEC_OID_SHA512));

#ifdef NSS_TEST_HAVE_LARGE_VA
// Bug 2027345: chosen so (dst_len - kOversizedLen) wraps to a positive int32.
static const size_t kOversizedLen = 0x80000021UL;

// Reserve `size` bytes of virtual address space.  Touched pages are committed
// lazily (POSIX) or explicitly via CommitTouchedRange (Windows), so untouched
// regions consume no backing memory.  Returns nullptr on failure.
static unsigned char *ReserveSparseRange(size_t size) {
#if defined(_WIN32)
  return static_cast<unsigned char *>(
      VirtualAlloc(nullptr, size, MEM_RESERVE, PAGE_NOACCESS));
#else
  int flags = MAP_PRIVATE | MAP_ANONYMOUS;
#ifdef MAP_NORESERVE
  flags |= MAP_NORESERVE;
#endif
  void *p = mmap(nullptr, size, PROT_READ | PROT_WRITE, flags, -1, 0);
  return p == MAP_FAILED ? nullptr : static_cast<unsigned char *>(p);
#endif
}

// Ensure the pages covering [offset, offset + len) of a region returned by
// ReserveSparseRange are readable and writable.  No-op on POSIX, where
// anonymous mappings are demand-paged automatically.  Returns true on success.
static bool CommitTouchedRange(unsigned char *base, size_t offset, size_t len) {
#if defined(_WIN32)
  SYSTEM_INFO si;
  GetSystemInfo(&si);
  size_t page = si.dwPageSize;
  size_t start = offset & ~(page - 1);
  size_t end = (offset + len + page - 1) & ~(page - 1);
  return VirtualAlloc(base + start, end - start, MEM_COMMIT, PAGE_READWRITE) !=
         nullptr;
#else
  (void)base;
  (void)offset;
  (void)len;
  return true;
#endif
}

static void ReleaseSparseRange(unsigned char *base, size_t size) {
#if defined(_WIN32)
  (void)size;
  VirtualFree(base, 0, MEM_RELEASE);
#else
  munmap(base, size);
#endif
}

// Build a DER SEQUENCE { INTEGER big, INTEGER 01 } (or reversed) in a sparse
// virtual address reservation -- only the touched header bytes and the tail
// small-INTEGER bytes are backed by physical memory; the kOversizedLen-byte
// big-INTEGER content body is never read or written by QuickDER (the parser
// only does pointer arithmetic across it).  Sets *item and *total_out; caller
// must call ReleaseSparseRange on success.  Returns nullptr on failure.
static unsigned char *MakeOversizedDerSig(bool oversized_r, SECItem *item,
                                          size_t *total_out) {
  static const size_t kBigHdr = 6;    // tag(1) + 0x84(1) + 4-byte length
  static const size_t kSmallTlv = 3;  // 02 01 01

  size_t seq_content = kBigHdr + kOversizedLen + kSmallTlv;
  size_t total = 6 + seq_content;  // SEQUENCE header + content
  *total_out = total;

  unsigned char *buf = ReserveSparseRange(total);
  if (buf == nullptr) return nullptr;

  // The leading header region is touched by every test; commit a small chunk
  // covering SEQUENCE + first INTEGER's header and content[0].
  if (!CommitTouchedRange(buf, 0, 64)) {
    ReleaseSparseRange(buf, total);
    return nullptr;
  }

  size_t i = 0;
  buf[i++] = 0x30;  // SEQUENCE
  buf[i++] = 0x84;  // long-form, 4 length bytes follow
  buf[i++] = (seq_content >> 24) & 0xFF;
  buf[i++] = (seq_content >> 16) & 0xFF;
  buf[i++] = (seq_content >> 8) & 0xFF;
  buf[i++] = seq_content & 0xFF;

  auto write_big_at = [&](size_t pos) {
    buf[pos++] = 0x02;  // INTEGER
    buf[pos++] = 0x84;  // long-form, 4 length bytes follow
    buf[pos++] = (kOversizedLen >> 24) & 0xFF;
    buf[pos++] = (kOversizedLen >> 16) & 0xFF;
    buf[pos++] = (kOversizedLen >> 8) & 0xFF;
    buf[pos++] = kOversizedLen & 0xFF;
    // Non-zero so QuickDER's leading-zero strip leaves sig.r.len/sig.s.len
    // at kOversizedLen.  Subsequent content bytes are never read.
    buf[pos] = 0x80;
  };
  auto write_small_at = [&](size_t pos) {
    buf[pos++] = 0x02;
    buf[pos++] = 0x01;
    buf[pos++] = 0x01;
  };

  if (oversized_r) {
    write_big_at(i);
    size_t small_off = i + kBigHdr + kOversizedLen;
    if (!CommitTouchedRange(buf, small_off, kSmallTlv)) {
      ReleaseSparseRange(buf, total);
      return nullptr;
    }
    write_small_at(small_off);
  } else {
    write_small_at(i);
    write_big_at(i + kSmallTlv);
  }

  item->type = siBuffer;
  item->data = buf;
  item->len = static_cast<unsigned int>(total);
  return buf;
}

TEST(DSAUTest, DecodeDerSigOversizedRRejected) {
  SECItem item = {};
  size_t total;
  unsigned char *buf = MakeOversizedDerSig(/*oversized_r=*/true, &item, &total);
  ASSERT_NE(nullptr, buf);
  ScopedSECItem result(DSAU_DecodeDerSig(&item));
  ReleaseSparseRange(buf, total);
  EXPECT_EQ(nullptr, result.get());
}

TEST(DSAUTest, DecodeDerSigOversizedSRejected) {
  SECItem item = {};
  size_t total;
  unsigned char *buf =
      MakeOversizedDerSig(/*oversized_r=*/false, &item, &total);
  ASSERT_NE(nullptr, buf);
  ScopedSECItem result(DSAU_DecodeDerSig(&item));
  ReleaseSparseRange(buf, total);
  EXPECT_EQ(nullptr, result.get());
}

TEST(DSAUTest, VfyVerifyDataDirectOversizedSigRejected) {
  SECKEYECParams ecParams = {siBuffer, nullptr, 0};
  SECOidData *oidData = SECOID_FindOIDByTag(SEC_OID_ANSIX962_EC_PRIME256V1);
  ASSERT_NE(nullptr, oidData);
  ASSERT_NE(nullptr,
            SECITEM_AllocItem(nullptr, &ecParams, 2 + oidData->oid.len));
  ecParams.data[0] = SEC_ASN1_OBJECT_ID;
  ecParams.data[1] = static_cast<unsigned char>(oidData->oid.len);
  memcpy(ecParams.data + 2, oidData->oid.data, oidData->oid.len);

  SECKEYPublicKey *pubk = nullptr;
  ScopedSECKEYPrivateKey privk(
      SECKEY_CreateECPrivateKey(&ecParams, &pubk, nullptr));
  SECITEM_FreeItem(&ecParams, PR_FALSE);
  ScopedSECKEYPublicKey pubKey(pubk);
  ASSERT_NE(nullptr, privk.get());
  ASSERT_NE(nullptr, pubKey.get());

  SECItem sig = {};
  size_t total;
  unsigned char *buf = MakeOversizedDerSig(/*oversized_r=*/true, &sig, &total);
  ASSERT_NE(nullptr, buf);
  const unsigned char data[] = "hello";
  SECStatus rv = VFY_VerifyDataDirect(data, sizeof(data), pubKey.get(), &sig,
                                      SEC_OID_ANSIX962_EC_PUBLIC_KEY,
                                      SEC_OID_SHA256, nullptr, nullptr);
  ReleaseSparseRange(buf, total);
  EXPECT_EQ(SECFailure, rv);
}
#endif  // NSS_TEST_HAVE_LARGE_VA

}  // namespace nss_test
