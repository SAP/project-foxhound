/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.ktx.android.view

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.os.Build.VERSION.SDK_INT
import android.os.Build.VERSION_CODES
import android.view.View
import android.view.Window
import android.view.WindowManager
import androidx.annotation.ColorInt
import androidx.core.graphics.Insets
import androidx.core.graphics.createBitmap
import androidx.core.graphics.drawable.toBitmap
import androidx.core.graphics.drawable.toDrawable
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsCompat.Type.displayCutout
import androidx.core.view.WindowInsetsCompat.Type.systemBars
import androidx.core.view.WindowInsetsControllerCompat
import mozilla.components.support.ktx.android.content.isEdgeToEdgeDisabled
import mozilla.components.support.ktx.android.util.dpToPx
import mozilla.components.support.utils.ColorUtils.isDark
import mozilla.components.support.utils.ext.bottom
import mozilla.components.support.utils.ext.left
import mozilla.components.support.utils.ext.right
import mozilla.components.support.utils.ext.top

/**
 * Sets the status bar background color. If the color is light enough, a light navigation bar with
 * dark icons will be used.
 */
fun Window.setStatusBarTheme(
    @ColorInt color: Int,
) {
    createWindowInsetsController().isAppearanceLightStatusBars = !isDark(color)
    setStatusBarColorCompat(color)
}

/**
 * Set the navigation bar background and divider colors. If the color is light enough, a light
 * navigation bar with dark icons will be used.
 */
fun Window.setNavigationBarTheme(
    @ColorInt navBarColor: Int? = null,
    @ColorInt navBarDividerColor: Int? = null,
) {
    navBarColor?.let {
        setNavigationBarColorCompat(it)
        createWindowInsetsController().isAppearanceLightNavigationBars = !isDark(it)
    }
    setNavigationBarDividerColorCompat(navBarDividerColor)
}

/**
 * Creates a {@link WindowInsetsControllerCompat} for the top-level window decor view.
 */
fun Window.createWindowInsetsController(): WindowInsetsControllerCompat {
    return WindowInsetsControllerCompat(this, this.decorView)
}

/**
 * Sets the status bar color.
 *
 * @param color The color to set as the status bar color.
 * Note that if edge-to-edge behavior is enabled, the color will be transparent and cannot be changed.
 */
fun Window.setStatusBarColorCompat(
    @ColorInt color: Int,
) {
    if (context.isEdgeToEdgeDisabled()) {
        @Suppress("DEPRECATION")
        statusBarColor = color
    } else {
        // setting status bar color has no effect
    }
}

/**
 * Sets the navigation bar color.
 *
 * @param color The color to set as the navigation bar color.
 * Note that if edge-to-edge behavior is enabled, the color will be transparent and cannot be changed.
 */
fun Window.setNavigationBarColorCompat(
    @ColorInt color: Int,
) {
    if (context.isEdgeToEdgeDisabled()) {
        @Suppress("DEPRECATION")
        navigationBarColor = color
    } else {
        // setting navigation bar color has no effect
    }
}

/**
 * Sets the navigation bar divider color.
 *
 * @param color The color to set as the navigation bar divider color.
 * Note that if edge-to-edge behavior is enabled, the color will be transparent and cannot be changed.
 */
fun Window.setNavigationBarDividerColorCompat(
    @ColorInt color: Int?,
) {
    if (SDK_INT >= VERSION_CODES.P && context.isEdgeToEdgeDisabled()) {
        @Suppress("DEPRECATION")
        navigationBarDividerColor = color ?: 0
    } else {
        // setting navigation bar divider color has no effect
    }
}

/**
 * Setup handling persistent insets - system bars and display cutouts ourselves instead of the framework.
 * This results in keeping the same behavior for such insets while allowing to separately control the behavior
 * for other dynamic insets.
 *
 * This only works on Android 13 and above where the insets framework is more reliable.
 * On older versions calling this will result in no-op.
 *
 * @param consumeInsets if true, returns [WindowInsetsCompat.CONSUMED] to notify so other listeners do not
 * consume them as well.
 */
