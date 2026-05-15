/* -*- Mode: c++; c-basic-offset: 2; tab-width: 20; indent-tabs-mode: nil; -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "MozLogSupport.h"
#include "mozilla/Logging.h"

namespace mozilla::widget {

// staitc
void MozLogSupport::Print(jni::String::Param aName, int32_t aLogLevel,
                          jni::String::Param aMessage) {
  LogModule* logModule = LogModule::Get(aName->ToCString().get());
  LogLevel logLevel = ToLogLevel(aLogLevel);
  if (!MOZ_LOG_TEST(logModule, logLevel)) {
    return;  // Don't log if the level is not enabled.
  }

  MOZ_LOG(logModule, logLevel, ("%s", aMessage->ToCString().get()));
}

}  // namespace mozilla::widget
