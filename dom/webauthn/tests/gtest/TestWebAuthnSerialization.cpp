/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "gtest/gtest.h"
#include "js/ArrayBuffer.h"
#include "js/CharacterEncoding.h"
#include "js/GlobalObject.h"
#include "js/JSON.h"
#include "js/Realm.h"
#include "js/RootingAPI.h"
#include "js/String.h"
#include "js/TypeDecls.h"
#include "mozilla/Base64.h"
#include "mozilla/dom/PublicKeyCredential.h"
#include "mozilla/dom/RootedDictionary.h"
#include "mozilla/dom/SimpleGlobalObject.h"
#include "mozilla/dom/TypedArray.h"
#include "mozilla/dom/WebAuthenticationBinding.h"
#include "mozilla/dom/WebAuthnUtil.h"
#include "mozilla/gtest/MozHelpers.h"
#include "nsContentUtils.h"

using namespace mozilla;
using namespace mozilla::dom;

class WebAuthnSerializationTest : public ::testing::Test {
 protected:
  JSContext* Context() { return mCx; }

  GlobalObject CreateGlobalObject(JS::Handle<JSObject*> aGlobal) {
    return GlobalObject(mCx, aGlobal);
  }

  bool JSONValuesEqual(JS::Handle<JS::Value> aVal1,
                       JS::Handle<JS::Value> aVal2) {
    if (aVal1.type() != aVal2.type()) {
      return false;
    }

    if (aVal1.isString()) {
      int32_t result;
      if (!JS_CompareStrings(mCx, aVal1.toString(), aVal2.toString(),
                             &result)) {
        return false;
      }
      return result == 0;
    }

    if (aVal1.isNumber()) {
      return aVal1.toNumber() == aVal2.toNumber();
    }

    if (aVal1.isBoolean()) {
      return aVal1.toBoolean() == aVal2.toBoolean();
    }

    if (aVal1.isUndefined() || aVal1.isNull()) {
      return true;
    }

    if (aVal1.isObject()) {
      JS::Rooted<JSObject*> obj1(mCx, &aVal1.toObject());
      JS::Rooted<JSObject*> obj2(mCx, &aVal2.toObject());

      bool isArray1, isArray2;
      if (!JS::IsArrayObject(mCx, obj1, &isArray1) ||
          !JS::IsArrayObject(mCx, obj2, &isArray2)) {
        return false;
      }

      if (isArray1 && isArray2) {
        uint32_t length1, length2;
        if (!JS::GetArrayLength(mCx, obj1, &length1) ||
            !JS::GetArrayLength(mCx, obj2, &length2)) {
          return false;
        }
        if (length1 != length2) {
          return false;
        }

        for (uint32_t i = 0; i < length1; i++) {
          JS::Rooted<JS::Value> elem1(mCx);
          JS::Rooted<JS::Value> elem2(mCx);
          if (!JS_GetElement(mCx, obj1, i, &elem1) ||
              !JS_GetElement(mCx, obj2, i, &elem2)) {
            return false;
          }
          if (!JSONValuesEqual(elem1, elem2)) {
            return false;
          }
        }
        return true;
      }

      JS::Rooted<JS::IdVector> ids1(mCx, JS::IdVector(mCx));
      JS::Rooted<JS::IdVector> ids2(mCx, JS::IdVector(mCx));
      if (!JS_Enumerate(mCx, obj1, &ids1) || !JS_Enumerate(mCx, obj2, &ids2)) {
        return false;
      }

      if (ids1.length() != ids2.length()) {
        return false;
      }

      for (size_t i = 0; i < ids1.length(); i++) {
        JS::Rooted<JS::Value> val1(mCx);
        JS::Rooted<JS::Value> val2(mCx);
        if (!JS_GetPropertyById(mCx, obj1, ids1[i], &val1) ||
            !JS_GetPropertyById(mCx, obj2, ids1[i], &val2)) {
          return false;
        }

        if (!JSONValuesEqual(val1, val2)) {
          return false;
        }
      }
      return true;
    }

    return false;
  }

  JSContext* mCx;
};

