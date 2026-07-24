/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.gecko.process;

import android.os.Build;
import org.mozilla.gecko.annotation.WrapForJNI;

@WrapForJNI
public enum GeckoProcessType {
  // These need to match the stringified names from the GeckoProcessType enum
  PARENT("default"),
  OBSOLETE1("plugin"),
  CONTENT("tab"),
  IPDLUNITTEST("ipdlunittest"),
  GMPLUGIN("gmplugin"),
  GPU("gpu"),
  VR("vr"),
  RDD("rdd"),
  SOCKET("socket"),
  OBSOLETE2("sandboxbroker"),
  FORKSERVER("forkserver"),
  UTILITY("utility"),
  CONTENT_ISOLATED("isolatedTab"),
  CONTENT_ISOLATED_WITH_ZYGOTE("isolatedTabWithZygote");

  private final String mGeckoName;

  GeckoProcessType(final String geckoName) {
    mGeckoName = geckoName;
  }

  @Override
  public String toString() {
    return mGeckoName;
  }

  @WrapForJNI
  private static GeckoProcessType fromInt(final int type) {
    return values()[type];
  }

  /**
   * Convenience method to determine what the process type should be based on runtime settings.
   *
   * <p>Note: App Zygote isolated process enabled will take precedence over plain isolated process
   * enabled. Must be SDK 29 or up.
   *
   * @return The corresponding process type.
   */
  /** package */
  static GeckoProcessType determineContentProcessType() {
    final GeckoProcessManager pm = GeckoProcessManager.getInstance();
    if (pm.isAppZygoteEnabled() && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      return GeckoProcessType.CONTENT_ISOLATED_WITH_ZYGOTE;
    } else if (pm.isIsolatedProcessEnabled()) {
      return GeckoProcessType.CONTENT_ISOLATED;
    } else {
      return GeckoProcessType.CONTENT;
    }
  }
}
