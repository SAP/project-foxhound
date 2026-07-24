/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef MMPrinter_h
#define MMPrinter_h

#include "mozilla/Maybe.h"
#include "mozilla/dom/DOMTypes.h"
#include "nsString.h"

namespace mozilla::dom {

class MMPrinter {
 public:
  static void Print(char const* aLocation, const nsAString& aMsg,
                    ipc::StructuredCloneData* aData) {
    if (MOZ_UNLIKELY(MOZ_LOG_TEST(MMPrinter::sMMLog, LogLevel::Debug))) {
      Maybe<uint64_t> msgId = MMPrinter::PrintHeader(aLocation, aMsg);
      if (!msgId.isSome()) {
        return;
      }
      MMPrinter::PrintData(*msgId, aData);
    }
  }

  static void Print(char const* aLocation, const nsACString& aActorName,
                    const nsAString& aMessageName,
                    ipc::StructuredCloneData* aData) {
    if (MOZ_UNLIKELY(MOZ_LOG_TEST(MMPrinter::sMMLog, LogLevel::Debug))) {
      Maybe<uint64_t> msgId = MMPrinter::PrintHeader(
          aLocation,
          NS_ConvertUTF8toUTF16(aActorName + " - "_ns) + aMessageName);

      if (!msgId.isSome()) {
        return;
      }

      MMPrinter::PrintData(*msgId, aData);
    }
  }

 private:
  static LazyLogModule sMMLog;
  static Maybe<uint64_t> PrintHeader(char const* aLocation,
                                     const nsAString& aMsg);
  static void PrintData(uint64_t aMsgId, ipc::StructuredCloneData* aData);
};

}  // namespace mozilla::dom

#endif /* MMPrinter_h */
