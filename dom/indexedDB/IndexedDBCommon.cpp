/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "IndexedDBCommon.h"

#include "js/StructuredClone.h"
#include "mozilla/SnappyUncompressInputStream.h"
#include "mozilla/StaticPrefs_dom.h"

namespace mozilla::dom::indexedDB {

EnumSet<ValidatePrincipalOptions> PrincipalValidationOptions() {
  EnumSet<ValidatePrincipalOptions> options;
  if (StaticPrefs::dom_indexedDB_testing_allowContentSystem() &&
      xpc::IsInAutomation()) {
    options += ValidatePrincipalOptions::AllowSystem;
  }
  return options;
}

// aStructuredCloneData is a parameter rather than a return value because one
// caller preallocates it on the heap not immediately before calling for some
// reason. Maybe this could be changed.
nsresult SnappyUncompressStructuredCloneData(
    nsIInputStream& aInputStream, JSStructuredCloneData& aStructuredCloneData) {
  const auto snappyInputStream =
      MakeRefPtr<SnappyUncompressInputStream>(&aInputStream);

  char buffer[kFileCopyBufferSize];

  QM_TRY(CollectEach(
      [&snappyInputStream = *snappyInputStream, &buffer] {
        QM_TRY_RETURN(MOZ_TO_RESULT_INVOKE_MEMBER(snappyInputStream, Read,
                                                  buffer, sizeof(buffer)));
      },
      [&aStructuredCloneData,
       &buffer](const uint32_t& numRead) -> Result<Ok, nsresult> {
        QM_TRY(OkIf(aStructuredCloneData.AppendBytes(buffer, numRead)),
               Err(NS_ERROR_OUT_OF_MEMORY));

        return Ok{};
      }));

  return NS_OK;
}

}  // namespace mozilla::dom::indexedDB
