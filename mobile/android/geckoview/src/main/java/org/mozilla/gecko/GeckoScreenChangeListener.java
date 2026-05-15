/* -*- Mode: Java; c-basic-offset: 2; tab-width: 20; indent-tabs-mode: nil; -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.gecko;

import android.content.Context;
import android.hardware.display.DisplayManager;
import android.util.Log;
import org.mozilla.gecko.util.ThreadUtils;

public class GeckoScreenChangeListener implements DisplayManager.DisplayListener {
  private static final String LOGTAG = "ScreenChangeListener";
  private static final boolean DEBUG = false;

  private static final int NOTIFY_SCREEN_DELAY_MS = 100;

  public GeckoScreenChangeListener() {}

  @Override
  public void onDisplayAdded(final int displayId) {}

  @Override
  public void onDisplayRemoved(final int displayId) {
    if (DEBUG) {
      Log.d(LOGTAG, "onDisplayRemoved");
    }

    GeckoAppShell.onDisplayRemoved(displayId);
  }

  @Override
  public void onDisplayChanged(final int displayId) {
    if (DEBUG) {
      Log.d(LOGTAG, "onDisplayChanged");
    }

    // Even if onDisplayChanged is called, Configuration may not updated yet.
    // So we use Display's data instead.
    if (displayId != GeckoAppShell.getDisplayId()) {
      if (DEBUG) {
        Log.d(LOGTAG, "The display that GeckoView is attached is only supported");
      }
      return;
    }

    // When getting screen information immediately, this may not be valid yet.
    // So we need a few delays.
    ThreadUtils.postToUiThreadDelayed(
        new Runnable() {
          @Override
          public void run() {
            if (GeckoScreenOrientation.getInstance().update()) {
              // refreshScreenInfo is already called.
              return;
            }
            ScreenManagerHelper.refreshScreenInfo();
          }
        },
        NOTIFY_SCREEN_DELAY_MS);
  }

  private static DisplayManager getDisplayManager() {
    return (DisplayManager)
        GeckoAppShell.getApplicationContext().getSystemService(Context.DISPLAY_SERVICE);
  }

  public void enable() {
    final DisplayManager displayManager = getDisplayManager();
    if (displayManager == null) {
      return;
    }
    displayManager.registerDisplayListener(this, null);
  }

  public void disable() {
    final DisplayManager displayManager = getDisplayManager();
    if (displayManager == null) {
      return;
    }
    displayManager.unregisterDisplayListener(this);
  }
}
