/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.benchmark.utils

import android.net.Uri
import androidx.core.net.toUri

enum class HtmlAsset(val fileName: String, val title: String) {
    SIMPLE("simple.html", "Simple Page"),
    LONG("long.html", "Long Page");
}

fun MockWebServerRule.uri(asset: HtmlAsset): Uri = url(asset).toUri()

fun MockWebServerRule.url(asset: HtmlAsset): String =
    server.url("/${asset.fileName}").toString()
