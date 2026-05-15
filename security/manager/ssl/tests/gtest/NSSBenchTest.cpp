/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <string>

#include "gtest/gtest.h"
#include "gtest/MozGTestBench.h"  // For MOZ_GTEST_BENCH
#include "nss.h"
#include "ScopedNSSTypes.h"

namespace nss_test {

#define WARMUP (0ull)
#define KILOBYTE (1'024ull)
#define MEGABYTE (KILOBYTE * KILOBYTE)

template <CK_MECHANISM_TYPE MECH>
class SymmetricKeyTest : public testing::Test {
 protected:
  mozilla::UniquePK11SymKey sym_key;

  void SetUp() override {
    if (!NSS_IsInitialized()) {
      ASSERT_EQ(NSS_NoDB_Init(nullptr), SECSuccess);
    }

    mozilla::UniquePK11SlotInfo slot(PK11_GetInternalSlot());
    ASSERT_TRUE(!!slot);

    sym_key = mozilla::UniquePK11SymKey(
        PK11_KeyGen(slot.get(), MECH, nullptr, 16, nullptr));
    ASSERT_TRUE(!!sym_key);
  }
};

template <CK_MECHANISM_TYPE TYPE>
class KeyPairTest : public testing::Test {
 protected:
  mozilla::UniqueSECKEYPrivateKey priv_key;
  mozilla::UniqueSECKEYPublicKey pub_key;

  virtual void* MakeParams() = 0;

  void SetUp() override {
    if (!NSS_IsInitialized()) {
      ASSERT_EQ(NSS_NoDB_Init(nullptr), SECSuccess);
    }

    mozilla::UniquePK11SlotInfo slot(PK11_GetInternalSlot());
    ASSERT_TRUE(!!slot);

    priv_key = mozilla::UniqueSECKEYPrivateKey(PK11_GenerateKeyPair(
        slot.get(), TYPE, MakeParams(), TempPtrToSetter(&pub_key), PR_FALSE,
        PR_TRUE, nullptr));

    ASSERT_TRUE(!!priv_key);
    ASSERT_TRUE(!!pub_key);
  }
};

template <SECOidTag TAG>
class DigestTest : public testing::Test {
 protected:
  mozilla::UniquePK11Context context;

  void SetUp() override {
    if (!NSS_IsInitialized()) {
      ASSERT_EQ(NSS_NoDB_Init(nullptr), SECSuccess);
    }

    context = mozilla::UniquePK11Context(PK11_CreateDigestContext(TAG));
    ASSERT_TRUE(!!context);
  }
};

class BenchRunner : public testing::WithParamInterface<size_t> {
 public:
  virtual void Warmup() = 0;
  virtual void RunWithSize(size_t size) = 0;

  void Runner() {
    const size_t& size(GetParam());

    if (size == 0) {
      return Warmup();
    }

    RunWithSize(size);
  }

  const char* SuiteName() const {
    const char* instantiation =
        testing::UnitTest::GetInstance()->current_test_suite()->name();
    const char* suite = strchr(instantiation, '/');
    return suite ? suite + 1 : instantiation;
  }

  const char* TestName() const {
    const char* test =
        testing::UnitTest::GetInstance()->current_test_info()->name();
    const char* size = strchr(test, '/');
    return size ? size + 1 : test;
  }
};

class BenchEncryptRunner : public BenchRunner {
 public:
  void Warmup() override {
    std::vector<uint8_t> data(KILOBYTE);
    // data size + tag size
    std::vector<uint8_t> output(KILOBYTE + 16);
    EncryptData(data, output);
    DecryptData(output, data);
  }

  void RunWithSize(size_t size) override {
    std::vector<uint8_t> data(size);
    std::vector<uint8_t> encrypted(size + 16ull), decrypted(size);

    PK11_GenerateRandom(data.data(), data.size());

    mozilla::GTestBench(
        SuiteName(), (std::string(TestName()) + "_encrypt").c_str(),
        ([this, &data, &encrypted] { this->EncryptData(data, encrypted); }));
    mozilla::GTestBench(SuiteName(),
                        (std::string(TestName()) + "_decrypt").c_str(),
                        ([this, &encrypted, &decrypted] {
                          this->DecryptData(encrypted, decrypted);
                        }));
    ASSERT_EQ(data, decrypted);
  }

