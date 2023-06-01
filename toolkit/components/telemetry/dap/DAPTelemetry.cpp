/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "DAPTelemetryBindings.h"

#include "mozilla/Logging.h"
#include "nsPromiseFlatString.h"

#include "nss.h"
#include "nsNSSComponent.h"
#include "secmodt.h"
#include "pk11pub.h"
#include "ScopedNSSTypes.h"

static mozilla::LazyLogModule sLogger("DAPTelemetry");
#undef LOG
#define LOG(...) MOZ_LOG(sLogger, mozilla::LogLevel::Debug, (__VA_ARGS__))

namespace mozilla {

NS_IMPL_ISUPPORTS(DAPTelemetry, nsIDAPTelemetry)

// This function was copied from pk11_hpke_unittest.cc
// And modified to take a Span.
static std::vector<uint8_t> Pkcs8(Span<const uint8_t> sk,
                                  Span<const uint8_t> pk) {
  // Only X25519 format.
  std::vector<uint8_t> v(105);
  v.assign({
      0x30, 0x67, 0x02, 0x01, 0x00, 0x30, 0x14, 0x06, 0x07, 0x2a, 0x86, 0x48,
      0xce, 0x3d, 0x02, 0x01, 0x06, 0x09, 0x2b, 0x06, 0x01, 0x04, 0x01, 0xda,
      0x47, 0x0f, 0x01, 0x04, 0x4c, 0x30, 0x4a, 0x02, 0x01, 0x01, 0x04, 0x20,
  });
  v.insert(v.end(), sk.begin(), sk.end());
  v.insert(v.end(), {
                        0xa1,
                        0x23,
                        0x03,
                        0x21,
                        0x00,
                    });
  v.insert(v.end(), pk.begin(), pk.end());
  return v;
}

// This function was copied from cpputil.h
static unsigned char* toUcharPtr(const uint8_t* v) {
  return const_cast<unsigned char*>(static_cast<const unsigned char*>(v));
}

/// If successful this returns a pointer to a HpkeContext which must be
/// released using dapDestroyHpkeContext or PK11_HPKE_DestroyContext.
HpkeContext* dapSetupHpkeContextInternal(
    const uint8_t* aKey, uint32_t aKeyLength, const uint8_t* aInfo,
    uint32_t aInfoLength, SECKEYPublicKey* aPkE, SECKEYPrivateKey* aSkE,
    nsTArray<uint8_t>* aOutputEncapsulatedKey) {
  SECStatus status = PK11_HPKE_ValidateParameters(
      HpkeDhKemX25519Sha256, HpkeKdfHkdfSha256, HpkeAeadAes128Gcm);
  if (status != SECSuccess) {
    MOZ_LOG(sLogger, mozilla::LogLevel::Error,
            ("Invalid HKPE parameters found."));
    return nullptr;
  }

  UniqueHpkeContext context(
      PK11_HPKE_NewContext(HpkeDhKemX25519Sha256, HpkeKdfHkdfSha256,
                           HpkeAeadAes128Gcm, nullptr, nullptr));

  SECKEYPublicKey* pkR_raw = nullptr;
  status = PK11_HPKE_Deserialize(context.get(), aKey, aKeyLength, &pkR_raw);
  UniqueSECKEYPublicKey pkR(pkR_raw);
  pkR_raw = nullptr;
  if (status != SECSuccess) {
    MOZ_LOG(sLogger, mozilla::LogLevel::Error,
            ("Failed to deserialize HPKE encryption key."));
    return nullptr;
  }

  const SECItem hpkeInfo = {siBuffer, toUcharPtr(aInfo), aInfoLength};

  status = PK11_HPKE_SetupS(context.get(), aPkE, aSkE, pkR.get(), &hpkeInfo);
  if (status != SECSuccess) {
    MOZ_LOG(sLogger, mozilla::LogLevel::Error, ("HPKE setup failed."));
    return nullptr;
  }

  const SECItem* hpkeEncapKey = PK11_HPKE_GetEncapPubKey(context.get());
  if (!hpkeEncapKey) {
    MOZ_LOG(sLogger, mozilla::LogLevel::Error,
            ("Failed to get HPKE encapsulated public key."));
    return nullptr;
  }

  aOutputEncapsulatedKey->AppendElements(hpkeEncapKey->data, hpkeEncapKey->len);

  return context.release();
}

extern "C" {
/// If successful this returns a pointer to a PK11Context which must be
/// released using dapReleaseCmac.
void* dapStartCmac(uint8_t* aSeed) {
  MOZ_RELEASE_ASSERT(EnsureNSSInitializedChromeOrContent(),
                     "Could not initialize NSS.");

  UniquePK11SlotInfo slot(PK11_GetBestSlot(CKM_AES_CMAC, nullptr));
  MOZ_RELEASE_ASSERT(slot, "DAPTelemetry: dapStartCmac(): Failed to get slot.");

  SECItem keyItem = {siBuffer, toUcharPtr(aSeed), 16};
  UniquePK11SymKey key(PK11_ImportSymKey(slot.get(), CKM_AES_CMAC,
                                         PK11_OriginUnwrap, CKA_SIGN, &keyItem,
                                         nullptr));
  MOZ_RELEASE_ASSERT(key,
                     "DAPTelemetry: dapStartCmac(): Failed to import key.");

  UniqueSECItem param(PK11_ParamFromIV(CKM_AES_CMAC, nullptr));
  MOZ_RELEASE_ASSERT(
      param, "DAPTelemetry: dapStartCmac(): Failed to create parameters.");

  PK11Context* ctx = PK11_CreateContextBySymKey(CKM_AES_CMAC, CKA_SIGN,
                                                key.get(), param.get());
  MOZ_RELEASE_ASSERT(ctx,
                     "DAPTelemetry: dapStartCmac(): Failed to create context.");

  return ctx;
}

void dapUpdateCmac(void* aContext, const uint8_t* aData, uint32_t aDataLen) {
  SECStatus res =
      PK11_DigestOp(static_cast<PK11Context*>(aContext), aData, aDataLen);
  MOZ_RELEASE_ASSERT(
      res == SECSuccess,
      "DAPTelemetry: dapUpdateCmac(): Mac digest update failed.");
}

void dapFinalizeCmac(void* aContext, uint8_t* aMac) {
  unsigned int maclen = 0;

  SECStatus res =
      PK11_DigestFinal(static_cast<PK11Context*>(aContext), aMac, &maclen, 16);
  MOZ_RELEASE_ASSERT(
      res == SECSuccess,
      "DAPTelemetry: dapFinalizeCmac(): PK11_DigestFinal failed.");
  MOZ_RELEASE_ASSERT(
      maclen == 16,
      "DAPTelemetry: dapFinalizeCmac(): PK11_DigestFinal returned "
      "too few MAC bytes.");
}

void dapReleaseCmac(void* aContext) {
  PK11_DestroyContext(static_cast<PK11Context*>(aContext), true);
}

/// If successful this returns a pointer to a PK11Context which must be
/// released using dapReleaseCtrCtx.
void* dapStartAesCtr(const uint8_t* aKey) {
  MOZ_RELEASE_ASSERT(EnsureNSSInitializedChromeOrContent(),
                     "Could not initialize NSS.");

  UniquePK11SlotInfo slot(PK11_GetBestSlot(CKM_AES_CTR, nullptr));
  MOZ_RELEASE_ASSERT(aKey,
                     "DAPTelemetry: dapStartAesCtr(): Failed to get slot.");

  SECItem ctrKeyItem = {siBuffer, toUcharPtr(aKey), 16};
  UniquePK11SymKey ctrKey(PK11_ImportSymKey(slot.get(), CKM_AES_CTR,
                                            PK11_OriginUnwrap, CKA_ENCRYPT,
                                            &ctrKeyItem, nullptr));
  MOZ_RELEASE_ASSERT(ctrKey,
                     "DAPTelemetry: dapStartAesCtr(): Failed to create key.");

  SECItem ctrParam = {siBuffer, nullptr, 0};
  CK_AES_CTR_PARAMS ctrParamInner;
  ctrParamInner.ulCounterBits = 128;
  memset(&ctrParamInner.cb, 0, 16);
  ctrParam.type = siBuffer;
  ctrParam.data = reinterpret_cast<unsigned char*>(&ctrParamInner);
  ctrParam.len = static_cast<unsigned int>(sizeof(ctrParamInner));

  PK11Context* ctrCtx = PK11_CreateContextBySymKey(CKM_AES_CTR, CKA_ENCRYPT,
                                                   ctrKey.get(), &ctrParam);
  MOZ_RELEASE_ASSERT(
      ctrCtx, "DAPTelemetry: dapStartAesCtr(): Failed to create context.");

  return ctrCtx;
}

void dapCtrFillBuffer(void* aContext, uint8_t* aBuffer, int aBufferSize) {
  int ctlen = 0;
  memset(aBuffer, 0, aBufferSize);
  SECStatus res = PK11_CipherOp(static_cast<PK11Context*>(aContext), aBuffer,
                                &ctlen, aBufferSize, aBuffer, aBufferSize);
  MOZ_RELEASE_ASSERT(res == SECSuccess,
                     "DAPTelemetry: dapCtrFillBuffer(...): Encryption failed.");
}

void dapReleaseCtrCtx(void* aContext) {
  PK11_DestroyContext(static_cast<PK11Context*>(aContext), true);
}

/// Takes additional ephemeral keys to make everything deterministic for test
/// vectors.
/// If successful this returns a pointer to a HpkeContext which must be
/// released using dapDestroyHpkeContext or PK11_HPKE_DestroyContext.
HpkeContext* dapSetupHpkeContextForTesting(
    const uint8_t* aKey, uint32_t aKeyLength, const uint8_t* aInfo,
    uint32_t aInfoLength, const uint8_t* aPkEm, uint32_t aPkEmLength,
    const uint8_t* aSkEm, uint32_t aSkEmLength,
    nsTArray<uint8_t>* aOutputEncapsulatedKey) {
  Span<const uint8_t> sk_e(aSkEm, aSkEm + aSkEmLength);
  Span<const uint8_t> pk_e(aPkEm, aPkEm + aPkEmLength);
  std::vector<uint8_t> pkcs8_e = Pkcs8(sk_e, pk_e);

  MOZ_RELEASE_ASSERT(EnsureNSSInitializedChromeOrContent(),
                     "Could not initialize NSS.");

  UniquePK11SlotInfo slot(PK11_GetInternalSlot());
  MOZ_RELEASE_ASSERT(slot, "Failed to get slot.");

  SECItem keys_e = {siBuffer, toUcharPtr(pkcs8_e.data()),
                    static_cast<unsigned int>(pkcs8_e.size())};
  SECKEYPrivateKey* internal_skE_raw = nullptr;
  SECStatus rv = PK11_ImportDERPrivateKeyInfoAndReturnKey(
      slot.get(), &keys_e, nullptr, nullptr, false, false, KU_ALL,
      &internal_skE_raw, nullptr);
  UniqueSECKEYPrivateKey internal_skE(internal_skE_raw);
  internal_skE_raw = nullptr;
  MOZ_RELEASE_ASSERT(rv == SECSuccess, "Failed to import skE/pkE.");

  UniqueSECKEYPublicKey internal_pkE(
      SECKEY_ConvertToPublicKey(internal_skE.get()));

  UniqueHpkeContext result(dapSetupHpkeContextInternal(
      aKey, aKeyLength, aInfo, aInfoLength, internal_pkE.get(),
      internal_skE.get(), aOutputEncapsulatedKey));

  return result.release();
}

void dapDestroyHpkeContext(HpkeContext* aContext) {
  PK11_HPKE_DestroyContext(aContext, true);
}

bool dapHpkeEncrypt(HpkeContext* aContext, const uint8_t* aAad,
                    uint32_t aAadLength, const uint8_t* aPlaintext,
                    uint32_t aPlaintextLength,
                    nsTArray<uint8_t>* aOutputShare) {
  SECItem aad_si = {siBuffer, toUcharPtr(aAad), aAadLength};
  SECItem plaintext_si = {siBuffer, toUcharPtr(aPlaintext), aPlaintextLength};
  SECItem* chCt = nullptr;
  SECStatus rv = PK11_HPKE_Seal(aContext, &aad_si, &plaintext_si, &chCt);
  if (rv != SECSuccess) {
    return false;
  }
  UniqueSECItem ct(chCt);

  aOutputShare->AppendElements(ct->data, ct->len);
  return true;
}

bool dapHpkeEncryptOneshot(const uint8_t* aKey, uint32_t aKeyLength,
                           const uint8_t* aInfo, uint32_t aInfoLength,
                           const uint8_t* aAad, uint32_t aAadLength,
                           const uint8_t* aPlaintext, uint32_t aPlaintextLength,
                           nsTArray<uint8_t>* aOutputEncapsulatedKey,
                           nsTArray<uint8_t>* aOutputShare) {
  MOZ_RELEASE_ASSERT(EnsureNSSInitializedChromeOrContent(),
                     "Could not initialize NSS.");
  UniqueHpkeContext context(
      dapSetupHpkeContextInternal(aKey, aKeyLength, aInfo, aInfoLength, nullptr,
                                  nullptr, aOutputEncapsulatedKey));
  if (!context) {
    return false;
  }

  return dapHpkeEncrypt(context.get(), aAad, aAadLength, aPlaintext,
                        aPlaintextLength, aOutputShare);
}
}

NS_IMETHODIMP DAPTelemetry::GetReport(
    const nsTArray<uint8_t>& aLeaderHpkeConfig,
    const nsTArray<uint8_t>& aHelperHpkeConfig, uint8_t aMeasurement,
    const nsTArray<uint8_t>& aTaskID, const uint64_t aTimePrecision,
    nsTArray<uint8_t>& aOutReport) {
  MOZ_RELEASE_ASSERT(aTaskID.Length() == 32, "TaskID must have 32 bytes.");
  if (!dapGetReport(&aLeaderHpkeConfig, &aHelperHpkeConfig, aMeasurement,
                    &aTaskID, aTimePrecision, &aOutReport)) {
    return NS_ERROR_FAILURE;
  }

  return NS_OK;
}

}  // namespace mozilla
