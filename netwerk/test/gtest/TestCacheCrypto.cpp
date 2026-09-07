/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <cstring>

#include "CacheCrypto.h"
#include "gtest/gtest.h"
#include "mozilla/Preferences.h"
#include "nsCOMPtr.h"
#include "nsIX509CertDB.h"
#include "nsServiceManagerUtils.h"
#include "nsTArray.h"

using namespace mozilla;
using namespace mozilla::net;

namespace {

// CacheCrypto needs NSS (PK11) and a loaded key. Getting the cert DB service
// initializes NSS; InitForTesting() then loads or generates the key without
// depending on the "once"-mirrored enabled pref. Returns the usable instance,
// or null if setup failed.
static already_AddRefed<CacheCrypto> InitCryptoForTest() {
  nsCOMPtr<nsIX509CertDB> certDB(do_GetService(NS_X509CERTDB_CONTRACTID));
  EXPECT_TRUE(certDB);
  CacheCrypto::InitForTesting();
  return CacheCrypto::GetInstanceOrNull();
}

}  // namespace

TEST(CacheCrypto, RoundTrip)
{
  RefPtr<CacheCrypto> crypto = InitCryptoForTest();
  ASSERT_TRUE(crypto);

  // Length deliberately not a multiple of the AES block size.
  const char* msg = "The quick brown fox jumps over the lazy dog -- 0123456789";
  const uint32_t len = strlen(msg);

  nsTArray<uint8_t> block;
  block.SetLength(len + CacheCrypto::kBlockOverhead);
  nsTArray<uint8_t> roundtrip;
  roundtrip.SetLength(len);

  for (uint64_t blockNumber :
       {uint64_t(0), uint64_t(1), uint64_t(7), uint64_t(12345),
        CacheCrypto::kMetadataBlockNumber}) {
    ASSERT_EQ(NS_OK, crypto->EncryptBlock(blockNumber,
                                          reinterpret_cast<const uint8_t*>(msg),
                                          len, block.Elements()));
    // Ciphertext differs from plaintext.
    EXPECT_NE(0, memcmp(block.Elements(), msg, len));

    ASSERT_EQ(NS_OK, crypto->DecryptBlock(blockNumber, block.Elements(), len,
                                          roundtrip.Elements()));
    EXPECT_EQ(0, memcmp(roundtrip.Elements(), msg, len));
  }

  CacheCrypto::Shutdown();
}

TEST(CacheCrypto, TamperAndWrongBlockFail)
{
  RefPtr<CacheCrypto> crypto = InitCryptoForTest();
  ASSERT_TRUE(crypto);

  const char* msg = "authenticated payload";
  const uint32_t len = strlen(msg);

  nsTArray<uint8_t> block;
  block.SetLength(len + CacheCrypto::kBlockOverhead);
  nsTArray<uint8_t> out;
  out.SetLength(len);

  ASSERT_EQ(NS_OK,
            crypto->EncryptBlock(3, reinterpret_cast<const uint8_t*>(msg), len,
                                 block.Elements()));

  // Decrypting with a different block number fails: the block number is bound
  // as additional authenticated data.
  EXPECT_NE(NS_OK,
            crypto->DecryptBlock(4, block.Elements(), len, out.Elements()));

  // Tampered ciphertext fails the AEAD tag check.
  nsTArray<uint8_t> tampered = block.Clone();
  tampered[0] ^= 0x01;
  EXPECT_NE(NS_OK,
            crypto->DecryptBlock(3, tampered.Elements(), len, out.Elements()));

  // The untouched block at its own block number still decrypts.
  EXPECT_EQ(NS_OK,
            crypto->DecryptBlock(3, block.Elements(), len, out.Elements()));
  EXPECT_EQ(0, memcmp(out.Elements(), msg, len));

  CacheCrypto::Shutdown();
}

TEST(CacheCrypto, WrongKeyFails)
{
  // Encrypt a block with the session's key.
  RefPtr<CacheCrypto> crypto = InitCryptoForTest();
  ASSERT_TRUE(crypto);

  const char* msg = "secret cache contents";
  const uint32_t len = strlen(msg);
  nsTArray<uint8_t> block;
  block.SetLength(len + CacheCrypto::kBlockOverhead);
  ASSERT_EQ(NS_OK,
            crypto->EncryptBlock(0, reinterpret_cast<const uint8_t*>(msg), len,
                                 block.Elements()));

  // Model a later session whose key pref is empty / different: clearing the key
  // pref makes Init() generate a fresh (different) key. This covers both "the
  // key pref is empty" and "the key does not match".
  CacheCrypto::Shutdown();
  Preferences::SetCString("browser.cache.disk.encryption.key", ""_ns);
  CacheCrypto::InitForTesting();
  RefPtr<CacheCrypto> crypto2 = CacheCrypto::GetInstanceOrNull();
  ASSERT_TRUE(crypto2);

  // Decrypting the block written with the old key must fail (AEAD auth).
  nsTArray<uint8_t> out;
  out.SetLength(len);
  EXPECT_NE(NS_OK,
            crypto2->DecryptBlock(0, block.Elements(), len, out.Elements()));

  CacheCrypto::Shutdown();
}

TEST(CacheCrypto, FreshNoncePerEncryption)
{
  RefPtr<CacheCrypto> crypto = InitCryptoForTest();
  ASSERT_TRUE(crypto);

  const char* msg = "identical plaintext, identical block number";
  const uint32_t len = strlen(msg);

  nsTArray<uint8_t> b1, b2;
  b1.SetLength(len + CacheCrypto::kBlockOverhead);
  b2.SetLength(len + CacheCrypto::kBlockOverhead);

  ASSERT_EQ(NS_OK,
            crypto->EncryptBlock(0, reinterpret_cast<const uint8_t*>(msg), len,
                                 b1.Elements()));
  ASSERT_EQ(NS_OK,
            crypto->EncryptBlock(0, reinterpret_cast<const uint8_t*>(msg), len,
                                 b2.Elements()));
  // Same key/block/plaintext, but a fresh random nonce per encryption means the
  // ciphertext (and nonce) differ. This is what prevents keystream/nonce reuse
  // when a block is rewritten.
  EXPECT_NE(0, memcmp(b1.Elements(), b2.Elements(),
                      len + CacheCrypto::kBlockOverhead));

  CacheCrypto::Shutdown();
}
