/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_FS_SHARED_FILESYSTEMLOG_H_
#define DOM_FS_SHARED_FILESYSTEMLOG_H_

#include "mozilla/Logging.h"

namespace mozilla {
extern LazyLogModule gOPFSLog;
}

#define LOG(args) MOZ_LOG(mozilla::gOPFSLog, mozilla::LogLevel::Debug, args)

#define LOG_VERBOSE(args) \
  MOZ_LOG(mozilla::gOPFSLog, mozilla::LogLevel::Verbose, args)

#define LOG_ENABLED() MOZ_LOG_TEST(mozilla::gOPFSLog, mozilla::LogLevel::Debug)

#endif  // DOM_FS_SHARED_FILESYSTEMLOG_H