  virtual void EncryptData(std::vector<uint8_t>& data,
                           std::vector<uint8_t>& output) = 0;
  virtual void DecryptData(std::vector<uint8_t>& data,
                           std::vector<uint8_t>& output) = 0;
};

class BenchDigestRunner : public BenchRunner {
 public:
  void Warmup() override {
    std::vector<uint8_t> data(KILOBYTE);
    std::vector<uint8_t> output(DigestedSize());
    DigestData(data, output);
  }

  void RunWithSize(size_t size) override {
    std::vector<uint8_t> data(size);
    std::vector<uint8_t> encrypted(DigestedSize());

    PK11_GenerateRandom(data.data(), data.size());

    mozilla::GTestBench(SuiteName(), TestName(), ([this, &data, &encrypted] {
                          this->DigestData(data, encrypted);
                        }));
  }

  virtual size_t DigestedSize() = 0;
  virtual void DigestData(std::vector<uint8_t>& data,
                          std::vector<uint8_t>& output) = 0;
};

class BenchSignRunner : public BenchRunner {
 public:
  void Warmup() override {
    std::vector<uint8_t> data(64);
    std::vector<uint8_t> output(SignatureSize());
    SignData(data, output);
  }

  void RunWithSize(size_t size) override {
    std::vector<uint8_t> data(size);
    std::vector<uint8_t> sign(SignatureSize());

    PK11_GenerateRandom(data.data(), data.size());

    bool verified = false;

    mozilla::GTestBench(SuiteName(),
                        (std::string(TestName()) + "_sign").c_str(),
                        ([this, &data, &sign] { this->SignData(data, sign); }));
    mozilla::GTestBench(SuiteName(),
                        (std::string(TestName()) + "_verify").c_str(),
                        ([this, &data, &sign, &verified] {
                          verified = this->VerifyData(data, sign);
                        }));
    ASSERT_TRUE(verified);
  }

  virtual size_t SignatureSize() const = 0;
  virtual void SignData(std::vector<uint8_t>& data,
                        std::vector<uint8_t>& output) = 0;
  virtual bool VerifyData(std::vector<uint8_t>& data,
                          std::vector<uint8_t>& signature) = 0;
};

class BenchECDHRunner : public BenchRunner {
 public:
  void Warmup() override { mozilla::UniquePK11SymKey(this->DeriveKey()); }

  void RunWithSize(size_t size) override {
    mozilla::UniquePK11SymKey key = nullptr;
    mozilla::GTestBench(SuiteName(), "derive",
                        ([this, &key] { key.reset(this->DeriveKey()); }));
    ASSERT_TRUE(!!key);
  }

  virtual PK11SymKey* DeriveKey() = 0;
};

// ===============================================
// ------------------- Encrypt -------------------
// ===============================================

template <CK_MECHANISM_TYPE MECH>
class BenchEncrypt : public SymmetricKeyTest<MECH>, public BenchEncryptRunner {
  virtual SECItem MakeParams() = 0;

 public:
  void SetUp() override { SymmetricKeyTest<MECH>::SetUp(); }

  void EncryptData(std::vector<uint8_t>& data,
                   std::vector<uint8_t>& output) override {
    SECItem params = MakeParams();

    unsigned int output_len = 0;
    SECStatus rv =
        PK11_Encrypt(this->sym_key.get(), MECH, &params, output.data(),
                     &output_len, output.size(), data.data(), data.size());

    ASSERT_EQ(rv, SECSuccess);

    output.resize(output_len);
  }

  void DecryptData(std::vector<uint8_t>& data,
                   std::vector<uint8_t>& output) override {
    SECItem params = MakeParams();

    unsigned int output_len = 0;
    SECStatus rv =
        PK11_Decrypt(this->sym_key.get(), MECH, &params, output.data(),
                     &output_len, output.size(), data.data(), data.size());

    ASSERT_EQ(rv, SECSuccess);

    output.resize(output_len);
  }
};

class BenchEncrypt_AES_GCM : public BenchEncrypt<CKM_AES_GCM> {
  std::vector<uint8_t> iv = std::vector<uint8_t>(16, 0);
  std::vector<uint8_t> aad = std::vector<uint8_t>(0);
  CK_NSS_GCM_PARAMS gcm_params;

