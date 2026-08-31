/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "AboutThirdParty.h"

#include <windows.h>
#include <shlobj.h>
#include <shobjidl.h>

namespace mozilla {

NS_IMETHODIMP AboutThirdParty::LoadModuleForTesting(
    const nsAString& aModuleName) {
  HMODULE module = ::LoadLibraryW(PromiseFlatString(aModuleName).get());

  // We don't need to keep the module around; just loading it is sufficient.
  if (module) {
    ::FreeLibrary(module);
    return NS_OK;
  }

  // auto const err [[maybe_unused]] = ::GetLastError();
  return NS_ERROR_UNEXPECTED;
}

}  // namespace mozilla
