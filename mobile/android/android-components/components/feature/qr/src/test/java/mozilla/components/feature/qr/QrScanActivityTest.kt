package mozilla.components.feature.qr

import android.content.Context
import android.content.Intent
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.rule.GrantPermissionRule
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class QrScanActivityTest {

    @get:Rule
    val grantPermissionRule: GrantPermissionRule =
        GrantPermissionRule.grant(android.Manifest.permission.CAMERA)

    @Test
    fun `newIntent includes scanMessage WHEN provided in intent`() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val intent = QrScanActivity.newIntent(context, scanMessage = 12345)

        assertEquals(12345, intent.getIntExtra(QrScanActivity.EXTRA_SCAN_MESSAGE, 0))
        assertEquals(QrScanActivity::class.java.name, intent.component?.className)
    }

    @Test
    fun `newIntent omits scanMesage extra WHEN null`() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val intent = QrScanActivity.newIntent(context, scanMessage = null)

        assertEquals(false, intent.hasExtra(QrScanActivity.EXTRA_SCAN_MESSAGE))
        assertEquals(QrScanActivity::class.java.name, intent.component?.className)
    }
}
