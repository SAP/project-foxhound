/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_widget_WidgetLogging_h_
#define mozilla_widget_WidgetLogging_h_

#include "mozilla/Logging.h"

extern mozilla::LazyLogModule sWidgetDragServiceLog;
#define __DRAGSERVICE_LOG__(logLevel, ...) \
  MOZ_LOG(sWidgetDragServiceLog, logLevel, __VA_ARGS__)
#define DRAGSERVICE_LOGD(...) \
  __DRAGSERVICE_LOG__(mozilla::LogLevel::Debug, (__VA_ARGS__))
#define DRAGSERVICE_LOGI(...) \
  __DRAGSERVICE_LOG__(mozilla::LogLevel::Info, (__VA_ARGS__))
#define DRAGSERVICE_LOGE(...) \
  __DRAGSERVICE_LOG__(mozilla::LogLevel::Error, (__VA_ARGS__))

#endif  // mozilla_widget_WidgetLogging_h_
