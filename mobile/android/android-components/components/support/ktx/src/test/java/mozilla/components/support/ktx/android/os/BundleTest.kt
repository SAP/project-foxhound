/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.ktx.android.os

import android.os.Bundle
import androidx.test.ext.junit.runners.AndroidJUnit4
import mozilla.components.concept.base.crash.Breadcrumb
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.util.Date

@RunWith(AndroidJUnit4::class)
class BundleTest {

    @Test
    fun `bundles with different sizes should not be equals`() {
        val small = Bundle().apply {
            putString("hello", "world")
        }
        val big = Bundle().apply {
            putString("hello", "world")
            putString("foo", "bar")
        }
        assertFalse(small.contentEquals(big))
    }

    @Test
    fun `bundles with arrays should be equal`() {
        val (bundle1, bundle2) = (0..1).map {
            Bundle().apply {
                putString("str", "world")
                putInt("int", 0)
                putBooleanArray("boolArray", booleanArrayOf(true, false))
                putByteArray("byteArray", "test".toByteArray())
                putCharArray("charArray", "test".toCharArray())
                putDoubleArray("doubleArray", doubleArrayOf(0.0, 1.1))
                putFloatArray("floatArray", floatArrayOf(1f, 2f))
                putIntArray("intArray", intArrayOf(0, 1, 2))
                putLongArray("longArray", longArrayOf(0L, 1L))
                putShortArray("shortArray", shortArrayOf(1, 2))
                putStringArray("typedArray", arrayOf("foo", "bar"))
                putBundle("nestedBundle", Bundle())
            }
        }
        assertTrue(bundle1.contentEquals(bundle2))
    }

    @Test
    fun `bundles with parcelables should be equal`() {
        val date = Date()
        val (bundle1, bundle2) = (0..1).map {
            Bundle().apply {
                putParcelable(
                    "crumbs",
                    Breadcrumb(
                        message = "msg",
                        level = Breadcrumb.Level.DEBUG,
                        date = date,
                    ),
                )
            }
        }
        assertTrue(bundle1.contentEquals(bundle2))
    }
}
