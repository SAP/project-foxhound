/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.autofill.structure

import android.app.assist.AssistStructure
import android.view.autofill.AutofillId

/**
 * A raw view structure provided by an application - to be parsed into a [ParsedStructure].
 */
internal interface RawStructure {
    val activityPackageName: String

    fun createNavigator(): AutofillNodeNavigator<*, AutofillId>
}

internal fun AssistStructure.toRawStructure(): RawStructure {
    return AssistStructureWrapper(this)
}

private class AssistStructureWrapper(
    private val actual: AssistStructure,
) : RawStructure {
    override val activityPackageName: String
        get() = actual.activityComponent.packageName

    override fun createNavigator(): AutofillNodeNavigator<*, AutofillId> {
        return ViewNodeNavigator(actual, activityPackageName)
    }
}
