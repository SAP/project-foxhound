// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

// --- asn1 ---

if (DebugSymbol.findFunctionsNamed("SEC_ASN1DecodeItem_Util").length) {
  console.log("Attaching `SEC_ASN1DecodeItem_Util` interceptor...");
  Interceptor.attach(DebugSymbol.fromName("SEC_ASN1DecodeItem_Util").address, {
    onEnter: function (args) {
      const secItem = args[3]; // { type(8), data(8), len(4) }

      const len = secItem.add(8).add(8).readUInt();
      const buf = secItem.add(8).readByteArray(len);

      send({
        func: "SEC_ASN1DecodeItem_Util",
        data: new Uint8Array(buf),
      });
    },
  });
}

// --- dsau ---

if (DebugSymbol.findFunctionsNamed("DSAU_DecodeDerSig").length) {
  console.log("Attaching `DSAU_DecodeDerSig` interceptor...");
  Interceptor.attach(DebugSymbol.fromName("DSAU_DecodeDerSig").address, {
    onEnter: function (args) {
      const secItem = args[0]; // { type(8), data(8), len(4) }

      const len = secItem.add(8).add(8).readUInt();
      const buf = secItem.add(8).readByteArray(len);

      send({
        func: "DSAU_DecodeDerSig",
        data: new Uint8Array(buf),
      });
    },
  });
}

if (DebugSymbol.findFunctionsNamed("DSAU_DecodeDerSigToLen").length) {
  console.log("Attaching `DSAU_DecodeDerSigToLen` interceptor...");
  Interceptor.attach(DebugSymbol.fromName("DSAU_DecodeDerSigToLen").address, {
    onEnter: function (args) {
      const secItem = args[0]; // { type(8), data(8), len(4) }

      const len = secItem.add(8).add(8).readUInt();
      const buf = secItem.add(8).readByteArray(len);

      send({
        func: "DSAU_DecodeDerSigToLen",
        data: new Uint8Array(buf),
      });
    },
  });
}

// --- certDN ---

if (DebugSymbol.findFunctionsNamed("CERT_AsciiToName").length) {
  console.log("Attaching `CERT_AsciiToName` interceptor...");
  Interceptor.attach(DebugSymbol.fromName("CERT_AsciiToName").address, {
    onEnter: function (args) {
      send({
        func: "CERT_AsciiToName",
        data: args[0].readUtf8String(),
      });
    },
  });
}

// --- ech ---

if (DebugSymbol.findFunctionsNamed("tls13_DecodeEchConfigs").length) {
  console.log("Attaching `tls13_DecodeEchConfigs` interceptor...");
  Interceptor.attach(DebugSymbol.fromName("tls13_DecodeEchConfigs").address, {
    onEnter: function (args) {
      const secItem = args[3]; // { type(8), data(8), len(4) }

      const len = secItem.add(8).add(8).readUInt();
      const buf = secItem.add(8).readByteArray(len);

      send({
        func: "tls13_DecodeEchConfigs",
        data: new Uint8Array(buf),
      });
    },
  });
}

// --- pkcs7 ---

if (DebugSymbol.findFunctionsNamed("CERT_DecodeCertPackage").length) {
  console.log("Attaching `CERT_DecodeCertPackage` interceptor...");
  Interceptor.attach(DebugSymbol.fromName("CERT_DecodeCertPackage").address, {
    onEnter: function (args) {
      const len = args[1].toInt32();
      const buf = args[0].readByteArray(len);

      send({
        func: "CERT_DecodeCertPackage",
        data: new Uint8Array(buf),
      });
    },
  });
}

// --- pkcs8 ---

if (
  DebugSymbol.findFunctionsNamed("PK11_ImportDERPrivateKeyInfoAndReturnKey")
    .length
) {
  console.log(
    "Attaching `PK11_ImportDERPrivateKeyInfoAndReturnKey` interceptor...",
  );
  Interceptor.attach(
    DebugSymbol.fromName("PK11_ImportDERPrivateKeyInfoAndReturnKey").address,
    {
      onEnter: function (args) {
        const secItem = args[3]; // { type(8), data(8), len(4) }

        const len = secItem.add(8).add(8).readUInt();
        const buf = secItem.add(8).readByteArray(len);

        send({
          func: "PK11_ImportDERPrivateKeyInfoAndReturnKey",
          data: new Uint8Array(buf),
        });
      },
    },
  );
}

// --- pkcs12 ---

