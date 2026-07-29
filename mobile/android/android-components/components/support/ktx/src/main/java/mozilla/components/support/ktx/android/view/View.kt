/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.ktx.android.view

import android.app.Activity
import android.content.ContextWrapper
import android.graphics.Rect
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.ViewGroup
import android.view.ViewTreeObserver
import android.view.Window
import androidx.annotation.MainThread
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import mozilla.components.support.base.android.Padding
import mozilla.components.support.ktx.android.util.dpToPx
import java.lang.ref.WeakReference

/**
 * Is the horizontal layout direction of this view from Right to Left?
 */
val View.isRTL: Boolean
    get() = layoutDirection == View.LAYOUT_DIRECTION_RTL

/**
 * Is the horizontal layout direction of this view from Left to Right?
 */
val View.isLTR: Boolean
    get() = layoutDirection == View.LAYOUT_DIRECTION_LTR

/**
 * Tries to focus this view and show the soft input window for it.
 */
fun View.showKeyboard() {
    ShowKeyboard(this).post()
}

/**
 * Hides the soft input window.
 *
 * Note: this is a no-op when the view is not hosted in an Activity (e.g. a view attached to an
 * application-context window such as a PopupWindow), since no Activity Window is reachable from
 * which to obtain an InsetsController.
 */
fun View.hideKeyboard() {
    findWindow()?.let { window ->
        WindowCompat.getInsetsController(window, this).hide(WindowInsetsCompat.Type.ime())
    }
}

/**
 * Fills the given [Rect] with data about location view in the window.
 *
 * @see View.getLocationInWindow
 */
fun View.getRectWithViewLocation(): Rect {
    val locationInWindow = IntArray(2).apply { getLocationInWindow(this) }
    return Rect(
        locationInWindow[0],
        locationInWindow[1],
        locationInWindow[0] + width,
        locationInWindow[1] + height,
    )
}

/**
 * Set a padding using [Padding] object.
 */
fun View.setPadding(padding: Padding) {
    with(resources) {
        setPadding(
            padding.left.dpToPx(displayMetrics),
            padding.top.dpToPx(displayMetrics),
            padding.right.dpToPx(displayMetrics),
            padding.bottom.dpToPx(displayMetrics),
        )
    }
}

/**
 * Creates a [CoroutineScope] that is active as long as this [View] is attached. Once this [View]
 * gets detached this [CoroutineScope] gets cancelled automatically.
 *
 * @param mainDispatcher The [CoroutineDispatcher] to be used for the scope. Defaults to [Dispatchers.Main].
 * By default, coroutines dispatched on the created [CoroutineScope] run on the main dispatcher.
 *
 * Note: This scope gets only cancelled if the [View] gets detached. In cases where the [View] never
 * gets attached this may create a scope that never gets cancelled!
 */
@MainThread
fun View.toScope(mainDispatcher: CoroutineDispatcher = Dispatchers.Main): CoroutineScope {
    val scope = CoroutineScope(SupervisorJob() + mainDispatcher)

    addOnAttachStateChangeListener(
        object : View.OnAttachStateChangeListener {
            override fun onViewAttachedToWindow(view: View) = Unit

            override fun onViewDetachedFromWindow(view: View) {
                scope.cancel()
                view.removeOnAttachStateChangeListener(this)
            }
        },
    )

    return scope
}

/**
 * Finds the first a view in the hierarchy, for which the provided predicate is true.
 */
fun View.findViewInHierarchy(predicate: (View) -> Boolean): View? {
    if (predicate(this)) return this

    if (this is ViewGroup) {
        for (i in 0 until this.childCount) {
            val childView = this.getChildAt(i).findViewInHierarchy(predicate)
            if (childView != null) return childView
        }
    }

    return null
}

/**
 * Registers a one-time callback to be invoked when the global layout state
 * or the visibility of views within the view tree changes.
 */
inline fun View.onNextGlobalLayout(crossinline callback: () -> Unit) {
    var listener: ViewTreeObserver.OnGlobalLayoutListener? = null
    listener = ViewTreeObserver.OnGlobalLayoutListener {
        viewTreeObserver.removeOnGlobalLayoutListener(listener)
        callback()
    }
    viewTreeObserver.addOnGlobalLayoutListener(listener)
}

private fun View.findWindow(): Window? {
    var ctx = context
    while (ctx is ContextWrapper) {
        if (ctx is Activity) return ctx.window
        ctx = ctx.baseContext
    }
    return null
}

private class ShowKeyboard(view: View) : Runnable {
    private val weakReference: WeakReference<View> = WeakReference(view)
    private val handler: Handler = Handler(Looper.getMainLooper())
    private var tries: Int = TRIES

    override fun run() {
        weakReference.get()?.let { view ->
            if (!view.isFocusable || !view.isFocusableInTouchMode) {
                // The view is not focusable - we can't show the keyboard for it.
                return
            }

            if (!view.requestFocus()) {
                // Focus this view first.
                post()
                return
            }

            val window = view.findWindow()
            if (window == null) {
                // View is not yet attached to a window.
                post()
                return
            }

            WindowCompat.getInsetsController(window, view).show(WindowInsetsCompat.Type.ime())
        }
    }

    fun post() {
        tries--

        if (tries > 0) {
            handler.postDelayed(this, INTERVAL_MS)
        }
    }

    companion object {
        private const val INTERVAL_MS = 100L
        private const val TRIES = 10
    }
}
