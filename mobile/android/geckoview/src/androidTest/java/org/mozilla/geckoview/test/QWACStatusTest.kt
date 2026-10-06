/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

package org.mozilla.geckoview.test

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.filters.SmallTest
import junit.framework.TestCase.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.mozilla.geckoview.GeckoResult
import org.mozilla.geckoview.GeckoSession

@RunWith(AndroidJUnit4::class)
@SmallTest
class QWACStatusTest : BaseSessionTest() {
    @Test fun testNoQWAC() {
        mainSession.loadUri("https://example.com")
        mainSession.waitForPageStop()
        val qwacStatus = sessionRule.waitForResult(mainSession.qwacStatus())
        assertNull("Should get null QWAC.", qwacStatus)
    }
}
