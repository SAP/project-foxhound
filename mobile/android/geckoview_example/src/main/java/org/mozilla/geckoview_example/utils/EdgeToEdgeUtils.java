/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.geckoview_example.utils;

import android.os.Build;
import android.view.Window;

/**
 * Utility class to manage edge-to-edge support for Android 15+. It allows the app to draw behind
 * the system bars and control their visibility.
 */
public class EdgeToEdgeUtils {
  private static Window sWindow;
  private static boolean sEdgeToEdgeEnabled = false;
  private static boolean sToolbarHidden = false;

  public static void init(final Window window, final boolean edgeToEdgeEnabled) {
    sWindow = window;
    sEdgeToEdgeEnabled = edgeToEdgeEnabled;
  }

  public static boolean isEdgeToEdgeEnabled() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM || !sEdgeToEdgeEnabled) {
      return false;
    }

    return sToolbarHidden;
  }

  public static void onToolbarVisibilityChanged(final boolean toolbarHidden) {
    applyEdgeToEdge(toolbarHidden);
  }

  public static void setEdgeToEdgeEnabled(final boolean enabled) {
    sEdgeToEdgeEnabled = enabled;
  }

  private static void applyEdgeToEdge(final boolean toolbarHidden) {
    final boolean shouldUpdate = sToolbarHidden != toolbarHidden;
    sToolbarHidden = toolbarHidden;

    if (!sEdgeToEdgeEnabled
        || !shouldUpdate
        || Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) {
      return;
    }

    if (toolbarHidden) {
      sWindow.setNavigationBarContrastEnforced(false);
    } else {
      sWindow.setNavigationBarContrastEnforced(true);
    }

    final var view = sWindow.getDecorView();
    view.dispatchApplyWindowInsets(view.getRootWindowInsets());
  }
}