 protected:
  SECItem MakeParams() override {
    gcm_params.pIv = iv.data();
    gcm_params.ulIvLen = iv.size();
    gcm_params.pAAD = aad.data();
    gcm_params.ulAADLen = aad.size();
    gcm_params.ulTagBits = 128;

    SECItem params = {siBuffer, reinterpret_cast<unsigned char*>(&gcm_params),
                      sizeof(gcm_params)};
    return params;
  }
};

class BenchEncrypt_CHACHA20_POLY1305
    : public BenchEncrypt<CKM_CHACHA20_POLY1305> {
  std::vector<uint8_t> iv = std::vector<uint8_t>(12);
  std::vector<uint8_t> aad = std::vector<uint8_t>(16);
  CK_SALSA20_CHACHA20_POLY1305_PARAMS chacha_params;

 protected:
  SECItem MakeParams() override {
    chacha_params.pNonce = iv.data();
    chacha_params.ulNonceLen = iv.size();
    chacha_params.pAAD = aad.data();
    chacha_params.ulAADLen = aad.size();

    SECItem params = {siBuffer,
                      reinterpret_cast<unsigned char*>(&chacha_params),
                      sizeof(chacha_params)};

    return params;
  }
};

class BenchEncrypt_CHACHA20 : public BenchEncrypt<CKM_CHACHA20> {
  std::vector<uint8_t> iv = std::vector<uint8_t>(12);
  uint32_t counter;
  CK_CHACHA20_PARAMS chacha_params;

 protected:
  SECItem MakeParams() override {
    chacha_params.pBlockCounter = reinterpret_cast<CK_BYTE_PTR>(&counter);
    chacha_params.blockCounterBits = 32;
    chacha_params.pNonce = iv.data();
    chacha_params.ulNonceBits = iv.size();
    SECItem params = {siBuffer,
                      reinterpret_cast<unsigned char*>(&chacha_params),
                      sizeof(chacha_params)};

    return params;
  }
};

// ===============================================
// -------------------  Digest -------------------
// ===============================================

template <SECOidTag TAG, size_t DIGEST_SIZE>
class BenchDigest : public DigestTest<TAG>, public BenchDigestRunner {
 public:
  size_t DigestedSize() override { return DIGEST_SIZE; }

  void DigestData(std::vector<uint8_t>& data,
                  std::vector<uint8_t>& output) override {
    SECStatus rv = PK11_DigestBegin(this->context.get());
    ASSERT_EQ(rv, SECSuccess);

    rv = PK11_DigestOp(this->context.get(), data.data(), data.size());
    ASSERT_EQ(rv, SECSuccess);

    unsigned int output_len = 0;

    rv = PK11_DigestFinal(this->context.get(), output.data(), &output_len,
                          output.size());
    ASSERT_EQ(rv, SECSuccess);

    output.resize(output_len);
  }
};

using BenchDigest_SHA256 = BenchDigest<SEC_OID_SHA256, SHA256_LENGTH>;
using BenchDigest_SHA512 = BenchDigest<SEC_OID_SHA512, SHA512_LENGTH>;

template <CK_MECHANISM_TYPE MECH, size_t DIGEST_SIZE>
class SymmetricKeySignTest : public SymmetricKeyTest<MECH>,
                             public BenchDigestRunner {
 public:
  size_t DigestedSize() override { return DIGEST_SIZE; }

  void DigestData(std::vector<uint8_t>& data,
                  std::vector<uint8_t>& output) override {
    SECItem hash = {siBuffer, data.data(),
                    static_cast<unsigned int>(data.size())};
    SECItem out = {siBuffer, output.data(),
                   static_cast<unsigned int>(output.size())};

    SECStatus rv =
        PK11_SignWithSymKey(this->sym_key.get(), MECH, nullptr, &out, &hash);
    ASSERT_EQ(rv, SECSuccess);
  }
};

using BenchSign_SHA256_HMAC =
    SymmetricKeySignTest<CKM_SHA256_HMAC, SHA256_LENGTH>;
using BenchSign_SHA384_HMAC =
    SymmetricKeySignTest<CKM_SHA384_HMAC, SHA384_LENGTH>;
using BenchSign_SHA512_HMAC =
    SymmetricKeySignTest<CKM_SHA512_HMAC, SHA512_LENGTH>;
using BenchSign_SHA3_224_HMAC =
    SymmetricKeySignTest<CKM_SHA3_224_HMAC, SHA3_224_LENGTH>;
using BenchSign_SHA3_256_HMAC =
    SymmetricKeySignTest<CKM_SHA3_256_HMAC, SHA3_256_LENGTH>;
using BenchSign_SHA3_384_HMAC =
    SymmetricKeySignTest<CKM_SHA3_384_HMAC, SHA3_384_LENGTH>;
using BenchSign_SHA3_512_HMAC =
    SymmetricKeySignTest<CKM_SHA3_512_HMAC, SHA3_512_LENGTH>;

// ===============================================
// --------------- Sign and verify ---------------
// ===============================================

template <CK_MECHANISM_TYPE TYPE>
class KeyPairSignTest : public KeyPairTest<TYPE>, public BenchSignRunner {
 protected:
  size_t SignatureSize() const override {
    return PK11_SignatureLen(this->priv_key.get());
  }

