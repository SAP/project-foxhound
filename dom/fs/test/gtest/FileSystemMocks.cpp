/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "FileSystemMocks.h"

#include <string>

#include "ErrorList.h"
#include "gtest/gtest-assertion-result.h"
#include "js/RootingAPI.h"
#include "jsapi.h"
#include "mozilla/dom/FileSystemManager.h"
#include "nsContentUtils.h"
#include "nsISupports.h"

namespace mozilla::dom::fs::test {

nsIGlobalObject* GetGlobal() {
  AutoJSAPI jsapi;
  DebugOnly<bool> ok = jsapi.Init(xpc::PrivilegedJunkScope());
  MOZ_ASSERT(ok);

  JSContext* cx = jsapi.cx();
  mozilla::dom::GlobalObject globalObject(cx, JS::CurrentGlobalOrNull(cx));
  nsCOMPtr<nsIGlobalObject> global =
      do_QueryInterface(globalObject.GetAsSupports());
  MOZ_ASSERT(global);

  return global.get();
}

MockGlobalObject* GetMockGlobal() {
  nsCOMPtr<nsIGlobalObject> global = GetGlobal();
  MockGlobalObject* mock = new MockGlobalObject(std::move(global));

  return mock;
}

nsresult GetAsString(const RefPtr<Promise>& aPromise, nsAString& aString) {
  AutoJSAPI jsapi;
  DebugOnly<bool> ok = jsapi.Init(xpc::PrivilegedJunkScope());
  MOZ_ASSERT(ok);

  JSContext* cx = jsapi.cx();

  JS::Rooted<JSObject*> promiseObj(cx, aPromise->PromiseObj());
  JS::Rooted<JS::Value> vp(cx, JS::GetPromiseResult(promiseObj));

  switch (aPromise->State()) {
    case Promise::PromiseState::Pending: {
      return NS_ERROR_DOM_INVALID_STATE_ERR;
    }

    case Promise::PromiseState::Resolved: {
      if (nsContentUtils::StringifyJSON(cx, vp, aString,
                                        UndefinedIsNullStringLiteral)) {
        return NS_OK;
      }

      return NS_ERROR_UNEXPECTED;
    }

    case Promise::PromiseState::Rejected: {
      if (vp.isInt32()) {
        int32_t errorCode = vp.toInt32();
        aString.AppendInt(errorCode);

        return NS_OK;
      }

      if (!vp.isObject()) {
        return NS_ERROR_UNEXPECTED;
      }

      RefPtr<Exception> exception;
      UNWRAP_OBJECT(Exception, &vp, exception);
      if (!exception) {
        return NS_ERROR_UNEXPECTED;
      }

      aString.Append(NS_ConvertUTF8toUTF16(
          GetStaticErrorName(static_cast<nsresult>(exception->Result()))));

      return NS_OK;
    }

    default:
      break;
  }

  return NS_ERROR_FAILURE;
}

mozilla::ipc::PrincipalInfo GetPrincipalInfo() {
  return mozilla::ipc::PrincipalInfo{mozilla::ipc::SystemPrincipalInfo{}};
}

}  // namespace mozilla::dom::fs::test

NS_IMPL_CYCLE_COLLECTION_WRAPPERCACHE_CLASS(MockGlobalObject)

NS_IMPL_CYCLE_COLLECTION_UNLINK_BEGIN(MockGlobalObject)
  NS_IMPL_CYCLE_COLLECTION_UNLINK(mGlobal)
  NS_IMPL_CYCLE_COLLECTION_UNLINK_PRESERVED_WRAPPER
NS_IMPL_CYCLE_COLLECTION_UNLINK_END

NS_IMPL_CYCLE_COLLECTION_TRAVERSE_BEGIN(MockGlobalObject)
  NS_IMPL_CYCLE_COLLECTION_TRAVERSE(mGlobal)
NS_IMPL_CYCLE_COLLECTION_TRAVERSE_END

NS_INTERFACE_TABLE_HEAD(MockGlobalObject)
  NS_WRAPPERCACHE_INTERFACE_TABLE_ENTRY
  NS_INTERFACE_TABLE(MockGlobalObject, nsIGlobalObject)
  NS_INTERFACE_TABLE_TO_MAP_SEGUE_CYCLE_COLLECTION(MockGlobalObject)
NS_INTERFACE_MAP_END

NS_IMPL_CYCLE_COLLECTING_ADDREF(MockGlobalObject)
NS_IMPL_CYCLE_COLLECTING_RELEASE(MockGlobalObject)
