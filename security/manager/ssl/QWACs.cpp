/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "nsIX509CertDB.h"

#include "CryptoTask.h"
#include "QWACTrustDomain.h"
#include "mozilla/dom/Promise.h"
#include "mozpkix/pkix.h"
#include "mozpkix/pkixder.h"
#include "mozpkix/pkixnss.h"
#include "mozpkix/pkixtypes.h"
#include "mozpkix/pkixutil.h"
#include "nsIX509Cert.h"
#include "nsNSSCertificateDB.h"

using namespace mozilla::pkix;
using namespace mozilla::psm;

using mozilla::dom::Promise;

class VerifyQWACTask : public mozilla::CryptoTask {
 public:
  VerifyQWACTask(nsIX509CertDB::QWACType aType, nsIX509Cert* aCert,
                 const nsACString& aHostname,
                 const nsTArray<RefPtr<nsIX509Cert>>& aCollectedCerts,
                 RefPtr<Promise>& aPromise)
      : mType(aType),
        mCert(aCert),
        mHostname(aHostname),
        mCollectedCerts(aCollectedCerts.Clone()),
        mPromise(new nsMainThreadPtrHolder<Promise>("VerifyQWACTask::mPromise",
                                                    aPromise)),
        mVerified(false) {}

 private:
  virtual nsresult CalculateResult() override;
  virtual void CallCallback(nsresult rv) override;

  nsIX509CertDB::QWACType mType;
  RefPtr<nsIX509Cert> mCert;
  nsCString mHostname;
  nsTArray<RefPtr<nsIX509Cert>> mCollectedCerts;
  nsMainThreadPtrHandle<Promise> mPromise;

  bool mVerified;
};

// Does this certificate have the correct qcStatements ("qualified certificate
// statements") to be a QWAC ("qualified website authentication certificate")?
// ETSI EN 319 412-5 Clauses 4.2.1 and 4.2.3 state that a certificate issued in
// compliance with Annex IV of Regulation (EU) No 910/2014 (i.e. a QWAC) has
//   1) a QCStatement with statementId equal to id-etsi-qsc-QcCompliance and
//      an omitted statementInfo, and
//   2) a QCStatement with statementId equal to id-etsi-qcs-QcType and a
//      statementInfo of length one that contains the id-etsi-qct-web
//      identifier.
bool CertHasQWACSQCStatements(Input cert) {
  using namespace mozilla::pkix::der;

  // python DottedOIDToCode.py id-etsi-qcs-QcCompliance 0.4.0.1862.1.1
  static const uint8_t id_etsi_qcs_QcCompliance[] = {0x04, 0x00, 0x8e,
                                                     0x46, 0x01, 0x01};

  // python DottedOIDToCode.py id-etsi-qcs-QcType 0.4.0.1862.1.6
  static const uint8_t id_etsi_qcs_QcType[] = {0x04, 0x00, 0x8e,
                                               0x46, 0x01, 0x06};

  // python DottedOIDToCode.py id-etsi-qct-web 0.4.0.1862.1.6.3
  static const uint8_t id_etsi_qct_web[] = {0x04, 0x00, 0x8e, 0x46,
                                            0x01, 0x06, 0x03};

  BackCert backCert(cert, EndEntityOrCA::MustBeEndEntity, nullptr);
  if (backCert.Init() != Success) {
    return false;
  }
  const Input* qcStatementsInput(backCert.GetQCStatements());
  if (!qcStatementsInput) {
    return false;
  }
  Reader qcStatements(*qcStatementsInput);
  // QCStatements ::= SEQUENCE OF QCStatement
  // QCStatement ::= SEQUENCE {
  //     statementId   QC-STATEMENT.&Id({SupportedStatements}),
  //     statementInfo QC-STATEMENT.&Type
  //     ({SupportedStatements}{@statementId}) OPTIONAL }
  //
  // SupportedStatements QC-STATEMENT ::= { qcStatement-1,...}
  bool foundQCComplianceStatement = false;
  bool foundQCTypeStatementWithWebType = false;
  mozilla::pkix::Result rv =
      NestedOf(qcStatements, SEQUENCE, SEQUENCE, EmptyAllowed::No,
               [&](Reader& qcStatementContents) {
                 Reader statementId;
                 mozilla::pkix::Result rv = ExpectTagAndGetValue(
                     qcStatementContents, OIDTag, statementId);
                 if (rv != Success) {
                   return rv;
                 }
                 if (statementId.MatchRest(id_etsi_qcs_QcCompliance)) {
                   foundQCComplianceStatement = true;
                   return End(qcStatementContents);
                 }
                 if (statementId.MatchRest(id_etsi_qcs_QcType)) {
                   Reader supportedStatementsContents;
                   rv = ExpectTagAndGetValue(qcStatementContents, SEQUENCE,
                                             supportedStatementsContents);
                   if (rv != Success) {
                     return rv;
                   }
                   Reader supportedStatementId;
                   rv = ExpectTagAndGetValue(supportedStatementsContents,
                                             OIDTag, supportedStatementId);
                   if (supportedStatementId.MatchRest(id_etsi_qct_web)) {
                     foundQCTypeStatementWithWebType = true;
                   }
                   rv = End(supportedStatementsContents);
                   if (rv != Success) {
                     return rv;
                   }
                   return End(qcStatementContents);
                 }
                 // Ignore the contents of unknown qcStatements.
                 qcStatementContents.SkipToEnd();
                 return Success;
               });
  if (rv != Success) {
    return false;
  }
  if (!qcStatements.AtEnd()) {
    return false;
  }
  return foundQCComplianceStatement && foundQCTypeStatementWithWebType;
}

