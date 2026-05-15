/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.appstate.qrScanner

/**
 * The state of the QR Scanner.
 *
 * @property isRequesting [Boolean] showing if scan has been requested.
 * @property inProgress [Boolean] showing if scan is in progress.
 * @property lastScanData [String] for last read scan data, if any.
 */
data class QrScannerState(
    val isRequesting: Boolean,
    val inProgress: Boolean,
    val lastScanData: String?,
) {
    /**
     * Holds default QrScannerState.
     */
    companion object {
        val DEFAULT = QrScannerState(isRequesting = false, inProgress = false, lastScanData = null)
    }
}
