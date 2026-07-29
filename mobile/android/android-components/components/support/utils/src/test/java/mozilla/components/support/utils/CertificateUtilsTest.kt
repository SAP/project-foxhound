/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.utils

import org.junit.Assert.assertEquals
import org.junit.Test
import org.mockito.Mockito
import java.security.cert.X509Certificate
import javax.security.auth.x500.X500Principal

class CertificateUtilsTest {
    @Test
    fun `issuerOrganization returns organization`() {
        val mockCertificate = Mockito.mock(X509Certificate::class.java)
        Mockito.`when`(mockCertificate.issuerDN).thenReturn(X500Principal("C=EX,O=Example Organization,L=Example Locality,CN=Example"))
        val expectedIssuerOrganization = "Example Organization"
        assertEquals(CertificateUtils.issuerOrganization(mockCertificate), expectedIssuerOrganization)
    }

    @Test
    fun `issuerOrganization falls back to organizationalUnit`() {
        val mockCertificate = Mockito.mock(X509Certificate::class.java)
        Mockito.`when`(mockCertificate.issuerDN).thenReturn(X500Principal("C=EX,OU=Example Organizational Unit,CN=Example"))
        val expectedIssuerOrganization = "Example Organizational Unit"
        assertEquals(CertificateUtils.issuerOrganization(mockCertificate), expectedIssuerOrganization)
    }

    @Test
    fun `issuerOrganization falls back to commonName`() {
        val mockCertificate = Mockito.mock(X509Certificate::class.java)
        Mockito.`when`(mockCertificate.issuerDN).thenReturn(X500Principal("C=EX,L=Example Locality,CN=Example"))
        val expectedIssuerOrganization = "Example"
        assertEquals(CertificateUtils.issuerOrganization(mockCertificate), expectedIssuerOrganization)
    }

    @Test
    fun `issuerOrganization returns null string otherwise`() {
        val mockCertificate = Mockito.mock(X509Certificate::class.java)
        Mockito.`when`(mockCertificate.issuerDN).thenReturn(X500Principal("C=EX,L=Example Locality"))
        val expectedIssuerOrganization = null
        assertEquals(CertificateUtils.issuerOrganization(mockCertificate), expectedIssuerOrganization)
    }

    @Test
    fun `issuerOrganization returns null given null certificate`() {
        assertEquals(CertificateUtils.issuerOrganization(null), null)
    }

    @Test
    fun `subjectOrganization returns organization`() {
        val mockCertificate = Mockito.mock(X509Certificate::class.java)
        Mockito.`when`(mockCertificate.subjectDN).thenReturn(X500Principal("C=EX,O=Example Subject Organization,L=Example Locality,CN=Example"))
        val expectedIssuerOrganization = "Example Subject Organization"
        assertEquals(CertificateUtils.subjectOrganization(mockCertificate), expectedIssuerOrganization)
    }
}
