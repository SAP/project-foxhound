/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#if !defined(NIGHTLY_BUILD) || defined(MOZ_NO_SMART_CARDS)
#  error This file should only be used under NIGHTLY_BUILD and when MOZ_NO_SMART_CARDS is not defined.
#endif  // !NIGHTLY_BUILD || MOZ_NO_SMART_CARDS

#include "gtest/gtest.h"
#include "mozilla/gtest/ipc/TestUtilityProcess.h"
#include "mozilla/gtest/WaitFor.h"
#include "mozilla/ipc/UtilityProcessManager.h"
#include "mozilla/psm/PKCS11ModuleParent.h"
#include "nsThreadUtils.h"

#include <vector>

using namespace mozilla;
using namespace mozilla::gtest::ipc;
using namespace mozilla::ipc;
using namespace mozilla::psm;

class psm_UtilityPKCS11Module : public TestUtilityProcess {};

TEST_F(psm_UtilityPKCS11Module, Launch) {
  auto manager = UtilityProcessManager::GetSingleton();
  ASSERT_TRUE(manager);

  auto res = WaitFor(manager->StartPKCS11Module());
  ASSERT_TRUE(res.isOk())
  << "LaunchError: " << res.inspectErr().FunctionName() << ", "
  << res.inspectErr().ErrorCode();

  auto parent = res.unwrap();
  ASSERT_TRUE(parent);
  ASSERT_TRUE(parent->CanSend());

  auto utilityPid = manager->ProcessPid(SandboxingKind::PKCS11_MODULE);
  ASSERT_TRUE(utilityPid.isSome());
  ASSERT_GE(*utilityPid, base::ProcessId(1));

  manager->CleanShutdown(SandboxingKind::PKCS11_MODULE);

  utilityPid = manager->ProcessPid(SandboxingKind::PKCS11_MODULE);
  ASSERT_TRUE(utilityPid.isNothing());

  // Drain the event queue.
  NS_ProcessPendingEvents(nullptr);
}

TEST_F(psm_UtilityPKCS11Module, LoadModule) {
  auto manager = UtilityProcessManager::GetSingleton();
  ASSERT_TRUE(manager);

  auto res = WaitFor(manager->StartPKCS11Module());
  ASSERT_TRUE(res.isOk())
  << "LaunchError: " << res.inspectErr().FunctionName() << ", "
  << res.inspectErr().ErrorCode();

  auto parent = res.unwrap();
  ASSERT_TRUE(parent);
  ASSERT_TRUE(parent->CanSend());

  std::vector<std::pair<nsString, nsresult>> expectedResultValues{
      std::make_pair(u"MySecretModule"_ns, NS_OK),
      std::make_pair(u"AnyOtherModule"_ns, NS_ERROR_NOT_IMPLEMENTED)};
  for (const auto& [module, expected] : expectedResultValues) {
    NS_ConvertUTF16toUTF8 utf8Module(module);
    printf_stderr("Loading module %s\n", utf8Module.get());

    auto ipcResult = WaitFor(parent->SendLoadModule(module));
    ASSERT_TRUE(ipcResult.isOk())
    << "ResponseRejectReason: "
    << static_cast<std::underlying_type<ResponseRejectReason>::type>(
           ipcResult.inspectErr());

    auto result = ipcResult.inspect();
    ASSERT_EQ(result, expected);
  }

  manager->CleanShutdown(SandboxingKind::PKCS11_MODULE);

  // Drain the event queue.
  NS_ProcessPendingEvents(nullptr);
}