// Helper function to determine if a certificate has a policy from the given
// list of acceptable policies.
bool CertHasPolicyFrom(Input cert, const nsTArray<Input>& policies) {
  using namespace mozilla::pkix::der;

  BackCert backCert(cert, EndEntityOrCA::MustBeEndEntity, nullptr);
  if (backCert.Init() != Success) {
    return false;
  }
  const Input* certificatePoliciesInput(backCert.GetCertificatePolicies());
  if (!certificatePoliciesInput) {
    return false;
  }
  Reader certificatePolicies(*certificatePoliciesInput);
  // certificatePolicies ::= SEQUENCE SIZE (1..MAX) OF PolicyInformation
  // PolicyInformation ::= SEQUENCE {
  //   policyIdentifier   CertPolicyId,
  //   ...
  // }
  // CertPolicyId ::= OBJECT IDENTIFIER
  bool foundPolicy = false;
  mozilla::pkix::Result rv =
      NestedOf(certificatePolicies, SEQUENCE, SEQUENCE, EmptyAllowed::No,
               [&](Reader& policyInformationContents) {
                 Reader policyIdentifier;
                 mozilla::pkix::Result rv = ExpectTagAndGetValue(
                     policyInformationContents, OIDTag, policyIdentifier);
                 if (rv != Success) {
                   return rv;
                 }
                 for (const auto& policy : policies) {
                   if (policyIdentifier.MatchRest(policy)) {
                     foundPolicy = true;
                   }
                 }
                 return Success;
               });
  if (rv != Success) {
    return false;
  }
  if (!certificatePolicies.AtEnd()) {
    return false;
  }
  return foundPolicy;
}

