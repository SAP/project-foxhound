/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.share

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.widget.Toast
import org.mozilla.fenix.R
import org.mozilla.fenix.ext.components

/**
 * A BroadcastReceiver to handle the "Save to PDF" action.
 */
class SaveToPdfReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val saveToPdfUseCase = context.components.useCases.sessionUseCases.saveToPdf
        val id = intent.getStringExtra(TAB_ID_KEY)
        if (id != null) {
            saveToPdfUseCase.invoke(id)
        } else {
            Toast.makeText(context, R.string.unable_to_save_to_pdf_error, Toast.LENGTH_SHORT).show()
        }
    }
}
