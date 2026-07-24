/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <errno.h>        // For EPERM
#include <sys/syscall.h>  // For syscall()
#include <unistd.h>

#include "mozilla/Assertions.h"

extern "C" {
#if defined(__ANDROID_API__) && (__ANDROID_API__ < 28)

// Bionic introduced support for syncfs only in version 28 (that is
// Android Pie / 9). Since GeckoView is built with version 26, those functions
// aren't defined, but nix needs them and the crash helper relies on nix. These
// functions should never be called in practice hence we implement them only to
// satisfy nix linking requirements but we crash if we accidentally enter them.

int syncfs(int fd) {
  MOZ_CRASH("syncfs() is not available");
  return EPERM;
}

#endif  // __ANDROID_API__ && (__ANDROID_API__ < 28)
}
