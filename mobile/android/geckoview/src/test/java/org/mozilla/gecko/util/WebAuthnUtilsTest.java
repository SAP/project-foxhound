/* Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/ */

package org.mozilla.gecko.util;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import com.google.android.gms.fido.common.Transport;
import java.util.Arrays;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONException;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;

@RunWith(RobolectricTestRunner.class)
public class WebAuthnUtilsTest {
  @Test
  public void responseJSONForMakeCredential() throws Exception {
    // attestationObject isn't valid format, but this unit test is that parsing JSON and building
    // parameters.
    final String responseJSON =
        "{"
            + "\"id\": \"AAECAwQFBgcICQoLDA0ODw\" ,"
            + "\"rawId\": \"AAECAwQFBgcICQoLDA0ODw\" ,"
            + "\"type\": \"public-key\" ,"
            + "\"authenticatorAttachment\": \"platform\", "
            + "\"response\": {\"attestationObject\": \"AQIDBAUGBwgJCgsMDQ4PEA\", \"transports\": [ \"internal\" ]},"
            + "\"clientExtensionResults\": {\"credProps\": {\"rk\": true }, \"prf\": {\"enabled\": true}, \"largeBlob\": {\"supported\": true}}"
            + "}";
    final WebAuthnUtils.MakeCredentialResponse response =
        WebAuthnUtils.getMakeCredentialResponse(responseJSON);

    final byte[] rawId =
        new byte[] {0x0, 0x1, 0x2, 0x3, 0x4, 0x5, 0x6, 0x7, 0x8, 0x9, 0xa, 0xb, 0xc, 0xd, 0xe, 0xf};
    final byte[] attestationObject =
        new byte[] {
          0x1, 0x2, 0x3, 0x4, 0x5, 0x6, 0x7, 0x8, 0x9, 0xa, 0xb, 0xc, 0xd, 0xe, 0xf, 0x10
        };
    assertTrue("rawId should be matched", Arrays.equals(response.keyHandle, rawId));
    assertTrue(
        "attestationObject should be matched",
        Arrays.equals(response.attestationObject, attestationObject));
    assertEquals("No clientDataJson in response", response.clientDataJson, null);
    assertTrue("handle credProps", response.credProps);
    assertTrue("prfEnabled should be true", response.prfEnabled);
    assertEquals("prfFirst should be null", response.prfFirst, null);
    assertEquals("prfSecond should be null", response.prfSecond, null);
    assertTrue("largeBlobSupported should be true", response.largeBlobSupported);
  }

  @Test(expected = JSONException.class)
  public void invalidMakeCredential() throws Exception {
    final String responseJSON =
        "{"
            + "\"type\": \"public-key\" ,"
            + "\"authenticatorAttachment\": \"platform\", "
            + "\"response\": {\"attestationObject\": \"AQIDBAUGBwgJCgsMDQ4PEA\", \"transports\": [ \"internal\" ]}"
            + "}";
    final WebAuthnUtils.MakeCredentialResponse response =
        WebAuthnUtils.getMakeCredentialResponse(responseJSON);
    assertTrue("Not reached", false);
  }

  @Test
  public void responseJSONForGetAssertion() throws Exception {
    // authenticatorData and signature aren't valid format, but this unit test is that parsing JSON
    // and building parameters.
    final String responseJSON =
        "{"
            + "\"id\": \"AAECAwQFBgcICQoLDA0ODw\" ,"
            + "\"rawId\": \"AAECAwQFBgcICQoLDA0ODw\" ,"
            + "\"authenticatorAttachment\": \"platform\", "
            + "\"response\": {\"authenticatorData\": \"AQIDBAUGBwgJCgsMDQ4PEA\", \"signature\": \"AgMEBQYHCAkKCwwNDg8QEQ\"},"
            + "\"clientExtensionResults\": {\"largeBlob\": {\"blob\": \"AAECAwQFBgcICQoLDA0ODw\"}}"
            + "}";
    final WebAuthnUtils.GetAssertionResponse response =
        WebAuthnUtils.getGetAssertionResponse(responseJSON);

    final byte[] rawId =
        new byte[] {0x0, 0x1, 0x2, 0x3, 0x4, 0x5, 0x6, 0x7, 0x8, 0x9, 0xa, 0xb, 0xc, 0xd, 0xe, 0xf};
    final byte[] authData =
        new byte[] {
          0x1, 0x2, 0x3, 0x4, 0x5, 0x6, 0x7, 0x8, 0x9, 0xa, 0xb, 0xc, 0xd, 0xe, 0xf, 0x10
        };
    final byte[] signature =
        new byte[] {
          0x2, 0x3, 0x4, 0x5, 0x6, 0x7, 0x8, 0x9, 0xa, 0xb, 0xc, 0xd, 0xe, 0xf, 0x10, 0x11
        };
    final byte[] largeBlobBlob =
        new byte[] {0x0, 0x1, 0x2, 0x3, 0x4, 0x5, 0x6, 0x7, 0x8, 0x9, 0xa, 0xb, 0xc, 0xd, 0xe, 0xf};
    assertTrue("rawId should be matched", Arrays.equals(response.keyHandle, rawId));
    assertTrue("authenticatorData should be matched", Arrays.equals(response.authData, authData));
    assertTrue("signature should be matched", Arrays.equals(response.signature, signature));
    assertEquals(
        "authenticatorAttachment should be matched", response.authenticatorAttachment, "platform");
    assertEquals("No clientDataJson in response", response.clientDataJson, null);
    assertTrue(
        "largeBlobBlob should be matched", Arrays.equals(response.largeBlobBlob, largeBlobBlob));
    assertEquals("largeBlobWritten should be null", response.largeBlobWritten, null);
  }

