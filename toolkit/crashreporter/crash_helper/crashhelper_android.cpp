/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include <jni.h>

#include <android/log.h>
#include <fcntl.h>
#include <sys/socket.h>
#include <sys/un.h>
#include <unistd.h>

#include "mozilla/crash_helper_ffi_generated.h"

#define CRASH_HELPER_LOGTAG "GeckoCrashHelper"

extern "C" JNIEXPORT void JNICALL
Java_org_mozilla_gecko_crashhelper_CrashHelper_crash_1generator(
    JNIEnv* jenv, jclass, jint pid, jint breakpad_fd, jstring minidump_path,
    jint server_fd) {
  // The breakpad server socket needs to be put in non-blocking mode, we do it
  // here as the Rust code that picks it up won't touch it anymore and just
  // pass it along to Breakpad.
  int flags = fcntl(breakpad_fd, F_GETFL);
  if (flags == -1) {
    __android_log_print(ANDROID_LOG_FATAL, CRASH_HELPER_LOGTAG,
                        "Unable to get the Breakpad pipe file options");
    close(breakpad_fd);
    close(server_fd);
    return;
  }

  int res = fcntl(breakpad_fd, F_SETFL, flags | O_NONBLOCK);
  if (res == -1) {
    __android_log_print(ANDROID_LOG_FATAL, CRASH_HELPER_LOGTAG,
                        "Unable to set the Breakpad pipe in non-blocking mode");
    close(breakpad_fd);
    close(server_fd);
    return;
  }

  const char* minidump_path_str =
      jenv->GetStringUTFChars(minidump_path, nullptr);
  const RawIPCConnector pipe = {.socket = server_fd};
  crash_generator_logic_android(pid, breakpad_fd, minidump_path_str, pipe);
  jenv->ReleaseStringUTFChars(minidump_path, minidump_path_str);
}