// For 1-QWACs, ETSI TS 119 411-5 V2.1.1 clause 6.1.2 ("Validation of QWACs")
// item 5 references clause 4.1.2, which references clause 4.1.1, which states
// that such certificates must have either the QEVCP-w or QNCP-w policy as
// specified in ETSI EN 319 411-2.
bool CertHas1QWACPolicy(Input cert) {
  // QEVCP-w is itu-t(0) identified-organization(4) etsi(0)
  //   qualified-certificate-policies(194112) policy-identifiers(1) qcp-web (4)
  // python DottedOIDToCode.py qevcp-w 0.4.0.194112.1.4
  static const uint8_t qevcp_w[] = {0x04, 0x00, 0x8b, 0xec, 0x40, 0x01, 0x04};

  // QNCP-w is itu-t(0) identified-organization(4) etsi(0)
  //   qualified-certificate-policies(194112) policy-identifiers(1) qncp-web (5)
  // python DottedOIDToCode.py qncp-w 0.4.0.194112.1.5
  static const uint8_t qncp_w[] = {0x04, 0x00, 0x8b, 0xec, 0x40, 0x01, 0x05};

  return CertHasPolicyFrom(cert, {Input(qevcp_w), Input(qncp_w)});
}

// For 2-QWACs, ETSI TS 119 411-5 V2.1.1 clause 6.1.2 ("Validation of QWACs")
// item 5 references clause 4.2.2, which references clause 4.2.1, which states
// that such certificates must have the QNCP-w-gen policy as specified in ETSI
// EN 319 411-2.
bool CertHas2QWACPolicy(Input cert) {
  // QEVCP-w-gen is itu-t(0) identified-organization(4) etsi(0)
  //   qualified-certificate-policies(194112) policy-identifiers(1)
  //   qncp-web-gen (6)
  // python DottedOIDToCode.py qevcp-w-gen 0.4.0.194112.1.6
  static const uint8_t qevcp_w_gen[] = {0x04, 0x00, 0x8b, 0xec,
                                        0x40, 0x01, 0x06};

  return CertHasPolicyFrom(cert, {Input(qevcp_w_gen)});
}

// ETSI TS 119 411-5 V2.1.1 states that "The 2-QWAC certificate shall be issued
// in accordance with ETSI EN 319 412-4 [4] for the relevant certificate policy
// as identified in clause 4.2.1 of the present document, except as described
// below:
//   * the extKeyUsage value shall only assert the extendedKeyUsage purpose of
//     id-kp-tls-binding as specified in Annex A."
// This is interpreted to mean the 2-QWAC certificate must have an
// extendedKeyUsage extension and it must contain only id-kp-tls-binding, and
// that there are no particular restrictions or requirements of the other
// certificates in the chain with regard to EKU extensions.
bool CertOnlyHasTLSBindingEKU(Input cert) {
  using namespace mozilla::pkix::der;

  // ETSI TS 119 411-5 V2.1.1 Annex A:
  // id-tlsBinding OBJECT IDENTIFIER ::= { itu-t(0) identified-organization(4)
  //   etsi(0) id-qwacImplementation(194115) tls-binding (1) }
  // id-kp-tls-binding OBJECT IDENTIFIER ::= { id-tlsBinding
  //   id-kp-tls-binding(0) }
  // python DottedOIDToCode.py id-kp-tls-binding 0.4.0.194115.1.0
  static const uint8_t id_kp_tls_binding[] = {0x04, 0x00, 0x8b, 0xec,
                                              0x43, 0x01, 0x00};

  BackCert backCert(cert, EndEntityOrCA::MustBeEndEntity, nullptr);
  if (backCert.Init() != Success) {
    return false;
  }
  const Input* ekuInput(backCert.GetExtKeyUsage());
  if (!ekuInput) {
    return false;
  }
  Reader eku(*ekuInput);
  // Normally, the extended key usage extension is defined like so:
  //   ExtKeyUsageSyntax ::= SEQUENCE SIZE (1..MAX) OF KeyPurposeId
  //   KeyPurposeId ::= OBJECT IDENTIFIER
  // That is, it consists of a SEQUENCE of OBJECT IDENTIFIERs, where each OID
  // identifies a key purpose. However, for 2-QWACs, the EKU must consist of
  // exactly one key purpose ID of id-kp-tls-binding.
  mozilla::pkix::Result rv = Nested(eku, SEQUENCE, OIDTag, [&](Reader& r) {
    if (r.MatchRest(id_kp_tls_binding)) {
      return Success;
    }
    return mozilla::pkix::Result::ERROR_INADEQUATE_CERT_TYPE;
  });
  if (rv != Success) {
    return false;
  }
  return eku.AtEnd();
}

