/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ValueAnimator
import android.annotation.SuppressLint
import android.view.View
import android.widget.RadioButton
import androidx.annotation.StringRes
import androidx.appcompat.content.res.AppCompatResources
import androidx.core.content.ContextCompat
import androidx.core.graphics.drawable.toDrawable
import androidx.preference.Preference
import androidx.preference.PreferenceFragmentCompat
import androidx.preference.PreferenceGroupAdapter
import androidx.recyclerview.widget.RecyclerView
import mozilla.components.concept.engine.permission.SitePermissions
import mozilla.components.support.ktx.android.content.res.resolveAttribute
import mozilla.components.support.ktx.android.view.putCompoundDrawablesRelative
import org.mozilla.fenix.R
import org.mozilla.fenix.ext.getPreferenceKey

fun SitePermissions.toggle(featurePhone: PhoneFeature): SitePermissions {
    return update(featurePhone, get(featurePhone).toggle())
}

fun SitePermissions.get(field: PhoneFeature) = when (field) {
    PhoneFeature.AUTOPLAY ->
        throw IllegalAccessException(
            "AUTOPLAY can't be accessed via get try " +
                "using AUTOPLAY_AUDIBLE and AUTOPLAY_INAUDIBLE",
        )
    PhoneFeature.CAMERA -> camera
    PhoneFeature.LOCATION -> location
    PhoneFeature.MICROPHONE -> microphone
    PhoneFeature.NOTIFICATION -> notification
    PhoneFeature.AUTOPLAY_AUDIBLE -> autoplayAudible.toStatus()
    PhoneFeature.AUTOPLAY_INAUDIBLE -> autoplayInaudible.toStatus()
    PhoneFeature.PERSISTENT_STORAGE -> localStorage
    PhoneFeature.MEDIA_KEY_SYSTEM_ACCESS -> mediaKeySystemAccess
    PhoneFeature.CROSS_ORIGIN_STORAGE_ACCESS -> crossOriginStorageAccess
    PhoneFeature.LOCAL_DEVICE_ACCESS -> localDeviceAccess
    PhoneFeature.LOCAL_NETWORK_ACCESS -> localNetworkAccess
}

fun SitePermissions.update(field: PhoneFeature, value: SitePermissions.Status) = when (field) {
    PhoneFeature.AUTOPLAY -> throw IllegalAccessException(
        "AUTOPLAY can't be accessed via update " +
            "try using AUTOPLAY_AUDIBLE and AUTOPLAY_INAUDIBLE",
    )
    PhoneFeature.CAMERA -> copy(camera = value)
    PhoneFeature.LOCATION -> copy(location = value)
    PhoneFeature.MICROPHONE -> copy(microphone = value)
    PhoneFeature.NOTIFICATION -> copy(notification = value)
    PhoneFeature.AUTOPLAY_AUDIBLE -> copy(autoplayAudible = value.toAutoplayStatus())
    PhoneFeature.AUTOPLAY_INAUDIBLE -> copy(autoplayInaudible = value.toAutoplayStatus())
    PhoneFeature.PERSISTENT_STORAGE -> copy(localStorage = value)
    PhoneFeature.MEDIA_KEY_SYSTEM_ACCESS -> copy(mediaKeySystemAccess = value)
    PhoneFeature.CROSS_ORIGIN_STORAGE_ACCESS -> copy(crossOriginStorageAccess = value)
    PhoneFeature.LOCAL_DEVICE_ACCESS -> copy(localDeviceAccess = value)
    PhoneFeature.LOCAL_NETWORK_ACCESS -> copy(localNetworkAccess = value)
}

/**
 * In devices with Android 6, when we use android:button="@null" android:drawableStart doesn't work via xml
 * as a result we have to apply it programmatically. More info about this issue https://github.com/mozilla-mobile/fenix/issues/1414
 */
