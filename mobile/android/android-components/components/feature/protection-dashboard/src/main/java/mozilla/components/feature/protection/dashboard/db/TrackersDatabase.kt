/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.feature.protection.dashboard.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

/**
 * Internal database for saving tracker protection statistics.
 */
@Database(
    entities = [TrackerTotalEntity::class, TrackerByHostEntity::class],
    version = 1,
)
internal abstract class TrackersDatabase : RoomDatabase() {
    abstract fun trackerDao(): TrackerDao

    companion object {
        @Volatile
        private var instance: TrackersDatabase? = null

        @Synchronized
        fun get(context: Context): TrackersDatabase {
            instance?.let { return it }

            return Room.databaseBuilder(
                context,
                TrackersDatabase::class.java,
                "mozac_protection_dashboard_database",
            ).build().also {
                instance = it
            }
        }
    }
}