TEST_F(WebAuthnSerializationTest, JSONStringRoundTripForCreationOptions) {
  JS::Rooted<JSObject*> global(
      mozilla::dom::RootingCx(),
      mozilla::dom::SimpleGlobalObject::Create(
          mozilla::dom::SimpleGlobalObject::GlobalType::BindingDetail));
  mozilla::dom::AutoJSAPI jsAPI;
  ASSERT_TRUE(jsAPI.Init(global));
  mCx = jsAPI.cx();

  const nsLiteralString inputJSONStr =
      uR"({
    "rp": {
      "name": "Example",
      "id": "example.com"
    },
    "user": {
      "id": "19TVpqBBOAM",
      "name": "username2",
      "displayName": "another display name"
    },
    "challenge": "dR82FeUh5q4",
    "pubKeyCredParams": [{
      "type": "public-key",
      "alg": -7
    }],
    "timeout": 20000,
    "excludeCredentials": [{
      "type": "public-key",
      "id": "TeM2k_di7Dk",
      "transports": ["usb"]
    }],
    "authenticatorSelection": {
      "authenticatorAttachment": "platform",
      "residentKey": "required",
      "requireResidentKey": true,
      "userVerification": "discouraged"
    },
    "hints": ["hybrid"],
    "attestation": "indirect",
    "extensions": {
      "appid": "https://www.example.com/appID",
      "credProps": true,
      "hmacCreateSecret": true,
      "minPinLength": true,
      "credentialProtectionPolicy": "userVerificationOptional",
      "enforceCredentialProtectionPolicy": true,
      "largeBlob": {
        "support": "required"
      },
      "prf": {
        "eval": {
          "first": "Zmlyc3Q",
          "second": "c2Vjb25k"
        },
        "evalByCredential": {
          "19TVpqBBOAM": {
            "first": "Zmlyc3Q",
            "second": "c2Vjb25k"
          }
        }
      }
    }
  })"_ns;

  GlobalObject globalObject = CreateGlobalObject(global);

  JS::Rooted<JS::Value> inputJSONValue(mCx);
  ASSERT_TRUE(JS_ParseJSON(mCx, inputJSONStr.get(), inputJSONStr.Length(),
                           &inputJSONValue));

  RootedDictionary<PublicKeyCredentialCreationOptionsJSON> jsonOptions(mCx);
  ASSERT_TRUE(jsonOptions.Init(mCx, inputJSONValue));

  RootedDictionary<PublicKeyCredentialCreationOptions> options(mCx);
  IgnoredErrorResult error;

  PublicKeyCredential::ParseCreationOptionsFromJSON(globalObject, jsonOptions,
                                                    options, error);
  ASSERT_FALSE(error.Failed());

  nsString outputJSONStr;
  nsresult rv = SerializeWebAuthnCreationOptions(mCx, options.mRp.mId.Value(),
                                                 options, outputJSONStr);
  ASSERT_TRUE(NS_SUCCEEDED(rv));

  JS::Rooted<JS::Value> outputJSONValue(mCx);
  ASSERT_TRUE(JS_ParseJSON(mCx, outputJSONStr.get(), outputJSONStr.Length(),
                           &outputJSONValue));
  ASSERT_FALSE(JS_IsExceptionPending(mCx));

  EXPECT_TRUE(JSONValuesEqual(inputJSONValue, outputJSONValue));
}

TEST_F(WebAuthnSerializationTest, JSONStringRoundTripForRequestOptions) {
  JS::Rooted<JSObject*> global(
      mozilla::dom::RootingCx(),
      mozilla::dom::SimpleGlobalObject::Create(
          mozilla::dom::SimpleGlobalObject::GlobalType::BindingDetail));
  mozilla::dom::AutoJSAPI jsAPI;
  ASSERT_TRUE(jsAPI.Init(global));
  mCx = jsAPI.cx();

  const nsLiteralString inputJSONStr =
      uR"({
    "challenge": "QAfaZwEQCkQ",
    "timeout": 25000,
    "rpId": "example.com",
    "allowCredentials": [{
      "type": "public-key",
      "id": "BTBXXGuXRTk",
      "transports": ["smart-card"]
    }],
    "userVerification": "discouraged",
    "hints": ["client-device"],
    "extensions": {
      "appid": "https://www.example.com/anotherAppID",
      "largeBlob": {
        "read": true,
        "write": "YmxvYmRhdGE"
      },
      "prf": {
        "eval": {
          "first": "Zmlyc3Q",
          "second": "c2Vjb25k"
        },
        "evalByCredential": {
          "19TVpqBBOAM": {
            "first": "Zmlyc3Q",
            "second": "c2Vjb25k"
          }
        }
      }
    }
  })"_ns;

  GlobalObject globalObject = CreateGlobalObject(global);

  JS::Rooted<JS::Value> inputJSONValue(mCx);
  ASSERT_TRUE(JS_ParseJSON(mCx, inputJSONStr.get(), inputJSONStr.Length(),
                           &inputJSONValue));

  RootedDictionary<PublicKeyCredentialRequestOptionsJSON> jsonOptions(mCx);
  ASSERT_TRUE(jsonOptions.Init(mCx, inputJSONValue));

  RootedDictionary<PublicKeyCredentialRequestOptions> options(mCx);
  IgnoredErrorResult error;

  PublicKeyCredential::ParseRequestOptionsFromJSON(globalObject, jsonOptions,
                                                   options, error);
  ASSERT_FALSE(error.Failed());

  nsString outputJSONStr;
  nsresult rv = SerializeWebAuthnRequestOptions(mCx, options.mRpId.Value(),
                                                options, outputJSONStr);
  ASSERT_TRUE(NS_SUCCEEDED(rv));

  JS::Rooted<JS::Value> outputJSONValue(mCx);
  ASSERT_TRUE(JS_ParseJSON(mCx, outputJSONStr.get(), outputJSONStr.Length(),
                           &outputJSONValue));
  ASSERT_FALSE(JS_IsExceptionPending(mCx));

  EXPECT_TRUE(JSONValuesEqual(inputJSONValue, outputJSONValue));
}
