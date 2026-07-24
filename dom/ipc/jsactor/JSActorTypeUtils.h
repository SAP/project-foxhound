/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef MOZILLA_DOM_IPC_JSACTOR_JSACTORTYPEUTILS_H_
#define MOZILLA_DOM_IPC_JSACTOR_JSACTORTYPEUTILS_H_

#include "js/RootingAPI.h"
#include "js/Value.h"
#include "jstypes.h"
#include "mozilla/dom/BindingDeclarations.h"
#include "mozilla/dom/JSActorTypeUtilsBinding.h"

namespace mozilla {

class ErrorResult;

namespace dom {

class JSActorTypeUtils {
 public:
  static void SerializeDeserialize(const GlobalObject& aGlobal, bool aStrict,
                                   JS::Handle<JS::Value> aVal,
                                   JS::MutableHandle<JS::Value> aRetVal,
                                   ErrorResult& aError);
};

}  // namespace dom
}  // namespace mozilla

#endif  // MOZILLA_DOM_IPC_JSACTOR_JSACTORTYPEUTILS_H_
