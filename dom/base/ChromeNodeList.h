/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_BASE_CHROMENODELIST_H_
#define DOM_BASE_CHROMENODELIST_H_

#include "js/RootingAPI.h"
#include "mozilla/AlreadyAddRefed.h"
#include "mozilla/dom/ContentList.h"

class JSObject;
class nsINode;
struct JSContext;

namespace mozilla {
class ErrorResult;

namespace dom {
class GlobalObject;

class ChromeNodeList final : public SimpleContentList {
 public:
  explicit ChromeNodeList(nsINode* aOwner) : SimpleContentList(aOwner) {}

  static already_AddRefed<ChromeNodeList> Constructor(
      const GlobalObject& aGlobal);

  virtual JSObject* WrapObject(JSContext* aCx,
                               JS::Handle<JSObject*> aGivenProto) override;

  void Append(nsINode& aNode, ErrorResult& aError);
  void Remove(nsINode& aNode, ErrorResult& aError);
};

}  // namespace dom
}  // namespace mozilla

#endif  // DOM_BASE_CHROMENODELIST_H_
