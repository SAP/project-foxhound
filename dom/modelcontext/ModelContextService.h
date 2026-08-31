/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_ModelContextService_h
#define mozilla_dom_ModelContextService_h

#include "mozilla/StaticPtr.h"
#include "nsIModelContextService.h"

namespace mozilla::dom {

class ModelContextService final : public nsIModelContextService {
 public:
  NS_DECL_ISUPPORTS
  NS_DECL_NSIMODELCONTEXTSERVICE

  static already_AddRefed<ModelContextService> GetSingleton();

 private:
  ~ModelContextService() = default;

  static StaticRefPtr<ModelContextService> sSingleton;
};

}  // namespace mozilla::dom

#endif  // mozilla_dom_ModelContextService_h
