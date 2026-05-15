/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.settings.settingssearch

import androidx.datastore.core.CorruptionException
import androidx.datastore.core.Serializer
import com.google.protobuf.InvalidProtocolBufferException
import org.mozilla.fenix.settings.datastore.RecentSettingsSearches
import java.io.InputStream
import java.io.OutputStream

/**
 * DataStore serializer for Recent Settings Searches.
 */
object RecentSettingsSearchesSerializer : Serializer<RecentSettingsSearches> {
    override val defaultValue: RecentSettingsSearches = RecentSettingsSearches.getDefaultInstance()

    override suspend fun readFrom(input: InputStream): RecentSettingsSearches {
        try {
            return RecentSettingsSearches.parseFrom(input)
        } catch (exception: InvalidProtocolBufferException) {
            throw CorruptionException("Cannot read proto.", exception)
        }
    }

    override suspend fun writeTo(t: RecentSettingsSearches, output: OutputStream) = t.writeTo(output)
}