fun Window.setupPersistentInsets(consumeInsets: Boolean = false) {
    if (SDK_INT < VERSION_CODES.TIRAMISU) return

    val rootView = decorView.findViewById<View>(android.R.id.content)
    val persistentInsetsTypes = systemBars() or displayCutout()

    ViewCompat.setOnApplyWindowInsetsListener(rootView) { _, windowInsets ->
        val isInImmersiveMode = attributes.flags and WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS != 0
        val persistentInsets = when (isInImmersiveMode) {
            true -> {
                // If we are in immersive mode we need to reset current paddings and avoid setting others.
                Insets.of(0, 0, 0, 0)
            }

            false -> windowInsets.getInsets(persistentInsetsTypes)
        }

        rootView.setPadding(
            persistentInsets.left,
            persistentInsets.top,
            persistentInsets.right,
            persistentInsets.bottom,
        )

        // Pass window insets further to allow below listeners also know when there is a change.
        if (consumeInsets) {
            WindowInsetsCompat.CONSUMED
        } else {
            windowInsets
        }
    }
}

/**
 * Sets the theme for system's status bar and navigation bar by applying the given colors as window background
 * and automatically set whether the text and icons in these bars should be light or dark to ensure
 * best contrast over the given backgrounds colors.
 *
 * This method is state-less and will style all bars at the same time based on the passed-in parameters.
 * Calling this again with fewer parameters will reset the other values to their defaults.
 */
fun Window.setSystemBarsBackground(
    @ColorInt statusBarColor: Int? = null,
    @ColorInt navigationBarColor: Int? = null,
    @ColorInt navigationBarDividerColor: Int? = navigationBarColor,
    @ColorInt horizontalInsetsColor: Int? = Color.BLACK,
) {
    if (context.isEdgeToEdgeDisabled()) {
        statusBarColor?.let { setStatusBarTheme(it) }
        navigationBarColor?.let { setNavigationBarTheme(it, navigationBarDividerColor) }
        return
    }

    statusBarColor?.let { createWindowInsetsController().isAppearanceLightStatusBars = !isDark(it) }
    navigationBarColor?.let { createWindowInsetsController().isAppearanceLightNavigationBars = !isDark(it) }

    ViewCompat.getRootWindowInsets(decorView)?.let {
        decorView.setWindowInsetsBackgroundColors(
            it,
            statusBarColor,
            navigationBarColor,
            navigationBarDividerColor,
            horizontalInsetsColor,
        )
    }
    ViewCompat.setOnApplyWindowInsetsListener(decorView) { _, windowInsets ->
        decorView.setWindowInsetsBackgroundColors(
            windowInsets,
            statusBarColor,
            navigationBarColor,
            navigationBarDividerColor,
            horizontalInsetsColor,
        )
        windowInsets // return the insets to allow other listeners to use them as well
    }
}

private fun View.setWindowInsetsBackgroundColors(
    insets: WindowInsetsCompat,
    @ColorInt statusBarColor: Int? = null,
    @ColorInt navigationBarColor: Int? = null,
    @ColorInt navigationBarDividerColor: Int? = null,
    @ColorInt horizontalInsetsColor: Int? = null,
) {
    val screenWidth = resources.displayMetrics.widthPixels
    val screenHeight = resources.displayMetrics.heightPixels

    val bitmap = background
        ?.toBitmap(screenWidth, screenHeight, Bitmap.Config.ARGB_8888)
        ?: createBitmap(screenWidth, screenHeight)
    val canvas = Canvas(bitmap)

    statusBarColor.toPaint()?.let {
        canvas.drawRect(0f, 0f, screenWidth.toFloat(), insets.top().toFloat(), it)
    }
    navigationBarColor.toPaint()?.let {
        canvas.drawRect(
            0f,
            (screenHeight - insets.bottom()).toFloat(),
            screenWidth.toFloat(),
            screenHeight.toFloat(),
            it,
        )
    }
    navigationBarDividerColor?.toPaint()?.let {
        val top = (screenHeight - insets.bottom()).toFloat()
        canvas.drawRect(
            0f,
            top,
            screenWidth.toFloat(),
            (top + (1).dpToPx(resources.displayMetrics)),
            it,
        )
    }
    horizontalInsetsColor.toPaint()?.let {
        canvas.drawRect(0f, 0f, insets.left().toFloat(), screenHeight.toFloat(), it)
        canvas.drawRect(
            screenWidth - insets.right().toFloat(),
            0f,
            screenWidth.toFloat(),
            screenHeight.toFloat(),
            it,
        )
    }

    background = bitmap.toDrawable(resources)
}

private fun @receiver:ColorInt Int?.toPaint() = this?.let {
    Paint().apply {
        style = Paint.Style.FILL
        color = this@toPaint
    }
}
