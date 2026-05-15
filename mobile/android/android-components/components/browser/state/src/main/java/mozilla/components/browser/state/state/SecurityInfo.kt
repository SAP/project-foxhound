/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.browser.state.state

import java.security.cert.X509Certificate

/**
 * Security status of the connection for a `Session`.
 */
sealed class SecurityInfo {
    /**
     * Domain for which the SSL certificate used for the connection was issued.
     */
    open val host: String = ""

    /**
     * Name of the certificate authority who issued the SSL certificate used for the connection.
     */
    open val issuer: String = ""

    /**
     * SSL certificate used for the connection.
     */
    open val certificate: X509Certificate? = null

    /**
     * Whether the connection is secure or not.
     */
    val isSecure: Boolean = this is Secure

    /**
     * Connection is secured with a valid SSL certificate.
     */
    data class Secure(
        override val host: String = "",
        override val issuer: String = "",
        override val certificate: X509Certificate? = null,
    ) : SecurityInfo()

    /**
     * Connection is is not secure. SSL certificate is missing or not valid.
     */
    data class Insecure(
        override val host: String = "",
        override val issuer: String = "",
        override val certificate: X509Certificate? = null,
    ) : SecurityInfo()

    /**
     * Security details of the current connection are not yet known.
     * This is the default state, transient until the needed details are loaded.
     */
    data object Unknown : SecurityInfo()

    companion object {
        /**
         * Helper factory of `SecurityInfo` instances.
         *
         * @param isSecure true if the tab is currently pointed to a URL with
         * a valid SSL certificate, otherwise false.
         * @param host domain for which the certificate was issued.
         * @param issuer name of the certificate authority who issued the SSL certificate.
         * @param certificate the certificate in question.
         *
         * @return an instance of `SecurityInfo`
         */
        fun from(
            isSecure: Boolean = false,
            host: String = "",
            issuer: String = "",
            certificate: X509Certificate? = null,
        ) = when (isSecure) {
            true -> Secure(host, issuer, certificate)
            false -> Insecure(host, issuer, certificate)
        }
    }
}
