/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.focus.settings

import android.content.Context
import android.util.AttributeSet
import android.widget.TextView
import androidx.core.view.isVisible
import androidx.preference.PreferenceViewHolder
import androidx.preference.SwitchPreference
import mozilla.components.browser.state.state.SessionState
import org.mozilla.focus.R
import org.mozilla.focus.ext.components
import org.mozilla.focus.state.AppAction

/**
 * A [SwitchPreference] that displays a "Learn more" link which, when clicked, opens a new tab
 * with a specified URL.
 *
 * Subclasses must implement [getLearnMoreUrl] to define the URL to be opened.
 * Optionally, subclasses can override [getDescription] to provide a custom description text
 * that appears above the "Learn more" link.
 *
 * The layout for this preference is defined in `R.layout.preference_switch_learn_more`.
 */
abstract class LearnMoreSwitchPreference(context: Context, attrs: AttributeSet?) :
    SwitchPreference(context, attrs) {

    init {
        layoutResource = R.layout.preference_switch_learn_more
    }

    override fun onBindViewHolder(holder: PreferenceViewHolder) {
        super.onBindViewHolder(holder)

        getDescription()?.let {
            val summaryView = holder.findViewById(android.R.id.summary) as TextView
            summaryView.text = it
            summaryView.isVisible = true
        }

        val learnMoreLink = holder.findViewById(R.id.link) as TextView
        learnMoreLink.setOnClickListener {
            val tabId = context.components.tabsUseCases.addTab(
                getLearnMoreUrl(),
                source = SessionState.Source.Internal.Menu,
                selectTab = true,
                private = true,
            )

            context.components.appStore.dispatch(
                AppAction.OpenTab(tabId),
            )
        }

        val backgroundDrawableArray =
            context.obtainStyledAttributes(intArrayOf(android.R.attr.selectableItemBackground))
        val backgroundDrawable = backgroundDrawableArray.getDrawable(0)
        backgroundDrawableArray.recycle()
        learnMoreLink.background = backgroundDrawable
    }

    /**
     * Returns the description text to be displayed above the "Learn more" link.
     *
     * Subclasses can override this method to provide a custom description.
     * If this method returns `null` or is not overridden, no description will be shown.
     *
     * @return The description string, or `null` if no description is to be shown.
     */
    open fun getDescription(): String? = null

    /**
     * Returns the URL to be opened when the "Learn more" link is clicked.
     * This method must be implemented by subclasses.
     */
    abstract fun getLearnMoreUrl(): String
}
