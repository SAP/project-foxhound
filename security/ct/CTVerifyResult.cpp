/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "CTVerifyResult.h"

#include <stdint.h>

namespace mozilla {
namespace ct {

VerifiedSCT::VerifiedSCT(SignedCertificateTimestamp&& sct, SCTOrigin origin,
                         CTLogOperatorId logOperatorId, CTLogState logState,
                         CTLogFormat logFormat, uint64_t logTimestamp)
    : sct(std::move(sct)),
      origin(origin),
      logOperatorId(logOperatorId),
      logState(logState),
      logFormat(logFormat),
      logTimestamp(logTimestamp) {}

void CTVerifyResult::Reset() {
  verifiedScts.clear();
  decodingErrors = 0;
  sctsFromUnknownLogs = 0;
  sctsWithInvalidSignatures = 0;
  sctsWithInvalidTimestamps = 0;
  sctsWithDistrustedTimestamps = 0;
  embeddedSCTs = 0;
  sctsFromTLSHandshake = 0;
  sctsFromOCSP = 0;
}

}  // namespace ct
}  // namespace mozilla
