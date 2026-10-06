/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "CacheCrypto.h"

#include "CacheLog.h"
#include "CacheObserver.h"
#include "ScopedNSSTypes.h"
#include "mozilla/Atomics.h"
#include "mozilla/Base64.h"
#include "mozilla/Preferences.h"
#include "mozilla/StaticPrefs_browser.h"
#include "mozilla/StaticPtr.h"
#include "nsTArray.h"
#include "nsThreadUtils.h"
#include "pk11pub.h"
#include "pkcs11t.h"
#include "secitem.h"

namespace mozilla {
namespace net {

// The base64-encoded master key. Stored as a string pref (mirror: never), so it
// is read via the Preferences API rather than a StaticPrefs accessor.
static const char kKeyPref[] = "browser.cache.disk.encryption.key";

// Set on the main thread (Init/Shutdown) at lifecycle boundaries and read on
// the cache I/O thread (GetInstanceOrNull). The object is
// threadsafe-refcounted, so GetInstanceOrNull() hands out a strong reference
// that keeps it alive while in use even if Shutdown() drops this one.
static StaticRefPtr<CacheCrypto> gCacheCrypto;

// Mirrors "a usable gCacheCrypto exists" so callers can cheaply test whether
// encryption is active without taking a strong reference. Kept in sync with
// gCacheCrypto under the same main-thread Init/Shutdown lifecycle.
static Atomic<bool> gCacheCryptoActive(false);

// Whether disk cache encryption is enabled. IsEnabled() caches the pref value
// here on its first call (on whatever thread), so the value is stable for the
// session ("takes effect on restart") and can be read from the cache I/O thread
// without touching libpref. Distinct from gCacheCryptoActive: the pref can be
// on while no usable cipher could be loaded. gCacheCryptoEnabledInited guards
// the one-time capture.
static Atomic<bool> gCacheCryptoEnabled(false);
static Atomic<bool> gCacheCryptoEnabledInited(false);

// Overwrites a buffer with zeros in a way the compiler may not optimize away,
// used to clear key material from memory.
static void SecureZero(void* aBuf, size_t aLen) {
  volatile unsigned char* p = static_cast<volatile unsigned char*>(aBuf);
  while (aLen--) {
    *p++ = 0;
  }
}

// Runs an AES-256-GCM operation (encrypt or decrypt) for the given block. The
// 64-bit block number, followed by any caller-supplied aAad, is bound as
// additional authenticated data so a block cannot be silently moved to a
// different position and the extra context cannot be tampered with. On encrypt,
// aIn is the plaintext and aOut receives ciphertext||tag (aInLen +
// kBlockTagLength); on decrypt, aIn is ciphertext||tag and aOut receives the
// plaintext.
static nsresult AesGcmOp(const uint8_t* aKey, uint64_t aBlockNumber,
                         const uint8_t* aNonce, bool aEncrypt,
                         const uint8_t* aIn, uint32_t aInLen, uint8_t* aOut,
                         uint32_t aOutMax, const uint8_t* aExtraAad,
                         uint32_t aExtraAadLen) {
  UniquePK11SlotInfo slot(PK11_GetInternalSlot());
  if (!slot) {
    return NS_ERROR_FAILURE;
  }

  SECItem keyItem = {siBuffer, const_cast<unsigned char*>(aKey),
                     CacheCrypto::kKeyLength};
  UniquePK11SymKey symKey(PK11_ImportSymKey(slot.get(), CKM_AES_GCM,
                                            PK11_OriginUnwrap, CKA_ENCRYPT,
                                            &keyItem, nullptr));
  if (!symKey) {
    return NS_ERROR_FAILURE;
  }

  // AAD = block number || caller-supplied extra AAD.
  nsTArray<uint8_t> aad;
  aad.AppendElements(reinterpret_cast<const uint8_t*>(&aBlockNumber),
                     sizeof(aBlockNumber));
  if (aExtraAad && aExtraAadLen) {
    aad.AppendElements(aExtraAad, aExtraAadLen);
  }

  CK_GCM_PARAMS gcmParams = {};
  gcmParams.pIv = const_cast<unsigned char*>(aNonce);
  gcmParams.ulIvLen = CacheCrypto::kBlockNonceLength;
  gcmParams.ulIvBits = CacheCrypto::kBlockNonceLength * 8;
  gcmParams.pAAD = aad.Elements();
  gcmParams.ulAADLen = aad.Length();
  gcmParams.ulTagBits = CacheCrypto::kBlockTagLength * 8;

  SECItem params = {siBuffer, reinterpret_cast<unsigned char*>(&gcmParams),
                    sizeof(gcmParams)};

  unsigned int outLen = 0;
  SECStatus rv = aEncrypt ? PK11_Encrypt(symKey.get(), CKM_AES_GCM, &params,
                                         aOut, &outLen, aOutMax, aIn, aInLen)
                          : PK11_Decrypt(symKey.get(), CKM_AES_GCM, &params,
                                         aOut, &outLen, aOutMax, aIn, aInLen);
  if (rv != SECSuccess) {
    return NS_ERROR_FAILURE;
  }

  return NS_OK;
}

// static
void CacheCrypto::Init() {
  MOZ_ASSERT(NS_IsMainThread());

  if (gCacheCrypto) {
    return;
  }

  if (!IsEnabled()) {
    LOG(("CacheCrypto::Init() - disk cache encryption disabled"));
    return;
  }

  InitInternal();
}

// static
void CacheCrypto::InitForTesting() {
  MOZ_ASSERT(NS_IsMainThread());

  if (gCacheCrypto) {
    return;
  }

  // Skip the pref gate so gtests can set up a usable cipher directly,
  // regardless of the enabled pref.
  InitInternal();
}

// static
void CacheCrypto::InitInternal() {
  MOZ_ASSERT(NS_IsMainThread());
  MOZ_ASSERT(!gCacheCrypto);

  // The cipher needs NSS (here and later on the cache I/O thread). Leaving
  // gCacheCrypto null lets a later Init() call retry.
  if (!EnsureNSSInitializedChromeOrContent()) {
    LOG(("CacheCrypto::InitInternal() - NSS not available"));
    return;
  }

  RefPtr<CacheCrypto> crypto = new CacheCrypto();

  nsAutoCString encoded;
  nsresult rv = Preferences::GetCString(kKeyPref, encoded);
  if (NS_SUCCEEDED(rv) && !encoded.IsEmpty()) {
    nsAutoCString raw;
    rv = Base64Decode(encoded, raw);
    if (NS_FAILED(rv) || raw.Length() != kKeyLength) {
      // A malformed key means we cannot read any entry written with the real
      // key, so disable encryption for the session rather than write plaintext
      // or corrupt data. gCacheCrypto stays null.
      LOG(
          ("CacheCrypto::InitInternal() - malformed key pref, encryption "
           "disabled"));
      return;
    }
    memcpy(crypto->mKeyBytes, raw.BeginReading(), kKeyLength);
  } else {
    // No key yet: generate one and persist it so the cache survives restarts.
    UniquePK11SlotInfo slot(PK11_GetInternalSlot());
    if (!slot ||
        PK11_GenerateRandom(crypto->mKeyBytes, kKeyLength) != SECSuccess) {
      LOG(("CacheCrypto::InitInternal() - key generation failed"));
      return;
    }
    nsAutoCString toStore;
    rv = Base64Encode(
        nsDependentCSubstring(reinterpret_cast<const char*>(crypto->mKeyBytes),
                              kKeyLength),
        toStore);
    if (NS_FAILED(rv) ||
        NS_FAILED(Preferences::SetCString(kKeyPref, toStore))) {
      LOG(("CacheCrypto::InitInternal() - failed to persist generated key"));
      return;
    }
  }

  crypto->mUsable = true;
  gCacheCrypto = crypto.forget();
  gCacheCryptoActive = true;
  LOG(("CacheCrypto::InitInternal() - disk cache encryption ready"));
}

// static
void CacheCrypto::Shutdown() {
  MOZ_ASSERT(NS_IsMainThread());
  gCacheCryptoActive = false;
  gCacheCrypto = nullptr;
  // gCacheCryptoEnabled is intentionally left cached: it reflects the pref as
  // of the first IsEnabled() call and is meant to be stable for the process.
}

// static
already_AddRefed<CacheCrypto> CacheCrypto::GetInstanceOrNull() {
  RefPtr<CacheCrypto> crypto = gCacheCrypto;
  if (crypto && crypto->mUsable) {
    return crypto.forget();
  }
  return nullptr;
}

// static
bool CacheCrypto::IsActive() { return gCacheCryptoActive; }

// static
bool CacheCrypto::IsEnabled() {
  // Capture the pref value on the first call (on whatever thread) and reuse it
  // afterwards, so the encryption decision is stable for the session. The pref
  // is RelaxedAtomicBool/mirror:always, so the StaticPrefs read is itself
  // thread-safe. The race between two first-callers is benign: the pref value
  // doesn't change between them, so both cache the same value.
  if (!gCacheCryptoEnabledInited) {
    gCacheCryptoEnabled = StaticPrefs::browser_cache_disk_encryption_enabled();
    gCacheCryptoEnabledInited = true;
  }
  return gCacheCryptoEnabled;
}

CacheCrypto::~CacheCrypto() { SecureZero(mKeyBytes, sizeof(mKeyBytes)); }

nsresult CacheCrypto::EncryptBlock(uint64_t aBlockNumber,
                                   const uint8_t* aPlaintext, uint32_t aLen,
                                   uint8_t* aOut, const uint8_t* aAad,
                                   uint32_t aAadLen) {
  if (!mUsable) {
    return NS_ERROR_NOT_AVAILABLE;
  }

  // Layout: [ciphertext(aLen)][tag(kBlockTagLength)][nonce(kBlockNonceLength)].
  // ciphertext||tag are written contiguously by PK11_Encrypt; the nonce
  // follows.
  uint8_t* nonce = aOut + aLen + kBlockTagLength;
  if (PK11_GenerateRandom(nonce, kBlockNonceLength) != SECSuccess) {
    return NS_ERROR_FAILURE;
  }

  return AesGcmOp(mKeyBytes, aBlockNumber, nonce, /* aEncrypt */ true,
                  aPlaintext, aLen, aOut, aLen + kBlockTagLength, aAad,
                  aAadLen);
}

nsresult CacheCrypto::DecryptBlock(uint64_t aBlockNumber, uint8_t* aIn,
                                   uint32_t aLen, uint8_t* aOut,
                                   const uint8_t* aAad, uint32_t aAadLen) {
  if (!mUsable) {
    return NS_ERROR_NOT_AVAILABLE;
  }

  // aIn is [ciphertext(aLen)][tag(kBlockTagLength)][nonce(kBlockNonceLength)].
  const uint8_t* nonce = aIn + aLen + kBlockTagLength;

  return AesGcmOp(mKeyBytes, aBlockNumber, nonce, /* aEncrypt */ false, aIn,
                  aLen + kBlockTagLength, aOut, aLen, aAad, aAadLen);
}

}  // namespace net
}  // namespace mozilla
