/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.lib.crash.sentry.eventprocessors

import io.sentry.EventProcessor
import io.sentry.Hint
import io.sentry.SentryEvent
import mozilla.components.lib.crash.Crash

/**
 * This [EventProcessor] will retain a reference to the [Crash] that has been most recently reported,
 * allowing us to attach metadata from it to a [SentryEvent] as it is being processed. This allows us to,
 * for example, add runtime information from [Crash.runtimeTags].
 */
class CrashMetadataEventProcessor : EventProcessor {
    internal var crashToProcess: Crash? = null

    override fun process(event: SentryEvent, hint: Hint): SentryEvent {
        crashToProcess?.let { crash ->
            event.release = crash.versionName
            event.setTag("geckoview", "${crash.geckoViewVersion}-${crash.buildId}")
            event.setTag("fenix.git", crash.gitHash)
            event.setTag("ac.version", crash.acVersion)
            event.setTag("ac.git", crash.gitHash)
            event.setTag("ac.as.build_version", crash.asVersion)
            event.setTag("ac.glean.build_version", crash.gleanVersion)
            event.setTag("user.locale", crash.locale)

            crash.experimentData?.data?.forEach { (key, value) ->
                event.setTag("experiment.$key", value)
            }
        }
        return event.also {
            crashToProcess = null
        }
    }
}