  @Test(expected = JSONException.class)
  public void invalidGetAssertion() throws Exception {
    final String responseJSON =
        "{"
            + "\"authenticatorAttachment\": \"platform\", "
            + "\"response\": {\"authenticatorData\": \"AQIDBAUGBwgJCgsMDQ4PEA\", \"signature\": \"AgMEBQYHCAkKCwwNDg8QEQ\"}"
            + "}";
    final WebAuthnUtils.GetAssertionResponse response =
        WebAuthnUtils.getGetAssertionResponse(responseJSON);
    assertTrue("Not reached", false);
  }

  @Test
  public void transportValue() throws Exception {
    final byte transports = 31;

    final List<Transport> expectedFidoTransports =
        Arrays.asList(
            Transport.USB,
            Transport.NFC,
            Transport.BLUETOOTH_LOW_ENERGY,
            Transport.INTERNAL,
            Transport.HYBRID);
    assertEquals(
        "FIDO2's transport should be matched",
        WebAuthnUtils.getTransportsForByte(transports),
        expectedFidoTransports);

    final String[] expectedJsonTransports =
        new String[] {"usb", "nfc", "ble", "internal", "hybrid"};
    final JSONArray array = WebAuthnUtils.getJSONTransportsForByte(transports);
    for (int i = 0; i < 5; i++) {
      assertEquals("JSON's transport should be matched", array.get(i), expectedJsonTransports[i]);
    }
  }

  @Test
  public void responseJSONForMakeCredentialWithPrf() throws Exception {
    final String responseJSON =
        "{"
            + "\"id\": \"AAECAwQFBgcICQoLDA0ODw\" ,"
            + "\"rawId\": \"AAECAwQFBgcICQoLDA0ODw\" ,"
            + "\"type\": \"public-key\" ,"
            + "\"authenticatorAttachment\": \"platform\", "
            + "\"response\": {\"attestationObject\": \"AQIDBAUGBwgJCgsMDQ4PEA\", \"transports\": [ \"internal\" ]},"
            + "\"clientExtensionResults\": {"
            + "  \"prf\": {"
            + "    \"enabled\": true,"
            + "    \"results\": {"
            + "      \"first\": \"AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8\","
            + "      \"second\": \"ICEiIyQlJicoKSorLC0uLzAxMjM0NTY3ODk6Ozw9Pj8\""
            + "    }"
            + "  }"
            + "}"
            + "}";
    final WebAuthnUtils.MakeCredentialResponse response =
        WebAuthnUtils.getMakeCredentialResponse(responseJSON);

    final byte[] expectedFirst =
        new byte[] {
          0x0, 0x1, 0x2, 0x3, 0x4, 0x5, 0x6, 0x7, 0x8, 0x9, 0xa, 0xb, 0xc, 0xd, 0xe, 0xf,
          0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e,
              0x1f
        };
    final byte[] expectedSecond =
        new byte[] {
          0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x2b, 0x2c, 0x2d, 0x2e,
              0x2f,
          0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x3b, 0x3c, 0x3d, 0x3e,
              0x3f
        };

    assertTrue("prfEnabled should be true", response.prfEnabled);
    assertTrue("prfFirst should be matched", Arrays.equals(response.prfFirst, expectedFirst));
    assertTrue("prfSecond should be matched", Arrays.equals(response.prfSecond, expectedSecond));
  }

  @Test
  public void responseJSONForGetAssertionWithPrf() throws Exception {
    final String responseJSON =
        "{"
            + "\"id\": \"AAECAwQFBgcICQoLDA0ODw\" ,"
            + "\"rawId\": \"AAECAwQFBgcICQoLDA0ODw\" ,"
            + "\"authenticatorAttachment\": \"platform\", "
            + "\"response\": {\"authenticatorData\": \"AQIDBAUGBwgJCgsMDQ4PEA\", \"signature\": \"AgMEBQYHCAkKCwwNDg8QEQ\"},"
            + "\"clientExtensionResults\": {"
            + "  \"prf\": {"
            + "    \"results\": {"
            + "      \"first\": \"AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8\""
            + "    }"
            + "  }"
            + "}"
            + "}";
    final WebAuthnUtils.GetAssertionResponse response =
        WebAuthnUtils.getGetAssertionResponse(responseJSON);

    final byte[] expectedFirst =
        new byte[] {
          0x0, 0x1, 0x2, 0x3, 0x4, 0x5, 0x6, 0x7, 0x8, 0x9, 0xa, 0xb, 0xc, 0xd, 0xe, 0xf,
          0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e,
              0x1f
        };

    assertTrue("prfFirst should be matched", Arrays.equals(response.prfFirst, expectedFirst));
    assertEquals("prfSecond should be null", response.prfSecond, null);
  }

  @Test
  public void responseJSONForGetAssertionWithLargeBlobWritten() throws Exception {
    final String responseJSON =
        "{"
            + "\"id\": \"AAECAwQFBgcICQoLDA0ODw\" ,"
            + "\"rawId\": \"AAECAwQFBgcICQoLDA0ODw\" ,"
            + "\"authenticatorAttachment\": \"platform\", "
            + "\"response\": {\"authenticatorData\": \"AQIDBAUGBwgJCgsMDQ4PEA\", \"signature\": \"AgMEBQYHCAkKCwwNDg8QEQ\"},"
            + "\"clientExtensionResults\": {\"largeBlob\": {\"written\": true}}"
            + "}";
    final WebAuthnUtils.GetAssertionResponse response =
        WebAuthnUtils.getGetAssertionResponse(responseJSON);

    assertTrue("largeBlobWritten should be true", response.largeBlobWritten);
    assertEquals("largeBlobBlob should be null", response.largeBlobBlob, null);
  }
}