  void SignData(std::vector<uint8_t>& data,
                std::vector<uint8_t>& output) override {
    SECItem hash = {siBuffer, data.data(),
                    static_cast<unsigned int>(data.size())};
    SECItem out = {siBuffer, output.data(),
                   static_cast<unsigned int>(output.size())};

    SECStatus rv = PK11_Sign(this->priv_key.get(), &out, &hash);
    ASSERT_EQ(rv, SECSuccess);
  }

  bool VerifyData(std::vector<uint8_t>& data,
                  std::vector<uint8_t>& signature) override {
    SECItem dat = {siBuffer, data.data(),
                   static_cast<unsigned int>(data.size())};
    SECItem sig = {siBuffer, signature.data(),
                   static_cast<unsigned int>(signature.size())};

    SECStatus rv = PK11_Verify(this->pub_key.get(), &sig, &dat, nullptr);
    return rv == SECSuccess;
  }
};

template <SECOidTag CURVE>
class BenchSignEC : public KeyPairSignTest<CKM_EC_KEY_PAIR_GEN> {
  SECKEYECParams params;
  std::unique_ptr<uint8_t[]> extra;

 public:
  void* MakeParams() {
    /* For the case of ED curve_oid contains a EdDSA OID. */
    SECOidData* curve = SECOID_FindOIDByTag(CURVE);

    size_t plen = curve->oid.len + 2;
    extra.reset(new uint8_t[plen]);
    extra[0] = SEC_ASN1_OBJECT_ID;
    extra[1] = static_cast<uint8_t>(curve->oid.len);
    memcpy(&extra[2], curve->oid.data, curve->oid.len);

    params = {siBuffer, extra.get(), static_cast<unsigned int>(plen)};

    return &params;
  }
};

using BenchSign_P256 = BenchSignEC<SEC_OID_SECG_EC_SECP256R1>;
using BenchSign_P384 = BenchSignEC<SEC_OID_SECG_EC_SECP384R1>;
using BenchSign_P521 = BenchSignEC<SEC_OID_SECG_EC_SECP521R1>;

template <size_t KEY_SIZE>
class BenchSignRSA : public KeyPairSignTest<CKM_RSA_PKCS_KEY_PAIR_GEN> {
  PK11RSAGenParams rsa_params;

