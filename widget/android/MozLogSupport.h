/* -*- Mode: c++; c-basic-offset: 2; tab-width: 20; indent-tabs-mode: nil; -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef MozLogSupport_h_
#define MozLogSupport_h_

#include "mozilla/java/MozLogNatives.h"

namespace mozilla::widget {

class MozLogSupport final : public java::MozLog::Natives<MozLogSupport> {
 public:
  static void Print(mozilla::jni::String::Param aName, int32_t aLogLevel,
                    mozilla::jni::String::Param aMessage);
};

}  // namespace mozilla::widget

#endif
