/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.gecko;

import android.os.Build;
import android.view.HapticFeedbackConstants;
import android.view.View;
import androidx.annotation.Nullable;
import androidx.annotation.UiThread;
import org.mozilla.gecko.util.ThreadUtils;

/** {@code HapticFeedbackController} handles haptic feedback. */
public class HapticFeedbackController {
  private @Nullable View mView;

  /* These constants should be kept in sync with those in nsIHapticFeedback. */
  private static final int SHORT_PRESS = 0;
  private static final int LONG_PRESS = 1;
  private static final int TEXT_HANDLE_MOVE = 2;

  /**
   * Set the current {@link android.view.View} for haptic feedback.
   *
   * @param view View for haptic feedback or null to clear current View.
   */
  @UiThread
  public void setView(final @Nullable View view) {
    ThreadUtils.assertOnUiThread();
    mView = view;
  }

  /**
   * Get the current View for haptic feedback.
   *
   * @return Current View for haptic feedback or null if not set.
   */
  @UiThread
  @Nullable
  public View getView() {
    ThreadUtils.assertOnUiThread();
    return mView;
  }

  /**
   * Perform haptic feedback with the specified effect.
   *
   * @param effect One of SHORT_PRESS, LONG_PRESS, or TEXT_HANDLE_MOVE
   */
  @UiThread
  public void performHapticFeedback(final int effect) {
    ThreadUtils.assertOnUiThread();

    if (mView == null) {
      return;
    }
    final int translatedEffect;
    switch (effect) {
      case SHORT_PRESS:
        // Added in API level 23
        translatedEffect = HapticFeedbackConstants.CONTEXT_CLICK;
        break;
      case LONG_PRESS:
        // Added in API level 3
        translatedEffect = HapticFeedbackConstants.LONG_PRESS;
        break;
      case TEXT_HANDLE_MOVE:
        if (Build.VERSION.SDK_INT < 27) {
          return;
        }
        // Added in API level 27
        translatedEffect = HapticFeedbackConstants.TEXT_HANDLE_MOVE;
        break;
      default:
        return;
    }
    mView.performHapticFeedback(translatedEffect);
  }
}
