/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <cstddef>
#include <cstdint>
#include <string>

#include "cert.h"
#include "nss_scoped_ptrs.h"

#include "base/database.h"
#include "seccomon.h"

template <typename F, typename... Args>
void TestFunction(F f, Args... args) {
  PORT_Free(f(args...));
}

extern "C" int LLVMFuzzerTestOneInput(const uint8_t* data, size_t size) {
  static NSSDatabase db = NSSDatabase();
  static CERTName* refName = CERT_AsciiToName("CN=Fuzz,O=Fuzz,C=US");
  assert(refName);

  std::string name(data, data + size);

  ScopedCERTName certName(CERT_AsciiToName(name.c_str()));
  if (!certName) {
    return 0;
  }

  TestFunction(CERT_FormatName, certName.get());
  TestFunction(CERT_NameToAscii, certName.get());
  TestFunction(CERT_GetCertEmailAddress, certName.get());

  // These functions call CERT_GetNameElement or CERT_GetLastNameElement
  // with different OIDs.  CERT_GetNameElement itself is static and not
  // accessible from here.
  TestFunction(CERT_GetCertUid, certName.get());
  TestFunction(CERT_GetCommonName, certName.get());
  TestFunction(CERT_GetCountryName, certName.get());
  TestFunction(CERT_GetDomainComponentName, certName.get());
  TestFunction(CERT_GetLocalityName, certName.get());
  TestFunction(CERT_GetOrgName, certName.get());
  TestFunction(CERT_GetOrgUnitName, certName.get());
  TestFunction(CERT_GetStateName, certName.get());

  TestFunction(CERT_NameToAsciiInvertible, certName.get(), CERT_N2A_READABLE);
  TestFunction(CERT_NameToAsciiInvertible, certName.get(), CERT_N2A_STRICT);
  TestFunction(CERT_NameToAsciiInvertible, certName.get(), CERT_N2A_INVERTIBLE);

  // Exercise CERT_CopyName round-trip.
  PORTCheapArenaPool pool;
  PORT_InitCheapArena(&pool, DER_DEFAULT_CHUNKSIZE);

  CERTName copied = {0};
  if (CERT_CopyName(&pool.arena, &copied, certName.get()) == SECSuccess) {
    (void)CERT_CompareName(certName.get(), &copied);
  }

  PORT_DestroyCheapArena(&pool);

  // Compare against a fixed reference name to exercise mismatch paths.
  (void)CERT_CompareName(certName.get(), refName);

  return 0;
}
