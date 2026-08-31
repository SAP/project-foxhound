/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.ktx.android.content

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import mozilla.components.support.utils.ext.packageManagerCompatHelper

/**
 * Modify the current intent to be used in an intent chooser excluding the current app.
 *
 * @param context Android context used for various system interactions.
 * @param title Title that will be displayed in the chooser.
 *
 * @return a new Intent object that you can hand to Context.startActivity() and related methods.
 */
fun Intent.createChooserExcludingCurrentApp(
    context: Context,
    title: CharSequence,
): Intent {
    val chooserIntent: Intent
    val resolveInfos =
        context.packageManagerCompatHelper.queryIntentActivitiesCompat(this, 0).toHashSet()

    val excludedComponentNames = resolveInfos
        .map { it.activityInfo }
        .filter { it.packageName == context.packageName }
        .map { ComponentName(it.packageName, it.name) }

    // we can use Intent.EXTRA_EXCLUDE_COMPONENTS to exclude components
    chooserIntent = Intent.createChooser(this, title)
        .putExtra(
            Intent.EXTRA_EXCLUDE_COMPONENTS,
            excludedComponentNames.toTypedArray(),
        )
    chooserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    return chooserIntent
}
