/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef CacheCrypto_h_
#define CacheCrypto_h_

#include "nscore.h"
#include "nsISupportsImpl.h"
#include "nsString.h"

namespace mozilla {
namespace net {

// Authenticated block encryptor for the HTTP disk cache, using AES-256-GCM via
// NSS. A single 32-byte master key is held in memory for the lifetime of the
// process (currently sourced from a pref). Each block is encrypted
// independently with a fresh random nonce, and the block number is bound as
// additional authenticated data so a block cannot be moved to another position.
//
// On disk a block is laid out as [ciphertext(len)][tag][nonce]; the plaintext
// only ever exists in memory. Data chunks use the chunk index as the block
// number; the metadata block uses kMetadataBlockNumber.
class CacheCrypto {
 public:
  NS_INLINE_DECL_THREADSAFE_REFCOUNTING(CacheCrypto)

  static const uint32_t kKeyLength = 32;         // AES-256 key
  static const uint32_t kBlockNonceLength = 12;  // AES-GCM nonce (IV)
  static const uint32_t kBlockTagLength = 16;    // AES-GCM authentication tag
  // Per-block on-disk overhead added to the plaintext length.
  static const uint32_t kBlockOverhead = kBlockNonceLength + kBlockTagLength;

  // Block number for the single metadata block, distinct from any chunk index.
  static const uint64_t kMetadataBlockNumber = UINT64_MAX;

  // Loads the master key from the pref, generating and persisting one if
  // absent. Must run on the main thread. A no-op when the encryption pref is
  // off or when already initialized.
  static void Init();
  static void Shutdown();

  // Test-only: sets up a usable cipher (generating a key if the key pref is
  // empty) without consulting the enabled pref
  static void InitForTesting();

  // Returns a singleton instance when encryption is enabled and a usable key
  // was loaded, otherwise nullptr.
  static already_AddRefed<CacheCrypto> GetInstanceOrNull();

  // Returns true when GetInstanceOrNull would return non-null.
  static bool IsActive();

  // Returns whether disk cache encryption is enabled (the pref captured at
  // Init). May be true while IsActive() is false if no usable cipher could be
  // loaded.
  static bool IsEnabled();

  // Encrypts aLen plaintext bytes (aPlaintext) into aOut, which must hold
  // aLen + kBlockOverhead bytes laid out as
  // [ciphertext(aLen)][tag(kBlockTagLength)][nonce(kBlockNonceLength)].
  // aAad (length aAadLen), when non-null, is authenticated by the AEAD tag but
  // not encrypted; DecryptBlock must be given the identical AAD. This lets
  // callers bind unencrypted-but-trusted context (e.g. the metadata trailer:
  // format version, encryption flag and data size) so it cannot be tampered
  // with or downgraded.
  nsresult EncryptBlock(uint64_t aBlockNumber, const uint8_t* aPlaintext,
                        uint32_t aLen, uint8_t* aOut,
                        const uint8_t* aAad = nullptr, uint32_t aAadLen = 0);

  // Decrypts a block of aLen + kBlockOverhead bytes (aIn, same layout as above)
  // into aOut (aLen plaintext bytes). aIn must be writable: the AEAD API takes
  // the nonce and tag as mutable spans. aAad must match what was passed to
  // EncryptBlock or decryption fails.
  nsresult DecryptBlock(uint64_t aBlockNumber, uint8_t* aIn, uint32_t aLen,
                        uint8_t* aOut, const uint8_t* aAad = nullptr,
                        uint32_t aAadLen = 0);

 private:
  CacheCrypto() = default;
  // Zeroizes the in-memory key material.
  ~CacheCrypto();

  // Shared key setup for Init()/InitForTesting(): loads or generates the key
  // and publishes the usable instance. Runs on the main thread.
  static void InitInternal();

  bool mUsable{false};
  uint8_t mKeyBytes[kKeyLength]{};
};

}  // namespace net
}  // namespace mozilla

#endif  // CacheCrypto_h_
