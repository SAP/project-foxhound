/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.startupCrash

import mozilla.components.lib.state.Action

internal sealed interface StartupCrashAction : Action

internal data object NoTapped : StartupCrashAction

internal data object ReportTapped : StartupCrashAction

internal data object ReopenTapped : StartupCrashAction

internal data object CrashReportCompleted : StartupCrashAction
