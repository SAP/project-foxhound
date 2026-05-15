/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.gecko.process;

import android.content.pm.ApplicationInfo;
import android.os.Build;
import android.util.Log;
import androidx.annotation.Keep;
import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;

@Keep
@RequiresApi(api = Build.VERSION_CODES.Q)
public class ZygotePreload implements android.app.ZygotePreload {
  private static final String LOGTAG = "GeckoViewZygotePreload";

  @Override
  public void doPreload(@NonNull final ApplicationInfo applicationInfo) {
    Log.i(LOGTAG, "doPreload");
    try {
      System.loadLibrary("mozglue");
      System.loadLibrary("xul");
      System.loadLibrary("nss3");
    } catch (final Exception e) {
      Log.e(LOGTAG, "An exception occurred when using app Zygote preloading!: ", e);
    }
  }
}