 public:
  void* MakeParams() {
    rsa_params.keySizeInBits = KEY_SIZE;
    rsa_params.pe = 0x10001;

    return &rsa_params;
  }
};

using BenchSign_RSA1024 = BenchSignRSA<1024>;
using BenchSign_RSA2048 = BenchSignRSA<2048>;
using BenchSign_RSA4096 = BenchSignRSA<4096>;

// ===============================================
// --------- Diffie-Hellman key exchange ---------
// ===============================================

template <SECOidTag CURVE, CK_MECHANISM_TYPE TARGET>
class BenchECDH : public KeyPairTest<CKM_EC_KEY_PAIR_GEN>,
                  public BenchECDHRunner {
  SECKEYECParams params;
  std::unique_ptr<uint8_t[]> extra;

 public:
  void* MakeParams() override {
    /* For the case of ED curve_oid contains a EdDSA OID. */
    SECOidData* curve = SECOID_FindOIDByTag(CURVE);

    size_t plen = curve->oid.len + 2;
    extra.reset(new uint8_t[plen]);
    extra[0] = SEC_ASN1_OBJECT_ID;
    extra[1] = static_cast<uint8_t>(curve->oid.len);
    memcpy(&extra[2], curve->oid.data, curve->oid.len);

    params = {siBuffer, extra.get(), static_cast<unsigned int>(plen)};

    return &params;
  }

  PK11SymKey* DeriveKey() override {
    return PK11_PubDeriveWithKDF(
        this->priv_key.get(), this->pub_key.get(), false, nullptr, nullptr,
        CKM_ECDH1_DERIVE, TARGET, CKA_DERIVE, 0, CKD_NULL, nullptr, nullptr);
  }
};

using BenchECDH_P256_SHA256 =
    BenchECDH<SEC_OID_SECG_EC_SECP256R1, CKM_SHA256_HMAC>;
using BenchECDH_P384_SHA256 =
    BenchECDH<SEC_OID_SECG_EC_SECP384R1, CKM_SHA256_HMAC>;
using BenchECDH_P521_SHA256 =
    BenchECDH<SEC_OID_SECG_EC_SECP521R1, CKM_SHA256_HMAC>;

// ===============================================
// ------------------ Harnesses ------------------
// ===============================================

std::string MakeTestName(const testing::TestParamInfo<size_t>& info) {
  if (info.param == 0) {
    return "warmup";
  }

  if (info.param < KILOBYTE) {
    return std::to_string(info.param);
  }

  if (info.param < MEGABYTE) {
    return std::to_string(info.param / KILOBYTE) + "k";
  }

  return std::to_string(info.param / MEGABYTE) + "m";
}

#define NSS_BENCH_P(suite, params)                                        \
  TEST_P(suite, Run) { Runner(); }                                        \
  INSTANTIATE_TEST_SUITE_P(psm_##suite, suite, testing::ValuesIn(params), \
                           MakeTestName);

static const size_t BENCH_ENCRYPT_SIZE[] = {
    WARMUP, KILOBYTE, 16 * KILOBYTE, MEGABYTE, 16 * MEGABYTE, 128 * MEGABYTE};
// These fail because the treeherder instances run out of memory
//
// 512 * MEGABYTE, GIGABYTE - MEGABYTE, GIGABYTE,
//
// These fail because some of the SHA3 HMAC suites time out
//
// 4 * GIGABYTE - MEGABYTE, 4 * GIGABYTE - 32,
//
// These fail because the size parameters in PK11_Encrypt/PK11_Decrypt
// are unsigned int, i.e. 32bits. So any data size + tag size > 4GiB will
// fail
//
// 4 * GIGABYTE - 1, 4 * GIGABYTE, 4 * GIGABYTE + MEGABYTE, 16 * GIGABYTE,

static const size_t BENCH_DH_SIZE[] = {WARMUP, 1};
static const size_t BENCH_RSA1024_SIZE[] = {WARMUP, 32, 64, 117};
static const size_t BENCH_RSA2048_SIZE[] = {WARMUP, 32, 64, 128, 245};
static const size_t BENCH_RSA4096_SIZE[] = {WARMUP, 32, 64, 128, 256, 501};

NSS_BENCH_P(BenchEncrypt_AES_GCM, BENCH_ENCRYPT_SIZE)
NSS_BENCH_P(BenchEncrypt_CHACHA20, BENCH_ENCRYPT_SIZE)
NSS_BENCH_P(BenchEncrypt_CHACHA20_POLY1305, BENCH_ENCRYPT_SIZE)

NSS_BENCH_P(BenchDigest_SHA256, BENCH_ENCRYPT_SIZE)
NSS_BENCH_P(BenchDigest_SHA512, BENCH_ENCRYPT_SIZE)
NSS_BENCH_P(BenchSign_SHA256_HMAC, BENCH_ENCRYPT_SIZE)
NSS_BENCH_P(BenchSign_SHA384_HMAC, BENCH_ENCRYPT_SIZE)
NSS_BENCH_P(BenchSign_SHA512_HMAC, BENCH_ENCRYPT_SIZE)
NSS_BENCH_P(BenchSign_SHA3_224_HMAC, BENCH_ENCRYPT_SIZE)
NSS_BENCH_P(BenchSign_SHA3_256_HMAC, BENCH_ENCRYPT_SIZE)
NSS_BENCH_P(BenchSign_SHA3_384_HMAC, BENCH_ENCRYPT_SIZE)
NSS_BENCH_P(BenchSign_SHA3_512_HMAC, BENCH_ENCRYPT_SIZE)

NSS_BENCH_P(BenchSign_P256, BENCH_ENCRYPT_SIZE)
NSS_BENCH_P(BenchSign_P384, BENCH_ENCRYPT_SIZE)
NSS_BENCH_P(BenchSign_P521, BENCH_ENCRYPT_SIZE)

NSS_BENCH_P(BenchECDH_P256_SHA256, BENCH_DH_SIZE)
NSS_BENCH_P(BenchECDH_P384_SHA256, BENCH_DH_SIZE)
NSS_BENCH_P(BenchECDH_P521_SHA256, BENCH_DH_SIZE)

NSS_BENCH_P(BenchSign_RSA1024, BENCH_RSA1024_SIZE)
NSS_BENCH_P(BenchSign_RSA2048, BENCH_RSA2048_SIZE)
NSS_BENCH_P(BenchSign_RSA4096, BENCH_RSA4096_SIZE)

}  // namespace nss_test