nsresult VerifyQWACTask::CalculateResult() {
  mozilla::psm::QWACTrustDomain trustDomain(mCollectedCerts);
  nsTArray<uint8_t> certDER;
  nsresult rv = mCert->GetRawDER(certDER);
  if (NS_FAILED(rv)) {
    return rv;
  }
  Input cert;
  if (cert.Init(certDER.Elements(), certDER.Length()) != Success) {
    return NS_ERROR_FAILURE;
  }
  if (!CertHasQWACSQCStatements(cert)) {
    return NS_OK;
  }
  if (mType == nsIX509CertDB::QWACType::OneQWAC) {
    if (!CertHas1QWACPolicy(cert)) {
      return NS_OK;
    }
  } else if (mType == nsIX509CertDB::QWACType::TwoQWAC) {
    if (!CertHas2QWACPolicy(cert)) {
      return NS_OK;
    }
    if (!CertOnlyHasTLSBindingEKU(cert)) {
      return NS_OK;
    }
  } else {
    MOZ_ASSERT_UNREACHABLE("unhandled QWAC type");
    return NS_ERROR_FAILURE;
  }

  if (BuildCertChain(trustDomain, cert, Now(), EndEntityOrCA::MustBeEndEntity,
                     KeyUsage::noParticularKeyUsageRequired,
                     KeyPurposeId::anyExtendedKeyUsage, CertPolicyId::anyPolicy,
                     nullptr) != Success) {
    return NS_OK;
  }

  // For 1-QWACs, the hostname should have already been validated in the TLS
  // handshake. However, this operation is not expensive, and it ensures all
  // required checks have been done, in case 1-QWACs are ever re-used in a
  // different context.
  Input hostname;
  if (hostname.Init(mozilla::BitwiseCast<const uint8_t*, const char*>(
                        mHostname.BeginReading()),
                    mHostname.Length()) != Success) {
    return NS_OK;
  }
  // According to ETSI EN 319 412-4 V1.4.1 section 4, certificates following
  // EVCP or QEVCP-w (which includes 1-QWACs) are subject to the CA/Browser
  // Forum's EV Guidelines, which incorporates the Baseline Requirements.
  // Certificates following QNCP-w-gen (which includes 2-QWACs) are subject to
  // the Baseline Requirements with respect to the subject alternative name
  // extension.
  if (CheckCertHostname(cert, hostname) != Success) {
    return NS_OK;
  }

  mVerified = true;
  return NS_OK;
}

void VerifyQWACTask::CallCallback(nsresult rv) {
  if (NS_FAILED(rv)) {
    mPromise->MaybeReject(rv);
  } else {
    mPromise->MaybeResolve(mVerified);
  }
}

NS_IMETHODIMP
nsNSSCertificateDB::AsyncVerifyQWAC(
    QWACType aType, nsIX509Cert* aCert, const nsACString& aHostname,
    const nsTArray<RefPtr<nsIX509Cert>>& aCollectedCerts, JSContext* aCx,
    mozilla::dom::Promise** aPromise) {
  NS_ENSURE_ARG_POINTER(aCx);

  nsIGlobalObject* globalObject = xpc::CurrentNativeGlobal(aCx);
  if (!globalObject) {
    return NS_ERROR_UNEXPECTED;
  }
  mozilla::ErrorResult result;
  RefPtr<Promise> promise = Promise::Create(globalObject, result);
  if (result.Failed()) {
    return result.StealNSResult();
  }

  RefPtr<VerifyQWACTask> task(
      new VerifyQWACTask(aType, aCert, aHostname, aCollectedCerts, promise));
  nsresult rv = task->Dispatch();
  if (NS_FAILED(rv)) {
    return rv;
  }

  promise.forget(aPromise);
  return NS_OK;
}
