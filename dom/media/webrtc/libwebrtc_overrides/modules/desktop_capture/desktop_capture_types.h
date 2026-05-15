/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#ifndef DOM_MEDIA_WEBRTC_LIBWEBRTCOVERRIDES_MODULES_DESKTOP_CAPTURE_DESKTOP_CAPTURE_TYPES_H_
#define DOM_MEDIA_WEBRTC_LIBWEBRTCOVERRIDES_MODULES_DESKTOP_CAPTURE_DESKTOP_CAPTURE_TYPES_H_

#ifdef XP_WIN       // Moving this into the global namespace
typedef int pid_t;  // matching what used to be in
#endif              // video_capture_defines.h

#include "../../third_party/libwebrtc/modules/desktop_capture/desktop_capture_types.h"

#endif  // DOM_MEDIA_WEBRTC_LIBWEBRTCOVERRIDES_MODULES_DESKTOP_CAPTURE_DESKTOP_CAPTURE_TYPES_H_
