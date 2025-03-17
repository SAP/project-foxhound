/* -*- Mode: Java; c-basic-offset: 2; tab-width: 2; indent-tabs-mode: nil; -*- */
/* vim: set ts=2 et sw=2 tw=100: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.gecko.util;

import android.util.Base64;
import android.util.Log;
import androidx.annotation.NonNull;
import com.google.android.gms.fido.common.Transport;
import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.mozilla.gecko.annotation.WrapForJNI;

public class WebAuthnUtils {
  private static final String LOGTAG = "WebAuthnUtils";
  private static final boolean DEBUG = false;

  // from dom/webauthn/WebAuthnTransportIdentifiers.h
  private static final byte AUTHENTICATOR_TRANSPORT_USB = 1;
  private static final byte AUTHENTICATOR_TRANSPORT_NFC = 2;
  private static final byte AUTHENTICATOR_TRANSPORT_BLE = 4;
  private static final byte AUTHENTICATOR_TRANSPORT_INTERNAL = 8;

  // From WebAuthentication.webidl
  public enum AttestationPreference {
    NONE,
    INDIRECT,
    DIRECT,
  }

  public static List<Transport> getTransportsForByte(final byte transports) {
    final ArrayList<Transport> result = new ArrayList<Transport>();
    if ((transports & AUTHENTICATOR_TRANSPORT_USB) == AUTHENTICATOR_TRANSPORT_USB) {
      result.add(Transport.USB);
    }
    if ((transports & AUTHENTICATOR_TRANSPORT_NFC) == AUTHENTICATOR_TRANSPORT_NFC) {
      result.add(Transport.NFC);
    }
    if ((transports & AUTHENTICATOR_TRANSPORT_BLE) == AUTHENTICATOR_TRANSPORT_BLE) {
      result.add(Transport.BLUETOOTH_LOW_ENERGY);
    }
    if ((transports & AUTHENTICATOR_TRANSPORT_INTERNAL) == AUTHENTICATOR_TRANSPORT_INTERNAL) {
      result.add(Transport.INTERNAL);
    }
    return result;
  }

  private static JSONArray getJSONTransportsForByte(final byte transports) {
    final JSONArray json = new JSONArray();
    if ((transports & AUTHENTICATOR_TRANSPORT_USB) == AUTHENTICATOR_TRANSPORT_USB) {
      json.put("usb");
    }
    if ((transports & AUTHENTICATOR_TRANSPORT_NFC) == AUTHENTICATOR_TRANSPORT_NFC) {
      json.put("nfc");
    }
    if ((transports & AUTHENTICATOR_TRANSPORT_BLE) == AUTHENTICATOR_TRANSPORT_BLE) {
      json.put("ble");
    }
    if ((transports & AUTHENTICATOR_TRANSPORT_INTERNAL) == AUTHENTICATOR_TRANSPORT_INTERNAL) {
      json.put("internal");
    }
    return json;
  }

  public static class WebAuthnPublicCredential {
    public final byte[] id;
    public final byte transports;

    public WebAuthnPublicCredential(final byte[] aId, final byte aTransports) {
      this.id = aId;
      this.transports = aTransports;
    }

    public static ArrayList<WebAuthnPublicCredential> CombineBuffers(
        final Object[] idObjectList, final ByteBuffer transportList) {
      if (idObjectList.length != transportList.remaining()) {
        throw new RuntimeException("Couldn't extract allowed list!");
      }

      final ArrayList<WebAuthnPublicCredential> credList =
          new ArrayList<WebAuthnPublicCredential>();

      final byte[] transportBytes = new byte[transportList.remaining()];
      transportList.get(transportBytes);

      for (int i = 0; i < idObjectList.length; i++) {
        final ByteBuffer id = (ByteBuffer) idObjectList[i];
        final byte[] idBytes = new byte[id.remaining()];
        id.get(idBytes);

        credList.add(new WebAuthnPublicCredential(idBytes, transportBytes[i]));
      }
      return credList;
    }

    @NonNull
    public JSONObject toJSONObject() {
      final JSONObject item = new JSONObject();
      try {
        item.put("type", "public-key");
        item.put(
            "id",
            Base64.encodeToString(this.id, Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP));

        final JSONArray transports = getJSONTransportsForByte(this.transports);
        item.put("transports", transports);
      } catch (final JSONException e) {
        Log.e(LOGTAG, "Couldn't set JSON data", e);
      }
      return item;
    }
  }

  @WrapForJNI
  public static class MakeCredentialResponse {
    public final byte[] clientDataJson;
    public final byte[] keyHandle;
    public final byte[] attestationObject;
    public final String[] transports;
    public final String authenticatorAttachment;

    public static final class Builder {
      private byte[] mClientDataJson;
      private byte[] mKeyHandle;
      private byte[] mAttestationObject;
      private String[] mTransports;
      private String mAuthenticatorAttachment;

      public Builder() {}

      public Builder setClientDataJson(final byte[] clientDataJson) {
        this.mClientDataJson = clientDataJson;
        return this;
      }

      public Builder setKeyHandle(final byte[] keyHandle) {
        this.mKeyHandle = keyHandle;
        return this;
      }

      public Builder setAttestationObject(final byte[] attestationObject) {
        this.mAttestationObject = attestationObject;
        return this;
      }

      public Builder setTransports(final String[] transports) {
        this.mTransports = transports;
        return this;
      }

      public Builder setAuthenticatorAttachment(final String authenticatorAttachment) {
        this.mAuthenticatorAttachment = authenticatorAttachment;
        return this;
      }

      public MakeCredentialResponse build() {
        return new MakeCredentialResponse(this);
      }
    }

    @WrapForJNI(skip = true)
    protected MakeCredentialResponse(final Builder builder) {
      this.clientDataJson = builder.mClientDataJson;
      this.keyHandle = builder.mKeyHandle;
      this.attestationObject = builder.mAttestationObject;
      this.transports = builder.mTransports;
      this.authenticatorAttachment = builder.mAuthenticatorAttachment;
    }

    @WrapForJNI(skip = true)
    @Override
    public String toString() {
      final StringBuilder sb = new StringBuilder("{");
      sb.append("clientDataJson=")
          .append(
              Base64.encodeToString(
                  this.clientDataJson, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING))
          .append(", keyHandle=")
          .append(
              Base64.encodeToString(
                  this.keyHandle, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING))
          .append(", attestationObject=")
          .append(
              Base64.encodeToString(
                  this.attestationObject, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING))
          .append(", transports=")
          .append(String.join(", ", this.transports))
          .append(", authenticatorAttachment=")
          .append(this.authenticatorAttachment)
          .append("}");
      return sb.toString();
    }
  }

  @WrapForJNI
  public static class GetAssertionResponse {
    public final byte[] clientDataJson;
    public final byte[] keyHandle;
    public final byte[] authData;
    public final byte[] signature;
    public final byte[] userHandle;
    public final String authenticatorAttachment;

    public static final class Builder {
      private byte[] mClientDataJson;
      private byte[] mKeyHandle;
      private byte[] mAuthData;
      private byte[] mSignature;
      private byte[] mUserHandle;
      private String mAuthenticatorAttachment;

      public Builder() {}

      public Builder setClientDataJson(final byte[] clientDataJson) {
        this.mClientDataJson = clientDataJson;
        return this;
      }

      public Builder setKeyHandle(final byte[] keyHandle) {
        this.mKeyHandle = keyHandle;
        return this;
      }

      public Builder setAuthData(final byte[] authData) {
        this.mAuthData = authData;
        return this;
      }

      public Builder setSignature(final byte[] signature) {
        this.mSignature = signature;
        return this;
      }

      public Builder setUserHandle(final byte[] userHandle) {
        this.mUserHandle = userHandle;
        return this;
      }

      public Builder setAuthenticatorAttachment(final String authenticatorAttachment) {
        this.mAuthenticatorAttachment = authenticatorAttachment;
        return this;
      }

      public GetAssertionResponse build() {
        return new GetAssertionResponse(this);
      }
    }

    @WrapForJNI(skip = true)
    protected GetAssertionResponse(final Builder builder) {
      this.clientDataJson = builder.mClientDataJson;
      this.keyHandle = builder.mKeyHandle;
      this.authData = builder.mAuthData;
      this.signature = builder.mSignature;
      if (builder.mUserHandle == null) {
        this.userHandle = new byte[0];
      } else {
        this.userHandle = builder.mUserHandle;
      }
      this.authenticatorAttachment = builder.mAuthenticatorAttachment;
    }

    @WrapForJNI(skip = true)
    @Override
    public String toString() {
      final StringBuilder sb = new StringBuilder("{");
      sb.append("clientDataJson=")
          .append(
              Base64.encodeToString(
                  this.clientDataJson, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING))
          .append(", keyHandle=")
          .append(
              Base64.encodeToString(
                  this.keyHandle, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING))
          .append(", authData=")
          .append(
              Base64.encodeToString(
                  this.authData, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING))
          .append(", signature=")
          .append(
              Base64.encodeToString(
                  this.signature, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING))
          .append(", userHandle=")
          .append(
              userHandle.length > 0
                  ? Base64.encodeToString(
                      this.userHandle, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING)
                  : "(empty)")
          .append(", authenticatorAttachment=")
          .append(this.authenticatorAttachment)
          .append("}");
      return sb.toString();
    }
  }

  public static class Exception extends RuntimeException {
    public Exception(final String error) {
      super(error);
    }
  }

  @NonNull
  public static JSONObject getJSONObjectForMakeCredential(
      final GeckoBundle credentialBundle,
      final byte[] userId,
      final byte[] challenge,
      final int[] algs,
      final WebAuthnPublicCredential[] excludeList,
      final GeckoBundle authenticatorSelection)
      throws JSONException {
    final JSONObject json = credentialBundle.toJSONObject();
    // origin is unnecessary for requestJSON.
    json.remove("origin");
    json.remove("isWebAuthn");

    json.put(
        "challenge",
        Base64.encodeToString(challenge, Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP));

    final JSONObject user = json.getJSONObject("user");
    user.put(
        "id", Base64.encodeToString(userId, Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP));

    final JSONArray pubKeyCredParams = new JSONArray();
    for (final int alg : algs) {
      final JSONObject item = new JSONObject();
      item.put("alg", alg);
      item.put("type", "public-key");
      pubKeyCredParams.put(item);
    }
    json.put("pubKeyCredParams", pubKeyCredParams);

    final JSONArray excludeCredentials = new JSONArray();
    for (final WebAuthnPublicCredential cred : excludeList) {
      excludeCredentials.put(cred.toJSONObject());
    }
    json.put("excludeCredentials", excludeCredentials);

    final JSONObject authenticatorSelectionJSON = authenticatorSelection.toJSONObject();
    authenticatorSelectionJSON.put("requireResidentKey", true);
    json.put("authenticatorSelection", authenticatorSelectionJSON);

    final JSONObject extensions = new JSONObject();
    extensions.put("credProps", true);
    json.put("extensions", extensions);

    if (DEBUG) {
      Log.d(LOGTAG, "getJSONObjectForMakeCredential: JSON=\"" + json.toString() + "\"");
    }

    return json;
  }

  @NonNull
  public static JSONObject getJSONObjectForGetAssertion(
      final byte[] challenge,
      final WebAuthnPublicCredential[] allowList,
      final GeckoBundle assertionBundle,
      final GeckoBundle extensionsBundle)
      throws JSONException {
    final JSONObject json = assertionBundle.toJSONObject();
    // origin is unnecessary for requestJSON.
    json.remove("origin");
    json.remove("isWebAuthn");

    json.put(
        "challenge",
        Base64.encodeToString(challenge, Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP));

    final JSONArray allowCredentials = new JSONArray();
    for (final WebAuthnPublicCredential cred : allowList) {
      allowCredentials.put(cred.toJSONObject());
    }
    json.put("allowCredentials", allowCredentials);

    if (extensionsBundle.containsKey("fidoAppId")) {
      final JSONObject extensions = new JSONObject();
      extensions.put("appid", extensionsBundle.getString("fidoAppId"));
      json.put("extensions", extensions);
    }

    if (DEBUG) {
      Log.d(LOGTAG, "getJSONObjectForGetAssertion: JSON=\"" + json.toString() + "\"");
    }

    return json;
  }

  public static MakeCredentialResponse getMakeCredentialResponse(final @NonNull String responseJson)
      throws JSONException, IllegalArgumentException {
    final JSONObject json = new JSONObject(responseJson);
    final JSONObject response = json.getJSONObject("response");
    final JSONArray transportsArray = response.getJSONArray("transports");
    final String[] transports = new String[transportsArray.length()];
    for (int i = 0; i < transportsArray.length(); i++) {
      transports[i] = transportsArray.getString(i);
    }

    // TODO(m_kato):
    // PublicKey and PublicKeyAlgorithm are also put in easy accessors fields.
    // Chromium checks whether this value is same as the value into attestationObject.
    // Should we check it too?

    // This response has clientDataJson value, but origin in clientDataJson may be package's
    // fingerprint. So we don't use it into the response.
    return new MakeCredentialResponse.Builder()
        .setKeyHandle(Base64.decode(json.getString("rawId"), Base64.URL_SAFE))
        .setAttestationObject(
            Base64.decode(response.getString("attestationObject"), Base64.URL_SAFE))
        .setTransports(transports)
        .setAuthenticatorAttachment(json.getString("authenticatorAttachment"))
        .build();
  }

  public static GetAssertionResponse getGetAssertionResponse(final @NonNull String responseJson)
      throws JSONException, IllegalArgumentException {
    final JSONObject json = new JSONObject(responseJson);
    final JSONObject response = json.getJSONObject("response");
    final GetAssertionResponse.Builder builder = new GetAssertionResponse.Builder();

    try {
      builder.setUserHandle(Base64.decode(response.getString("userHandle"), Base64.URL_SAFE));
    } catch (final JSONException e) {
      // userHandle is an optional. Ignore exception if nothing.
    }

    // This response may have clientDataJson value, but signed hash is generated by request
    // parameter's hash. So we don't use the value into response.

    return builder
        .setKeyHandle(Base64.decode(json.getString("rawId"), Base64.URL_SAFE))
        .setAuthenticatorAttachment(json.getString("authenticatorAttachment"))
        .setAuthData(Base64.decode(response.getString("authenticatorData"), Base64.URL_SAFE))
        .setSignature(Base64.decode(response.getString("signature"), Base64.URL_SAFE))
        .build();
  }
}
