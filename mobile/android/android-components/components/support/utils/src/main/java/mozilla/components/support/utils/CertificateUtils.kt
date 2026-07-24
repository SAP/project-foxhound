/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.utils

import java.security.cert.X509Certificate

/**
 * Provides informational utility functions for working with certificates.
 */
object CertificateUtils {
    /**
     * Attempts to determine and return the certificate's issuer organization
     * name. If none is present, falls back to the organizational unit name and
     * finally the common name. If the certificate is null or none of these
     * components are present, returns null.
     *
     * @param certificate the X509Certificate in question
     * @return the certificate's issuer organization name as a string, or null
     */
    fun issuerOrganization(certificate: X509Certificate?): String? {
        val issuer = certificate?.issuerDN?.name
        // `issuer` will be of the form "C=US,O=Let's Encrypt,CN=R13". In
        // theory there may be hex-encoded components with numeric OIDs of the
        // form "1.2.3=#AABBCC".
        // `components` will consist of `issuer` split into an array like
        // ["C=US", "O=Let's Encrypt", "RN=R13"].
        val components = issuer?.split(Regex(",(?=(CN|L|ST|O|OU|C|STREET|DC|UID|([0-9\\.]+))=)"))
        // Find and return the value of the organization ("O") component, and
        // fall back to organizational unit ("OU") and then common name ("CN")
        // if those are not present.
        val componentTags = arrayOf("O=", "OU=", "CN=")
        for (componentTag in componentTags) {
          components?.find { it.startsWith(componentTag) }?.let { return it.substringAfter(componentTag) }
        }
        return null
    }
}
