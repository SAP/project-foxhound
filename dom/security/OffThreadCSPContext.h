/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_OffThreadCSPContext_h_
#define mozilla_dom_OffThreadCSPContext_h_

#include "mozilla/Result.h"
#include "mozilla/UniquePtr.h"
#include "mozilla/dom/nsCSPUtils.h"
#include "mozilla/ipc/PBackgroundSharedTypes.h"
#include "nscore.h"

class nsIContentSecurityPolicy;

namespace mozilla::dom {

// A minimal version of nsCSPContext that can run on worker and worklet threads.
class OffThreadCSPContext final {
 public:
  explicit OffThreadCSPContext(mozilla::ipc::CSPInfo&& aInfo)
      : mCSPInfo(aInfo) {}

  static Result<UniquePtr<OffThreadCSPContext>, nsresult> CreateFromCSP(
      nsIContentSecurityPolicy* aCSP);

  const mozilla::ipc::CSPInfo& CSPInfo() const { return mCSPInfo; }
  const nsTArray<UniquePtr<const nsCSPPolicy>>& Policies();

  bool IsEvalAllowed(bool& aReportViolation);
  bool IsWasmEvalAllowed(bool& aReportViolation);

 private:
  void EnsureIPCPoliciesRead();

  // Thread boundaries require us to not only store a CSP object, but also a
  // serialized version of the CSP. Reason being: Serializing a CSP to a CSPInfo
  // needs to happen on the main thread, but storing the CSPInfo needs to happen
  // on the worker/worklet thread.
  mozilla::ipc::CSPInfo mCSPInfo;

  // This is created lazily by parsing the policies in CSPInfo on the
  // worker/worklet thread.
  nsTArray<UniquePtr<const nsCSPPolicy>> mPolicies;
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_OffThreadCSPContext_h_
