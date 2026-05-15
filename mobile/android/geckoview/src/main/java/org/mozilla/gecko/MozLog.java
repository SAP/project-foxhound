/* -*- Mode: Java; c-basic-offset: 2; tab-width: 20; indent-tabs-mode: nil; -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.gecko;

import org.mozilla.gecko.annotation.WrapForJNI;

public class MozLog {
  private static final String LOG_TAG = "MozLog";

  public static final int LOG_LEVEL_DISABLE = 0;
  public static final int LOG_LEVEL_ERROR = 1;
  public static final int LOG_LEVEL_WARNING = 2;
  public static final int LOG_LEVEL_INFO = 3;
  public static final int LOG_LEVEL_DEBUG = 4;
  public static final int LOG_LEVEL_VERBOSE = 5;

  @WrapForJNI(stubName = "Print")
  private static native void printNative(String name, int level, String message);

  public static void print(final String name, final int level, final String message) {
    if (GeckoThread.isRunning()) {
      printNative(name, level, message);
      return;
    }

    GeckoThread.queueNativeCall(
        MozLog.class, "printNative", String.class, name, level, String.class, message);
  }

  public static void d(final String name, final String message) {
    print(name, LOG_LEVEL_DEBUG, message);
  }

  public static void e(final String name, final String message) {
    print(name, LOG_LEVEL_ERROR, message);
  }

  public static void i(final String name, final String message) {
    print(name, LOG_LEVEL_INFO, message);
  }

  public static void v(final String name, final String message) {
    print(name, LOG_LEVEL_VERBOSE, message);
  }

  public static void w(final String name, final String message) {
    print(name, LOG_LEVEL_WARNING, message);
  }
}