fun RadioButton.setStartCheckedIndicator() {
    val attr = context.theme.resolveAttribute(android.R.attr.listChoiceIndicatorSingle)
    val buttonDrawable = AppCompatResources.getDrawable(context, attr)
    buttonDrawable?.apply {
        setBounds(0, 0, intrinsicWidth, intrinsicHeight)
    }
    putCompoundDrawablesRelative(start = buttonDrawable)
}

/**
 * Sets the callback to be invoked when this preference is changed by the user (but before
 * the internal state has been updated). Allows the type of the preference to be specified.
 * If the new value doesn't match the preference type the listener isn't called.
 *
 * @param onPreferenceChangeListener The callback to be invoked
 */
inline fun <reified T> Preference.setOnPreferenceChangeListener(
    crossinline onPreferenceChangeListener: (Preference, T) -> Boolean,
) {
    setOnPreferenceChangeListener { preference: Preference, newValue: Any ->
        (newValue as? T)?.let { onPreferenceChangeListener(preference, it) } ?: false
    }
}

/**
 * Find a preference with the corresponding key and throw if it does not exist.
 * @param preferenceId Resource ID from preference_keys
 */
fun <T : Preference> PreferenceFragmentCompat.requirePreference(
    @StringRes preferenceId: Int,
) =
    requireNotNull(findPreference<T>(getPreferenceKey(preferenceId)))

private const val HIGHLIGHT_DURATION_MS = 1000L

/**
 * Scrolls to the preference with the given key and flashes a highlight animation on it.
 *
 * @param key The preference key to scroll to and highlight
 */
@SuppressLint("RestrictedApi")
fun PreferenceFragmentCompat.scrollToPreferenceWithHighlight(key: String) {
    scrollToPreference(key)

    val recyclerView = listView ?: return
    val highlightAction = {
        val adapter = recyclerView.adapter as? PreferenceGroupAdapter
        val preference = findPreference<Preference>(key)
        val position = if (adapter != null && preference != null) {
            adapter.getPreferenceAdapterPosition(preference)
        } else {
            -1
        }
        if (position >= 0) {
            val viewHolder = recyclerView.findViewHolderForAdapterPosition(position)
            viewHolder?.itemView?.let { highlightPreferenceView(it) }
        }
    }

    val scrollListener = object : RecyclerView.OnScrollListener() {
        override fun onScrollStateChanged(rv: RecyclerView, newState: Int) {
            if (newState != RecyclerView.SCROLL_STATE_IDLE) return
            rv.removeOnScrollListener(this)
            highlightAction()
        }
    }
    recyclerView.addOnScrollListener(scrollListener)

    recyclerView.post {
        if (recyclerView.scrollState == RecyclerView.SCROLL_STATE_IDLE) {
            recyclerView.removeOnScrollListener(scrollListener)
            highlightAction()
        }
    }
}

private fun PreferenceFragmentCompat.highlightPreferenceView(itemView: View) {
    val highlightColor = ContextCompat.getColor(requireContext(), R.color.preference_scroll_highlight)

    val overlayDrawable = highlightColor.toDrawable().apply {
        setBounds(0, 0, itemView.width, itemView.height)
    }
    itemView.overlay.add(overlayDrawable)

    val animator = ValueAnimator.ofFloat(0f, 1f, 0f, 1f, 0f).apply {
        duration = HIGHLIGHT_DURATION_MS
        addUpdateListener { overlayDrawable.alpha = ((it.animatedValue as Float) * 255).toInt() }
        addListener(
            object : AnimatorListenerAdapter() {
                override fun onAnimationEnd(animation: Animator) {
                    itemView.overlay.clear()
                }
            },
        )
    }

    itemView.addOnAttachStateChangeListener(
        object : View.OnAttachStateChangeListener {
            override fun onViewAttachedToWindow(v: View) { /* no-op */ }
            override fun onViewDetachedFromWindow(v: View) {
                animator.cancel()
            }
        },
    )

    animator.start()
}
