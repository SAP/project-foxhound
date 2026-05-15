/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#ifndef DOM_MEDIA_WEBRTC_LIBWEBRTCOVERRIDES_MODULES_DESKTOP_CAPTURE_LINUX_X11_X_ERROR_TRAP_H_
#define DOM_MEDIA_WEBRTC_LIBWEBRTCOVERRIDES_MODULES_DESKTOP_CAPTURE_LINUX_X11_X_ERROR_TRAP_H_

#include <X11/Xlibint.h>
#undef max  // Xlibint.h defines this and it breaks std::max
#undef min  // Xlibint.h defines this and it breaks std::min

namespace webrtc {

// Helper class that registers X Window error handler. Caller can use
// GetLastErrorAndDisable() to get the last error that was caught, if any.
// An XErrorTrap may be constructed on any thread, but errors are collected
// from all threads and so |display| should be used only on one thread.
// Other Displays are unaffected.
class XErrorTrap {
 public:
  explicit XErrorTrap(Display* display);
  ~XErrorTrap();

  XErrorTrap(const XErrorTrap&) = delete;
  XErrorTrap& operator=(const XErrorTrap&) = delete;

  // Returns last error and removes unregisters the error handler.
  // Must not be called more than once.
  int GetLastErrorAndDisable();

 private:
  static Bool XServerErrorHandler(Display* display, xReply* rep,
                                  char* /* buf */, int /* len */,
                                  XPointer data);

  _XAsyncHandler async_handler_;
  Display* display_;
  unsigned long last_ignored_request_;
  int last_xserver_error_code_;
  bool enabled_;
};

}  // namespace webrtc

#endif  // DOM_MEDIA_WEBRTC_LIBWEBRTCOVERRIDES_MODULES_DESKTOP_CAPTURE_LINUX_X11_X_ERROR_TRAP_H_