if (DebugSymbol.findFunctionsNamed("SEC_PKCS12DecoderUpdate").length) {
  console.log("Attaching `SEC_PKCS12DecoderUpdate` interceptor...");
  Interceptor.attach(DebugSymbol.fromName("SEC_PKCS12DecoderUpdate").address, {
    onEnter: function (args) {
      const len = args[2].toInt32();
      const buf = args[1].readByteArray(len);

      send({ func: "SEC_PKCS12DecoderUpdate", data: new Uint8Array(buf) });
    },
  });
}

// --- quickder ---

if (DebugSymbol.findFunctionsNamed("SEC_QuickDERDecodeItem_Util").length) {
  console.log("Attaching `SEC_QuickDERDecodeItem_Util` interceptor...");
  Interceptor.attach(
    DebugSymbol.fromName("SEC_QuickDERDecodeItem_Util").address,
    {
      onEnter: function (args) {
        const secItem = args[3]; // { type(8), data(8), len(4) }

        const len = secItem.add(8).add(8).readUInt();
        const buf = secItem.add(8).readByteArray(len);

        send({
          func: "SEC_QuickDERDecodeItem_Util",
          data: new Uint8Array(buf),
        });
      },
    },
  );
}

// -- smime --

if (DebugSymbol.findFunctionsNamed("NSS_CMSDecoder_Update").length) {
  console.log("Attaching `NSS_CMSDecoder_Update` interceptor...");
  Interceptor.attach(DebugSymbol.fromName("NSS_CMSDecoder_Update").address, {
    onEnter: function (args) {
      const len = args[2].toInt32();
      const buf = args[1].readByteArray(len);

      send({ func: "NSS_CMSDecoder_Update", data: new Uint8Array(buf) });
    },
  });
}

// --- ec-derive ---

if (DebugSymbol.findFunctionsNamed("PK11_PubDeriveWithKDF").length) {
  console.log("Attaching `PK11_PubDeriveWithKDF` interceptor...");
  Interceptor.attach(DebugSymbol.fromName("PK11_PubDeriveWithKDF").address, {
    onEnter: function (args) {
      // { arena(8), keyType(4), padding(4),
      //   pkcs11Slot(8), pkcs11ID(8), u(296) }
      const pubKey = args[1];

      // Check that keyType is ecKey = 6.
      const keyType = pubKey.add(8).readU32();
      if (keyType !== 6) {
        return;
      }

      // { DEREncodedParams(24), size(4), padding(4),
      //   publicValue(24), encoding(4), padding(4) }
      const u = pubKey.add(32);
      const paramData = u.add(8).readPointer();
      const paramLen = u.add(16).readUInt();
      const pubData = u.add(40).readPointer();
      const pubLen = u.add(48).readUInt();

      if (paramLen === 0 || pubLen === 0) {
        return;
      }

      const blob = new Uint8Array(paramLen + pubLen);
      blob.set(new Uint8Array(paramData.readByteArray(paramLen)), 0);
      blob.set(new Uint8Array(pubData.readByteArray(pubLen)), paramLen);

      send({ func: "PK11_PubDeriveWithKDF", data: blob });
    },
  });
}

// --- TLS ---

if (DebugSymbol.findFunctionsNamed("ssl_DefClose").length) {
  console.log("Attaching `ssl_DefClose` interceptor...");
  Interceptor.attach(DebugSymbol.fromName("ssl_DefClose").address, {
    onEnter: function (args) {
      send({ func: "ssl_DefClose", ss: args[0] });
    },
  });
}

if (DebugSymbol.findFunctionsNamed("ssl_DefRecv").length) {
  console.log("Attaching `ssl_DefRecv` interceptor...");
  Interceptor.attach(DebugSymbol.fromName("ssl_DefRecv").address, {
    onEnter: function (args) {
      this.ss = args[0];
      this.buf = args[1];
      this.len = args[2].toInt32();
    },
    onLeave: function (_retVal) {
      const buf = this.buf.readByteArray(this.len);

      send({
        func: "ssl_DefRecv",
        ss: this.ss,
        data: new Uint8Array(buf),
      });
    },
  });
}

if (DebugSymbol.findFunctionsNamed("ssl_DefRead").length) {
  console.log("Attaching `ssl_DefRead` interceptor...");
  Interceptor.attach(DebugSymbol.fromName("ssl_DefRead").address, {
    onEnter: function (args) {
      this.ss = args[0];
      this.buf = args[1];
      this.len = args[2].toInt32();
    },
    onLeave: function (_retVal) {
      const buf = this.buf.readByteArray(this.len);

      send({
        func: "ssl_DefRead",
        ss: this.ss,
        data: new Uint8Array(buf),
      });
    },
  });
}
