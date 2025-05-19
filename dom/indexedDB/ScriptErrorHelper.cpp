/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "ScriptErrorHelper.h"

#include "MainThreadUtils.h"
#include "nsContentUtils.h"
#include "nsThreadUtils.h"

#include "mozilla/SchedulerGroup.h"

namespace {

class ScriptErrorRunnable final : public mozilla::Runnable {
  nsString mMessage;
  nsCString mMessageName;
  mozilla::JSCallingLocation mCallingLocation;
  uint32_t mSeverityFlag;
  uint64_t mInnerWindowID;
  bool mIsChrome;

 public:
  ScriptErrorRunnable(const nsAString& aMessage,
                      const mozilla::JSCallingLocation& aCallingLocation,
                      uint32_t aSeverityFlag, bool aIsChrome,
                      uint64_t aInnerWindowID)
      : mozilla::Runnable("ScriptErrorRunnable"),
        mMessage(aMessage),
        mCallingLocation(aCallingLocation),
        mSeverityFlag(aSeverityFlag),
        mInnerWindowID(aInnerWindowID),
        mIsChrome(aIsChrome) {
    MOZ_ASSERT(!NS_IsMainThread());
    mMessageName.SetIsVoid(true);
  }

  ScriptErrorRunnable(const nsACString& aMessageName,
                      const mozilla::JSCallingLocation& aCallingLocation,
                      uint32_t aSeverityFlag, bool aIsChrome,
                      uint64_t aInnerWindowID)
      : mozilla::Runnable("ScriptErrorRunnable"),
        mMessageName(aMessageName),
        mCallingLocation(aCallingLocation),
        mSeverityFlag(aSeverityFlag),
        mInnerWindowID(aInnerWindowID),
        mIsChrome(aIsChrome) {
    MOZ_ASSERT(!NS_IsMainThread());
    mMessage.SetIsVoid(true);
  }

  static void DumpLocalizedMessage(
      const nsACString& aMessageName,
      const mozilla::JSCallingLocation& aCallingLocation,
      uint32_t aSeverityFlag, bool aIsChrome, uint64_t aInnerWindowID) {
    MOZ_ASSERT(NS_IsMainThread());
    MOZ_ASSERT(!aMessageName.IsEmpty());

    nsAutoString localizedMessage;
    if (NS_WARN_IF(NS_FAILED(nsContentUtils::GetLocalizedString(
            nsContentUtils::eDOM_PROPERTIES, aMessageName.BeginReading(),
            localizedMessage)))) {
      return;
    }
    Dump(localizedMessage, aCallingLocation, aSeverityFlag, aIsChrome,
         aInnerWindowID);
  }

  static void Dump(const nsAString& aMessage,
                   const mozilla::JSCallingLocation& aCallingLocation,
                   uint32_t aSeverityFlag, bool aIsChrome,
                   uint64_t aInnerWindowID) {
    MOZ_ASSERT(NS_IsMainThread());

    nsAutoCString category;
    if (aIsChrome) {
      category.AssignLiteral("chrome ");
    } else {
      category.AssignLiteral("content ");
    }
    category.AppendLiteral("javascript");
    nsContentUtils::ReportToConsoleByWindowID(aMessage, aSeverityFlag, category,
                                              aInnerWindowID, aCallingLocation);
  }

  NS_IMETHOD
  Run() override {
    MOZ_ASSERT(NS_IsMainThread());
    MOZ_ASSERT(mMessage.IsVoid() != mMessageName.IsVoid());

    if (!mMessage.IsVoid()) {
      Dump(mMessage, mCallingLocation, mSeverityFlag, mIsChrome,
           mInnerWindowID);
      return NS_OK;
    }

    DumpLocalizedMessage(mMessageName, mCallingLocation, mSeverityFlag,
                         mIsChrome, mInnerWindowID);

    return NS_OK;
  }

 private:
  virtual ~ScriptErrorRunnable() = default;
};

}  // namespace

namespace mozilla::dom::indexedDB {

/*static*/
void ScriptErrorHelper::Dump(const nsAString& aMessage,
                             const JSCallingLocation& aCallingLocation,
                             uint32_t aSeverityFlag, bool aIsChrome,
                             uint64_t aInnerWindowID) {
  if (NS_IsMainThread()) {
    ScriptErrorRunnable::Dump(aMessage, aCallingLocation, aSeverityFlag,
                              aIsChrome, aInnerWindowID);
  } else {
    RefPtr<ScriptErrorRunnable> runnable = new ScriptErrorRunnable(
        aMessage, aCallingLocation, aSeverityFlag, aIsChrome, aInnerWindowID);
    MOZ_ALWAYS_SUCCEEDS(SchedulerGroup::Dispatch(runnable.forget()));
  }
}

/*static*/
void ScriptErrorHelper::DumpLocalizedMessage(
    const nsACString& aMessageName, const JSCallingLocation& aCallingLocation,
    uint32_t aSeverityFlag, bool aIsChrome, uint64_t aInnerWindowID) {
  if (NS_IsMainThread()) {
    ScriptErrorRunnable::DumpLocalizedMessage(aMessageName, aCallingLocation,
                                              aSeverityFlag, aIsChrome,
                                              aInnerWindowID);
  } else {
    RefPtr<ScriptErrorRunnable> runnable =
        new ScriptErrorRunnable(aMessageName, aCallingLocation, aSeverityFlag,
                                aIsChrome, aInnerWindowID);
    MOZ_ALWAYS_SUCCEEDS(SchedulerGroup::Dispatch(runnable.forget()));
  }
}

}  // namespace mozilla::dom::indexedDB
