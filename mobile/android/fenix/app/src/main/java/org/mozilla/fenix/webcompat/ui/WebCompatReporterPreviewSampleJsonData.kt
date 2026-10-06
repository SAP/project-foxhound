/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
package org.mozilla.fenix.webcompat.ui

/**
 * Sample WebCompat Json data used to display in the previews of [WebCompatReporterPreviewSheet]
 */
internal object WebCompatReporterPreviewSampleJsonData {

    const val SAMPLE_WEBCOMPAT_JSON_DATA = "{\"browser_info\":{\"app\":{\"app_default_locales\"" +
            ":[\"fr\",\"en-US\"],\"default_useragent_string\":\"Mozilla/5.0 (Windows NT 10.0; " +
            "Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0\",\"fission_enabled\":true}," +
            "\"graphics\":{\"device_pixel_ratio\":\"1\",\"devices_json\":\"[{\\\"vendorID\\\":" +
            "\\\"0x8086\\\",\\\"deviceID\\\":\\\"0x0152\\\",\\\"subsysID\\\":\\\"308417aa\\\"}," +
            "{\\\"vendorID\\\":\\\"\\\",\\\"deviceID\\\":\\\"\\\",\\\"subsysID\\\":\\\"\\\"}]\"" +
            ",\"drivers_json\":\"[{\\\"renderer\\\":\\\"Google Inc. (Intel) --" +
            " ANGLE (Intel, Intel(R) HD Graphics Direct3D11 vs_5_0 ps_5_0, D3D11-10.18.10.4252)" +
            "\\\",\\\"version\\\":\\\"OpenGL ES 3.0.0 (ANGLE 2.1.19739 git hash: " +
            "419cd2c3213b)\\\"},{\\\"renderer\\\":\\\"Google Inc. " +
            "(Intel) -- ANGLE (Intel, Intel(R) HD Graphics Direct3D11 vs_5_0 ps_5_0, " +
            "D3D11-10.18.10.4252)\\\",\\\"version\\\":\\\"OpenGL ES 3.0.0" +
            " (ANGLE 2.1.19739 git hash: 419cd2c3213b)\\\"}]\",\"features_json\":\"" +
            "{\\\"HW_COMPOSITING\\\":\\\"available\\\",\\\"D3D11_COMPOSITING\\\"" +
            ":\\\"available\\\",\\\"DIRECT2D\\\":\\\"disabled " +
            "(Disabled by default)\\\",\\\"D3D11_HW_ANGLE\\\":\\\"available\\\"," +
            "\\\"GPU_PROCESS\\\":\\\"available\\\",\\\"WEBRENDER\\\":\\\"available\\\"" +
            ",\\\"WEBRENDER_COMPOSITOR\\\":\\\"available\\\",\\\"WEBRENDER_PARTIAL\\\"" +
            ":\\\"available\\\",\\\"WEBRENDER_SHADER_CACHE\\\":\\\"available\\\"" +
            ",\\\"WEBRENDER_OPTIMIZED_SHADERS\\\":\\\"available\\\"," +
            "\\\"WEBRENDER_ANGLE\\\":\\\"available\\\",\\\"WEBRENDER_DCOMP_PRESENT\\\"" +
            ":\\\"available\\\",\\\"WEBRENDER_SCISSORED_CACHE_CLEARS\\\"" +
            ":\\\"blocklisted (Blocklisted by gfxInfo)\\\",\\\"WEBGPU\\\"" +
            ":\\\"blocked (WebGPU cannot be enabled in release or beta)\\\"" +
            ",\\\"WINDOW_OCCLUSION\\\":\\\"available\\\"," +
            "\\\"VIDEO_HARDWARE_OVERLAY\\\":\\\"available\\\"," +
            "\\\"VIDEO_SOFTWARE_OVERLAY\\\":\\\"available\\\",\\\"HW_DECODED_VIDEO_ZERO_COPY\\\"" +
            ":\\\"available\\\",\\\"VP8_HW_DECODE\\\":\\\"available\\\",\\\"VP9_HW_DECODE\\\"" +
            ":\\\"available\\\",\\\"REUSE_DECODER_DEVICE\\\":\\\"available\\\",\\\"" +
            "BACKDROP_FILTER\\\":\\\"blocklisted (#BLOCKLIST_FEATURE_FAILURE_BUG_1785366)\\\"" +
            ",\\\"CANVAS_RENDERER_THREAD\\\":\\\"available\\\",\\\"ACCELERATED_CANVAS2D\\\"" +
            ":\\\"available\\\",\\\"REMOTE_CANVAS\\\":\\\"blocked (Disabled without Direct2D)\\\"" +
            "}\",\"has_touch_screen\":false,\"monitors_json\":\"[{\\\"screenWidth\\\":1920}"
}
