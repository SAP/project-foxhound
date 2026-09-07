/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <array>
#include <cstddef>
#include <cstdint>
#include <numeric>

#include "NSSRandomAccessCipherStrategy.h"
#include "gtest/gtest.h"

namespace mozilla::dom::quota::test {

constexpr uint64_t kBlockNumber = 8;

template <std::size_t Length>
std::array<uint8_t, Length> MakeTestData(uint8_t aInitialValue = 1) {
  auto data = std::array<uint8_t, Length>{};
  std::iota(data.begin(), data.end(), aInitialValue);
  return data;
}

std::array<uint8_t, 32> MakeTestKey(uint8_t aInitialValue = 1) {
  return MakeTestData<32>(aInitialValue);
}

std::array<uint8_t, 12> MakeTestNonce(uint8_t aInitialValue = 1) {
  return MakeTestData<12>(aInitialValue);
}

std::array<uint8_t, 32 + 8> MakeTestAad(uint8_t aInitialValue = 1) {
  return MakeTestData<32 + 8>(aInitialValue);
}

std::array<uint8_t, 4032> MakeTestPlaintext(uint8_t aInitialValue = 1) {
  return MakeTestData<4032>(aInitialValue);
}

struct EncryptionTestData {
  std::array<uint8_t, 32> mKey;
  std::array<uint8_t, 12> mNonce;
  std::array<uint8_t, 32 + 8> mAad;
  std::array<uint8_t, 4032> mPlaintext;
  std::array<uint8_t, 4032> mCipherText;
  std::array<uint8_t, 16> mTag;
};

EncryptionTestData MakeEncryptionTestData() {
  return {MakeTestKey(),
          MakeTestNonce(),
          MakeTestAad(),
          MakeTestPlaintext(),
          std::array<uint8_t, 4032>{},
          std::array<uint8_t, 16>{}};
}

TEST(EncryptedNSSRandomAccessCipherStrategyTest,
     cipherTextIsDifferentFromOriginalPayload)
{
  NSSRandomAccessCipherStrategy cipherStrategy;
  cipherStrategy.Init();

  auto data = MakeEncryptionTestData();
  auto encryptionInput = NSSRandomAccessCipherStrategy::EncryptionInput{
      data.mKey, kBlockNumber, Span<uint8_t, 12>(data.mNonce),
      Span<uint8_t>(data.mPlaintext), Span<uint8_t>(data.mAad)};

  auto encryptionOutput = NSSRandomAccessCipherStrategy::EncryptionOutput{
      Span<uint8_t>(data.mCipherText), Span<uint8_t, 16>(data.mTag)};

  auto res = cipherStrategy.Encrypt(encryptionInput, encryptionOutput);

  ASSERT_EQ(res, NS_OK);

  ASSERT_NE(Span<uint8_t>(data.mPlaintext), Span<uint8_t>(data.mCipherText));
}

TEST(EncryptedNSSRandomAccessCipherStrategyTest, payloadRoundTrip)
{
  NSSRandomAccessCipherStrategy cipherStrategy;
  cipherStrategy.Init();

  auto data = MakeEncryptionTestData();
  auto encryptionInput = NSSRandomAccessCipherStrategy::EncryptionInput{
      data.mKey, kBlockNumber, Span<uint8_t, 12>(data.mNonce),
      Span<uint8_t>(data.mPlaintext), Span<uint8_t>(data.mAad)};

  auto encryptionOutput = NSSRandomAccessCipherStrategy::EncryptionOutput{
      Span<uint8_t>(data.mCipherText), Span<uint8_t, 16>(data.mTag)};

  auto res1 = cipherStrategy.Encrypt(encryptionInput, encryptionOutput);
  ASSERT_EQ(res1, NS_OK);

  auto decryptionInput = NSSRandomAccessCipherStrategy::DecryptionInput{
      data.mKey,
      kBlockNumber,
      Span<uint8_t, 12>(data.mNonce),
      Span<uint8_t>(data.mCipherText),
      Span<uint8_t>(data.mAad),
      Span<uint8_t, 16>(data.mTag)};

  auto decryptedText = std::array<uint8_t, 4032>{};
  auto decryptionOutput = NSSRandomAccessCipherStrategy::DecryptionOutput{
      Span<uint8_t>(decryptedText)};

  auto res2 = cipherStrategy.Decrypt(decryptionInput, decryptionOutput);
  ASSERT_EQ(res2, NS_OK);

  ASSERT_EQ(Span<uint8_t>(data.mPlaintext), Span<uint8_t>(decryptedText));
}

TEST(EncryptedNSSRandomAccessCipherStrategyTest,
     failureOfDecryptionOfBlockWithWrongBlockNumber)
{
  NSSRandomAccessCipherStrategy cipherStrategy;
  cipherStrategy.Init();

  auto data = MakeEncryptionTestData();
  auto encryptionInput = NSSRandomAccessCipherStrategy::EncryptionInput{
      data.mKey, kBlockNumber, Span<uint8_t, 12>(data.mNonce),
      Span<uint8_t>(data.mPlaintext), Span<uint8_t>(data.mAad)};

  auto encryptionOutput = NSSRandomAccessCipherStrategy::EncryptionOutput{
      Span<uint8_t>(data.mCipherText), Span<uint8_t, 16>(data.mTag)};

  auto res1 = cipherStrategy.Encrypt(encryptionInput, encryptionOutput);
  ASSERT_EQ(res1, NS_OK);

  auto decryptionInput = NSSRandomAccessCipherStrategy::DecryptionInput{
      data.mKey,
      kBlockNumber + 1,
      Span<uint8_t, 12>(data.mNonce),
      Span<uint8_t>(data.mCipherText),
      Span<uint8_t>(data.mAad),
      Span<uint8_t, 16>(data.mTag)};

  auto decryptedText = std::array<uint8_t, 4032>{};
  auto decryptionOutput = NSSRandomAccessCipherStrategy::DecryptionOutput{
      Span<uint8_t>(decryptedText)};

  auto res2 = cipherStrategy.Decrypt(decryptionInput, decryptionOutput);
  ASSERT_NE(res2, NS_OK);
}

TEST(EncryptedNSSRandomAccessCipherStrategyTest,
     failureOfDecryptionOfBlockWithWrongAAD)
{
  NSSRandomAccessCipherStrategy cipherStrategy;
  cipherStrategy.Init();

  auto data = MakeEncryptionTestData();
  auto encryptionInput = NSSRandomAccessCipherStrategy::EncryptionInput{
      data.mKey, kBlockNumber, Span<uint8_t, 12>(data.mNonce),
      Span<uint8_t>(data.mPlaintext), Span<uint8_t>(data.mAad)};

  auto encryptionOutput = NSSRandomAccessCipherStrategy::EncryptionOutput{
      Span<uint8_t>(data.mCipherText), Span<uint8_t, 16>(data.mTag)};

  auto res1 = cipherStrategy.Encrypt(encryptionInput, encryptionOutput);
  ASSERT_EQ(res1, NS_OK);

  auto wrongAad = MakeTestAad(2);
  auto decryptionInput = NSSRandomAccessCipherStrategy::DecryptionInput{
      data.mKey,
      kBlockNumber,
      Span<uint8_t, 12>(data.mNonce),
      Span<uint8_t>(data.mCipherText),
      Span<uint8_t>(wrongAad),
      Span<uint8_t, 16>(data.mTag)};

  auto decryptedText = std::array<uint8_t, 4032>{};
  auto decryptionOutput = NSSRandomAccessCipherStrategy::DecryptionOutput{
      Span<uint8_t>(decryptedText)};

  auto res2 = cipherStrategy.Decrypt(decryptionInput, decryptionOutput);
  ASSERT_NE(res2, NS_OK);
}

TEST(EncryptedNSSRandomAccessCipherStrategyTest,
     failureOfDecryptionOfBlockWithWrongKey)
{
  NSSRandomAccessCipherStrategy cipherStrategy;
  cipherStrategy.Init();

  auto data = MakeEncryptionTestData();
  auto encryptionInput = NSSRandomAccessCipherStrategy::EncryptionInput{
      data.mKey, kBlockNumber, Span<uint8_t, 12>(data.mNonce),
      Span<uint8_t>(data.mPlaintext), Span<uint8_t>(data.mAad)};

  auto encryptionOutput = NSSRandomAccessCipherStrategy::EncryptionOutput{
      Span<uint8_t>(data.mCipherText), Span<uint8_t, 16>(data.mTag)};

  auto res1 = cipherStrategy.Encrypt(encryptionInput, encryptionOutput);
  ASSERT_EQ(res1, NS_OK);

  auto wrongKey = data.mKey;
  wrongKey[0] ^= 0xFF;
  auto decryptionInput = NSSRandomAccessCipherStrategy::DecryptionInput{
      wrongKey,
      kBlockNumber,
      Span<uint8_t, 12>(data.mNonce),
      Span<uint8_t>(data.mCipherText),
      Span<uint8_t>(data.mAad),
      Span<uint8_t, 16>(data.mTag)};

  auto decryptedText = std::array<uint8_t, 4032>{};
  auto decryptionOutput = NSSRandomAccessCipherStrategy::DecryptionOutput{
      Span<uint8_t>(decryptedText)};

  auto res2 = cipherStrategy.Decrypt(decryptionInput, decryptionOutput);
  ASSERT_NE(res2, NS_OK);
}

TEST(EncryptedNSSRandomAccessCipherStrategyTest,
     failureOfDecryptionOfBlockWithWrongNonce)
{
  NSSRandomAccessCipherStrategy cipherStrategy;
  cipherStrategy.Init();

  auto data = MakeEncryptionTestData();
  auto encryptionInput = NSSRandomAccessCipherStrategy::EncryptionInput{
      data.mKey, kBlockNumber, Span<uint8_t, 12>(data.mNonce),
      Span<uint8_t>(data.mPlaintext), Span<uint8_t>(data.mAad)};

  auto encryptionOutput = NSSRandomAccessCipherStrategy::EncryptionOutput{
      Span<uint8_t>(data.mCipherText), Span<uint8_t, 16>(data.mTag)};

  auto res1 = cipherStrategy.Encrypt(encryptionInput, encryptionOutput);
  ASSERT_EQ(res1, NS_OK);

  auto wrongNonce = MakeTestNonce(2);
  auto decryptionInput = NSSRandomAccessCipherStrategy::DecryptionInput{
      data.mKey,
      kBlockNumber,
      Span<uint8_t, 12>(wrongNonce),
      Span<uint8_t>(data.mCipherText),
      Span<uint8_t>(data.mAad),
      Span<uint8_t, 16>(data.mTag)};

  auto decryptedText = std::array<uint8_t, 4032>{};
  auto decryptionOutput = NSSRandomAccessCipherStrategy::DecryptionOutput{
      Span<uint8_t>(decryptedText)};

  auto res2 = cipherStrategy.Decrypt(decryptionInput, decryptionOutput);
  ASSERT_NE(res2, NS_OK);
}

TEST(EncryptedNSSRandomAccessCipherStrategyTest,
     failureOfDecryptionOfBlockWithWrongTag)
{
  NSSRandomAccessCipherStrategy cipherStrategy;
  cipherStrategy.Init();

  auto data = MakeEncryptionTestData();
  auto encryptionInput = NSSRandomAccessCipherStrategy::EncryptionInput{
      data.mKey, kBlockNumber, Span<uint8_t, 12>(data.mNonce),
      Span<uint8_t>(data.mPlaintext), Span<uint8_t>(data.mAad)};

  auto encryptionOutput = NSSRandomAccessCipherStrategy::EncryptionOutput{
      Span<uint8_t>(data.mCipherText), Span<uint8_t, 16>(data.mTag)};

  auto res1 = cipherStrategy.Encrypt(encryptionInput, encryptionOutput);
  ASSERT_EQ(res1, NS_OK);

  auto wrongTag = MakeTestData<16>(2);
  auto decryptionInput = NSSRandomAccessCipherStrategy::DecryptionInput{
      data.mKey,
      kBlockNumber,
      Span<uint8_t, 12>(data.mNonce),
      Span<uint8_t>(data.mCipherText),
      Span<uint8_t>(data.mAad),
      Span<uint8_t, 16>(wrongTag)};

  auto decryptedText = std::array<uint8_t, 4032>{};
  auto decryptionOutput = NSSRandomAccessCipherStrategy::DecryptionOutput{
      Span<uint8_t>(decryptedText)};

  auto res2 = cipherStrategy.Decrypt(decryptionInput, decryptionOutput);
  ASSERT_NE(res2, NS_OK);
}

TEST(EncryptedNSSRandomAccessCipherStrategyTest,
     failureOfDecryptionOfBlockWithTweakedCipherText)
{
  NSSRandomAccessCipherStrategy cipherStrategy;
  cipherStrategy.Init();

  auto data = MakeEncryptionTestData();
  auto encryptionInput = NSSRandomAccessCipherStrategy::EncryptionInput{
      data.mKey, kBlockNumber, Span<uint8_t, 12>(data.mNonce),
      Span<uint8_t>(data.mPlaintext), Span<uint8_t>(data.mAad)};

  auto encryptionOutput = NSSRandomAccessCipherStrategy::EncryptionOutput{
      Span<uint8_t>(data.mCipherText), Span<uint8_t, 16>(data.mTag)};

  auto res1 = cipherStrategy.Encrypt(encryptionInput, encryptionOutput);
  ASSERT_EQ(res1, NS_OK);

  auto tweakedCipherText = data.mCipherText;
  tweakedCipherText[0] ^= 0xFF;
  auto decryptionInput = NSSRandomAccessCipherStrategy::DecryptionInput{
      data.mKey,
      kBlockNumber,
      Span<uint8_t, 12>(data.mNonce),
      Span<uint8_t>(tweakedCipherText),
      Span<uint8_t>(data.mAad),
      Span<uint8_t, 16>(data.mTag)};

  auto decryptedText = std::array<uint8_t, 4032>{};
  auto decryptionOutput = NSSRandomAccessCipherStrategy::DecryptionOutput{
      Span<uint8_t>(decryptedText)};

  auto res2 = cipherStrategy.Decrypt(decryptionInput, decryptionOutput);
  ASSERT_NE(res2, NS_OK);
}

TEST(EncryptedNSSRandomAccessCipherStrategyTest,
     differentNonceLeadsToDifferentCipherText)
{
  NSSRandomAccessCipherStrategy cipherStrategy;
  cipherStrategy.Init();

  auto data = MakeEncryptionTestData();
  auto encryptionInput1 = NSSRandomAccessCipherStrategy::EncryptionInput{
      data.mKey, kBlockNumber, Span<uint8_t, 12>(data.mNonce),
      Span<uint8_t>(data.mPlaintext), Span<uint8_t>(data.mAad)};
  auto encryptionOutput1 = NSSRandomAccessCipherStrategy::EncryptionOutput{
      Span<uint8_t>(data.mCipherText), Span<uint8_t, 16>(data.mTag)};

  auto res1 = cipherStrategy.Encrypt(encryptionInput1, encryptionOutput1);
  ASSERT_EQ(res1, NS_OK);

  auto data2 = MakeEncryptionTestData();
  data2.mNonce = MakeTestNonce(2);
  auto encryptionInput2 = NSSRandomAccessCipherStrategy::EncryptionInput{
      data2.mKey, kBlockNumber, Span<uint8_t, 12>(data2.mNonce),
      Span<uint8_t>(data2.mPlaintext), Span<uint8_t>(data2.mAad)};
  auto encryptionOutput2 = NSSRandomAccessCipherStrategy::EncryptionOutput{
      Span<uint8_t>(data2.mCipherText), Span<uint8_t, 16>(data2.mTag)};

  auto res2 = cipherStrategy.Encrypt(encryptionInput2, encryptionOutput2);
  ASSERT_EQ(res2, NS_OK);

  ASSERT_NE(Span<uint8_t>(data.mCipherText), Span<uint8_t>(data2.mCipherText));
}

TEST(EncryptedNSSRandomAccessCipherStrategyTest,
     differentBlockNumberLeadsToDifferentCipherText)
{
  NSSRandomAccessCipherStrategy cipherStrategy;
  cipherStrategy.Init();

  auto data = MakeEncryptionTestData();
  auto encryptionInput1 = NSSRandomAccessCipherStrategy::EncryptionInput{
      data.mKey, kBlockNumber, Span<uint8_t, 12>(data.mNonce),
      Span<uint8_t>(data.mPlaintext), Span<uint8_t>(data.mAad)};
  auto encryptionOutput1 = NSSRandomAccessCipherStrategy::EncryptionOutput{
      Span<uint8_t>(data.mCipherText), Span<uint8_t, 16>(data.mTag)};

  auto res1 = cipherStrategy.Encrypt(encryptionInput1, encryptionOutput1);
  ASSERT_EQ(res1, NS_OK);

  auto data2 = MakeEncryptionTestData();
  auto encryptionInput2 = NSSRandomAccessCipherStrategy::EncryptionInput{
      data2.mKey, kBlockNumber + 1, Span<uint8_t, 12>(data2.mNonce),
      Span<uint8_t>(data2.mPlaintext), Span<uint8_t>(data2.mAad)};
  auto encryptionOutput2 = NSSRandomAccessCipherStrategy::EncryptionOutput{
      Span<uint8_t>(data2.mCipherText), Span<uint8_t, 16>(data2.mTag)};

  auto res2 = cipherStrategy.Encrypt(encryptionInput2, encryptionOutput2);
  ASSERT_EQ(res2, NS_OK);

  ASSERT_NE(Span<uint8_t>(data.mCipherText), Span<uint8_t>(data2.mCipherText));
}

TEST(EncryptedNSSRandomAccessCipherStrategyTest,
     differentKeyLeadsToDifferentCipherText)
{
  NSSRandomAccessCipherStrategy cipherStrategy;
  cipherStrategy.Init();

  auto data = MakeEncryptionTestData();
  auto encryptionInput1 = NSSRandomAccessCipherStrategy::EncryptionInput{
      data.mKey, kBlockNumber, Span<uint8_t, 12>(data.mNonce),
      Span<uint8_t>(data.mPlaintext), Span<uint8_t>(data.mAad)};
  auto encryptionOutput1 = NSSRandomAccessCipherStrategy::EncryptionOutput{
      Span<uint8_t>(data.mCipherText), Span<uint8_t, 16>(data.mTag)};

  auto res1 = cipherStrategy.Encrypt(encryptionInput1, encryptionOutput1);
  ASSERT_EQ(res1, NS_OK);

  auto data2 = MakeEncryptionTestData();
  data2.mKey[0] ^= 0xFF;
  auto encryptionInput2 = NSSRandomAccessCipherStrategy::EncryptionInput{
      data2.mKey, kBlockNumber, Span<uint8_t, 12>(data2.mNonce),
      Span<uint8_t>(data2.mPlaintext), Span<uint8_t>(data2.mAad)};
  auto encryptionOutput2 = NSSRandomAccessCipherStrategy::EncryptionOutput{
      Span<uint8_t>(data2.mCipherText), Span<uint8_t, 16>(data2.mTag)};

  auto res2 = cipherStrategy.Encrypt(encryptionInput2, encryptionOutput2);
  ASSERT_EQ(res2, NS_OK);

  ASSERT_NE(Span<uint8_t>(data.mCipherText), Span<uint8_t>(data2.mCipherText));
}

}  // namespace mozilla::dom::quota::test
