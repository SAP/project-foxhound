/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "gtest/gtest.h"
#include "mozilla/dom/IntegrityPolicyWAICT.h"
#include "mozilla/dom/WAICTManifestBinding.h"
#include "nsString.h"

using namespace mozilla::dom;

// Valid Manifests

TEST(WAICTManifestValidation, ValidManifestBasic)
{
  WAICTManifest manifest;
  nsCString json(R"JSON({
    "bt-server": "https://bt.example.com",
    "hashes": {
      "/assets/main.js": "r4j9yW07mpTFSQ6ZRYOV0Au8Hfn2NqjqQMBqKL/SWCY="
    }
  })JSON");

  auto status = IntegrityPolicyWAICT::ValidateManifest(json, manifest);

  EXPECT_EQ(status, IntegrityPolicyWAICT::ManifestValidationStatus::OK);
}

TEST(WAICTManifestValidation, ValidManifestWithMultipleHashes)
{
  WAICTManifest manifest;
  nsCString json(R"JSON({
    "bt-server": "https://bt.example.com",
    "hashes": {
      "/assets/x.html": "r4j9yW07mpTFSQ6ZRYOV0Au8Hfn2NqjqQMBqKL/SWCY=",
      "/assets/css/main.css": "zet5ebcBGt1+fr6F0vJbpOv7p4tV/fIbFH4AafxtBl0=",
      "/favicon.ico": "zbt5ebcBGt1+gr6F0vJbpOv7p4tV/fIbFH4AafxtBl0="
    }
  })JSON");

  auto status = IntegrityPolicyWAICT::ValidateManifest(json, manifest);

  EXPECT_EQ(status, IntegrityPolicyWAICT::ManifestValidationStatus::OK);
}

TEST(WAICTManifestValidation, ValidManifestWithMixedCaseBase64)
{
  WAICTManifest manifest;
  nsCString json(R"JSON({
    "hashes": {
      "/script.js": "R4J9Yw07MpTfSq6zRYOv0aU8HFN2nQJQqmbQkl/SwCy="
    }
  })JSON");

  auto status = IntegrityPolicyWAICT::ValidateManifest(json, manifest);

  EXPECT_EQ(status, IntegrityPolicyWAICT::ManifestValidationStatus::OK);
}

TEST(WAICTManifestValidation, ValidManifestWithOnlyHashes)
{
  WAICTManifest manifest;
  nsCString json(R"JSON({
    "hashes": {
      "/script.js": "r4j9yW07mpTFSQ6ZRYOV0Au8Hfn2NqjqQMBqKL/SWCY="
    }
  })JSON");

  auto status = IntegrityPolicyWAICT::ValidateManifest(json, manifest);

  EXPECT_EQ(status, IntegrityPolicyWAICT::ManifestValidationStatus::OK);
}

TEST(WAICTManifestValidation, ValidManifestWithOnlyAnyHashes)
{
  WAICTManifest manifest;
  nsCString json(R"JSON({
    "any_hashes": [
      "mVuswfW4XCBOWbx+QiKkPPQy+gTfr+i1sVADexgyN+8=",
      "H9OJUrESfT3SUlRpqAiDFEvqnnG2Sp9/eloyVMqxnnY="
    ]
  })JSON");

  auto status = IntegrityPolicyWAICT::ValidateManifest(json, manifest);

  EXPECT_EQ(status, IntegrityPolicyWAICT::ManifestValidationStatus::OK);
}

TEST(WAICTManifestValidation, ValidManifestWithBothAnyHashesAndHashes)
{
  WAICTManifest manifest;
  nsCString json(R"JSON({
    "bt-server": "https://bt.example.com",
    "hashes": {
      "/script.js": "r4j9yW07mpTFSQ6ZRYOV0Au8Hfn2NqjqQMBqKL/SWCY="
    },
    "any_hashes": [
      "mVuswfW4XCBOWbx+QiKkPPQy+gTfr+i1sVADexgyN+8=",
      "H9OJUrESfT3SUlRpqAiDFEvqnnG2Sp9/eloyVMqxnnY=",
      "0SsmrVFFC7wxU4QM5UeZeXBnyKlXTAzfkVsZXIrzabo="
    ]
  })JSON");

  auto status = IntegrityPolicyWAICT::ValidateManifest(json, manifest);

  EXPECT_EQ(status, IntegrityPolicyWAICT::ManifestValidationStatus::OK);
}

// We require that there is at least one hash anywhere, it's ok to have
// empty arrays if the condition is met.
TEST(WAICTManifestValidation, ValidManifestWithEmptyAnyHashes)
{
  WAICTManifest manifest;
  nsCString json(R"JSON({
    "bt-server": "https://bt.example.com",
    "hashes": {
      "/script.js": "r4j9yW07mpTFSQ6ZRYOV0Au8Hfn2NqjqQMBqKL/SWCY="
    },
    "any_hashes": []
  })JSON");

  auto status = IntegrityPolicyWAICT::ValidateManifest(json, manifest);

  EXPECT_EQ(status, IntegrityPolicyWAICT::ManifestValidationStatus::OK);
}

// We allow duplicate hashes in any_hashes for performance reasons.
// With large manifests (100k+ hashes), checking uniqueness would add
// significant overhead (O(n²) or O(n) with hash set). Duplicates are
// harmless - validation will just check the same hash multiple times.
TEST(WAICTManifestValidation, ValidManifestWithDuplicateAnyHashes)
{
  WAICTManifest manifest;
  nsCString json(R"JSON({
    "any_hashes": [
      "mVuswfW4XCBOWbx+QiKkPPQy+gTfr+i1sVADexgyN+8=",
      "H9OJUrESfT3SUlRpqAiDFEvqnnG2Sp9/eloyVMqxnnY=",
      "mVuswfW4XCBOWbx+QiKkPPQy+gTfr+i1sVADexgyN+8="
    ]
  })JSON");

  auto status = IntegrityPolicyWAICT::ValidateManifest(json, manifest);

  EXPECT_EQ(status, IntegrityPolicyWAICT::ManifestValidationStatus::OK);
}

TEST(WAICTManifestValidation, ValidManifestWithResourceDelimiter)
{
  WAICTManifest manifest;
  nsCString json(R"JSON({
    "hashes": {
      "/script.js": "r4j9yW07mpTFSQ6ZRYOV0Au8Hfn2NqjqQMBqKL/SWCY="
    },
    "resource_delimiter": "/* DELIMITER */"
  })JSON");

  auto status = IntegrityPolicyWAICT::ValidateManifest(json, manifest);

  EXPECT_EQ(status, IntegrityPolicyWAICT::ManifestValidationStatus::OK);
}

TEST(WAICTManifestValidation, ValidManifestWithTransparencyProof)
{
  WAICTManifest manifest;
  nsCString json(R"JSON({
    "hashes": {
      "/script.js": "r4j9yW07mpTFSQ6ZRYOV0Au8Hfn2NqjqQMBqKL/SWCY="
    },
    "transparency_proof": "Lbzg/T0VD/HIUTRcTcU0/zbtSeT2302RKTc0VfDHIUTRcTcU0"
  })JSON");

  auto status = IntegrityPolicyWAICT::ValidateManifest(json, manifest);

  EXPECT_EQ(status, IntegrityPolicyWAICT::ManifestValidationStatus::OK);
}

TEST(WAICTManifestValidation, ValidManifestWithAllOptionalFields)
{
  WAICTManifest manifest;
  nsCString json(R"JSON({
    "hashes": {
      "/script.js": "r4j9yW07mpTFSQ6ZRYOV0Au8Hfn2NqjqQMBqKL/SWCY="
    },
    "bt-server": "https://bt.example.com",
    "any_hashes": ["mVuswfW4XCBOWbx+QiKkPPQy+gTfr+i1sVADexgyN+8="],
    "resource_delimiter": "/* MY DELIM */",
    "transparency_proof": "Lbzg/T0VD/HIUTRcTcU0/zbtSeT2302RKTc0Vf..."
  })JSON");

  auto status = IntegrityPolicyWAICT::ValidateManifest(json, manifest);

  EXPECT_EQ(status, IntegrityPolicyWAICT::ManifestValidationStatus::OK);
}

// Invalid JSON

TEST(WAICTManifestValidation, InvalidJSON_Malformed)
{
  WAICTManifest manifest;
  nsCString json(R"JSON({
    "bt-server": "https://bt.example.com"
    "hashes": {
      "/script.js": "r4j9yW07mpTFSQ6ZRYOV0Au8Hfn2NqjqQMBqKL/SWCY="
    }
  })JSON");

  auto status = IntegrityPolicyWAICT::ValidateManifest(json, manifest);

  EXPECT_EQ(status,
            IntegrityPolicyWAICT::ManifestValidationStatus::InvalidJSON);
}

TEST(WAICTManifestValidation, InvalidJSON_NotAnObject)
{
  WAICTManifest manifest;
  nsCString json = "\"just a string\""_ns;

  auto status = IntegrityPolicyWAICT::ValidateManifest(json, manifest);

  EXPECT_EQ(status,
            IntegrityPolicyWAICT::ManifestValidationStatus::InvalidJSON);
}

TEST(WAICTManifestValidation, InvalidJSON_Empty)
{
  WAICTManifest manifest;
  nsCString json = ""_ns;

  auto status = IntegrityPolicyWAICT::ValidateManifest(json, manifest);

  EXPECT_EQ(status,
            IntegrityPolicyWAICT::ManifestValidationStatus::InvalidJSON);
}

// We require at least one hash to be present
TEST(WAICTManifestValidation, MissingBothHashesAndAnyHashes)
{
  WAICTManifest manifest;
  nsCString json(R"JSON({
  })JSON");

  auto status = IntegrityPolicyWAICT::ValidateManifest(json, manifest);

  EXPECT_EQ(status,
            IntegrityPolicyWAICT::ManifestValidationStatus::MissingHashes);
}

// We require at least one hash to be present
TEST(WAICTManifestValidation, EmptyHashesAndNoAnyHashes)
{
  WAICTManifest manifest;
  nsCString json(R"JSON({
    "hashes": {}
  })JSON");

  auto status = IntegrityPolicyWAICT::ValidateManifest(json, manifest);

  EXPECT_EQ(status,
            IntegrityPolicyWAICT::ManifestValidationStatus::MissingHashes);
}

TEST(WAICTManifestValidation, EmptyAnyHashesAndNoHashes)
{
  WAICTManifest manifest;
  nsCString json(R"JSON({
    "any_hashes": []
  })JSON");

  auto status = IntegrityPolicyWAICT::ValidateManifest(json, manifest);

  EXPECT_EQ(status,
            IntegrityPolicyWAICT::ManifestValidationStatus::MissingHashes);
}

TEST(WAICTManifestValidation, BothHashesAndAnyHashesEmpty)
{
  WAICTManifest manifest;
  nsCString json(R"JSON({
    "hashes": {},
    "any_hashes": []
  })JSON");

  auto status = IntegrityPolicyWAICT::ValidateManifest(json, manifest);

  EXPECT_EQ(status,
            IntegrityPolicyWAICT::ManifestValidationStatus::MissingHashes);
}

// Invalid Hash Formats

TEST(WAICTManifestValidation, InvalidHash_EmptyKey)
{
  WAICTManifest manifest;
  nsCString json(R"JSON({
    "bt-server": "https://bt.example.com",
    "hashes": {
      "": "r4j9yW07mpTFSQ6ZRYOV0Au8Hfn2NqjqQMBqKL/SWCY="
    }
  })JSON");

  auto status = IntegrityPolicyWAICT::ValidateManifest(json, manifest);

  EXPECT_EQ(status,
            IntegrityPolicyWAICT::ManifestValidationStatus::InvalidHashFormat);
}

TEST(WAICTManifestValidation, InvalidHash_EmptyValue)
{
  WAICTManifest manifest;
  nsCString json(R"JSON({
    "bt-server": "https://bt.example.com",
    "hashes": {
      "/script.js": ""
    }
  })JSON");

  auto status = IntegrityPolicyWAICT::ValidateManifest(json, manifest);

  EXPECT_EQ(status,
            IntegrityPolicyWAICT::ManifestValidationStatus::InvalidHashFormat);
}

TEST(WAICTManifestValidation, InvalidHash_TooShort)
{
  WAICTManifest manifest;
  nsCString json(R"JSON({
    "bt-server": "https://bt.example.com",
    "hashes": {
      "/script.js": "hashhash"
    }
  })JSON");

  auto status = IntegrityPolicyWAICT::ValidateManifest(json, manifest);

  EXPECT_EQ(status,
            IntegrityPolicyWAICT::ManifestValidationStatus::InvalidHashFormat);
}

TEST(WAICTManifestValidation, InvalidHash_TooLong)
{
  WAICTManifest manifest;
  nsCString json(R"JSON({
    "bt-server": "https://bt.example.com",
    "hashes": {
      "/script.js": "r4j9yW07mpTFSQ6ZRYOV0Au8Hfn2NqjqQMBqKL/SWCY=extra"
    }
  })JSON");

  auto status = IntegrityPolicyWAICT::ValidateManifest(json, manifest);

  EXPECT_EQ(status,
            IntegrityPolicyWAICT::ManifestValidationStatus::InvalidHashFormat);
}

TEST(WAICTManifestValidation, InvalidHash_InvalidBase64Characters)
{
  WAICTManifest manifest;
  nsCString json(R"JSON({
    "bt-server": "https://bt.example.com",
    "hashes": {
      "/script.js": "r4j9yW07mpT@SQ6ZRYOV0Au8Hfn2NqjqQMBqKL/SWCY="
    }
  })JSON");

  auto status = IntegrityPolicyWAICT::ValidateManifest(json, manifest);

  EXPECT_EQ(status,
            IntegrityPolicyWAICT::ManifestValidationStatus::InvalidHashFormat);
}

// = in the middle of base64
TEST(WAICTManifestValidation, InvalidHash_WrongPaddingPosition)
{
  WAICTManifest manifest;
  nsCString json(R"JSON({
    "bt-server": "https://bt.example.com",
    "hashes": {
      "/script.js": "r4j9yW07mpTFSQ6ZRYOV0Au8Hfn2N=jqQMBqKL/SWCY"
    }
  })JSON");

  auto status = IntegrityPolicyWAICT::ValidateManifest(json, manifest);

  EXPECT_EQ(status,
            IntegrityPolicyWAICT::ManifestValidationStatus::InvalidHashFormat);
}

// The next 2 come from the condition that base64 of sha256 is 43/44 chars
TEST(WAICTManifestValidation, InvalidHash_43CharsWithPadding)
{
  WAICTManifest manifest;
  nsCString json(R"JSON({
    "bt-server": "https://bt.example.com",
    "hashes": {
      "/script.js": "r4j9yW07mpTFSQ6ZRYOV0Au8Hfn2NqjqQMBqKL/SWC="
    }
  })JSON");

  auto status = IntegrityPolicyWAICT::ValidateManifest(json, manifest);

  EXPECT_EQ(status,
            IntegrityPolicyWAICT::ManifestValidationStatus::InvalidHashFormat);
}

TEST(WAICTManifestValidation, InvalidHash_44CharsWithoutPadding)
{
  WAICTManifest manifest;
  nsCString json(R"JSON({
    "bt-server": "https://bt.example.com",
    "hashes": {
      "/script.js": "r4j9yW07mpTFSQ6ZRYOV0Au8Hfn2NqjqQMBqKL/SWCYA"
    }
  })JSON");

  auto status = IntegrityPolicyWAICT::ValidateManifest(json, manifest);

  EXPECT_EQ(status,
            IntegrityPolicyWAICT::ManifestValidationStatus::InvalidHashFormat);
}

TEST(WAICTManifestValidation, InvalidHash_OneHashInvalid)
{
  WAICTManifest manifest;
  nsCString json(R"JSON({
    "bt-server": "https://bt.example.com",
    "hashes": {
      "/valid.js": "r4j9yW07mpTFSQ6ZRYOV0Au8Hfn2NqjqQMBqKL/SWCY=",
      "/invalid.js": "tooshort"
    }
  })JSON");

  auto status = IntegrityPolicyWAICT::ValidateManifest(json, manifest);

  EXPECT_EQ(status,
            IntegrityPolicyWAICT::ManifestValidationStatus::InvalidHashFormat);
}

// We are fine with an empty buffer, but empty string as a hash is considered as
// an exception
TEST(WAICTManifestValidation, InvalidAnyHash_EmptyString)
{
  WAICTManifest manifest;
  nsCString json(R"JSON({
    "bt-server": "https://bt.example.com",
    "hashes": {
      "/script.js": "r4j9yW07mpTFSQ6ZRYOV0Au8Hfn2NqjqQMBqKL/SWCY="
    },
    "any_hashes": [""]
  })JSON");

  auto status = IntegrityPolicyWAICT::ValidateManifest(json, manifest);

  EXPECT_EQ(status,
            IntegrityPolicyWAICT::ManifestValidationStatus::InvalidHashFormat);
}

// The next is the same as for hashes
TEST(WAICTManifestValidation, InvalidAnyHash_TooShort)
{
  WAICTManifest manifest;
  nsCString json(R"JSON({
    "bt-server": "https://bt.example.com",
    "hashes": {
      "/script.js": "r4j9yW07mpTFSQ6ZRYOV0Au8Hfn2NqjqQMBqKL/SWCY="
    },
    "any_hashes": ["tooshort"]
  })JSON");

  auto status = IntegrityPolicyWAICT::ValidateManifest(json, manifest);

  EXPECT_EQ(status,
            IntegrityPolicyWAICT::ManifestValidationStatus::InvalidHashFormat);
}

TEST(WAICTManifestValidation, InvalidAnyHash_OneValidOneInvalid)
{
  WAICTManifest manifest;
  nsCString json(R"JSON({
    "bt-server": "https://bt.example.com",
    "hashes": {
      "/script.js": "r4j9yW07mpTFSQ6ZRYOV0Au8Hfn2NqjqQMBqKL/SWCY="
    },
    "any_hashes": [
      "mVuswfW4XCBOWbx+QiKkPPQy+gTfr+i1sVADexgyN+8=",
      "invalid"
    ]
  })JSON");

  auto status = IntegrityPolicyWAICT::ValidateManifest(json, manifest);

  EXPECT_EQ(status,
            IntegrityPolicyWAICT::ManifestValidationStatus::InvalidHashFormat);
}

// Potential attack: Memory exhaustion via extremely long hash values
TEST(WAICTManifestValidation, InvalidHash_VeryLongHash)
{
  WAICTManifest manifest;
  nsCString veryLongHash;
  for (int i = 0; i < 10000; i++) {
    veryLongHash.Append('A');
  }

  nsCString json;
  json.Append(R"JSON({
    "hashes": {
      "/script.js": ")JSON");
  json.Append(veryLongHash);
  json.Append(R"JSON("
    }
  })JSON");

  auto status = IntegrityPolicyWAICT::ValidateManifest(json, manifest);

  EXPECT_EQ(status,
            IntegrityPolicyWAICT::ManifestValidationStatus::InvalidHashFormat);
}

// Potential attack: Path traversal or injection via special characters
TEST(WAICTManifestValidation, InvalidHash_SpecialCharactersInKey)
{
  WAICTManifest manifest;
  nsCString json(R"JSON({
    "hashes": {
      "../../../etc/passwd": "r4j9yW07mpTFSQ6ZRYOV0Au8Hfn2NqjqQMBqKL/SWCY="
    }
  })JSON");

  auto status = IntegrityPolicyWAICT::ValidateManifest(json, manifest);

  EXPECT_EQ(status, IntegrityPolicyWAICT::ManifestValidationStatus::OK);
}

// Potential attack: Memory exhaustion via extremely long keys
TEST(WAICTManifestValidation, InvalidHash_VeryLongKey)
{
  WAICTManifest manifest;
  nsCString veryLongKey;
  for (int i = 0; i < 10000; i++) {
    veryLongKey.Append("/very/long/path");
  }

  nsCString json;
  json.Append(R"JSON({
    "hashes": {
      ")JSON");
  json.Append(veryLongKey);
  json.Append(R"JSON(": "r4j9yW07mpTFSQ6ZRYOV0Au8Hfn2NqjqQMBqKL/SWCY="
    }
  })JSON");

  auto status = IntegrityPolicyWAICT::ValidateManifest(json, manifest);

  EXPECT_EQ(status, IntegrityPolicyWAICT::ManifestValidationStatus::OK);
}

TEST(WAICTManifestValidation, InvalidHash_LeadingWhitespace)
{
  WAICTManifest manifest;
  nsCString json(R"JSON({
    "hashes": {
      "/script.js": " r4j9yW07mpTFSQ6ZRYOV0Au8Hfn2NqjqQMBqKL/SWCY="
    }
  })JSON");

  auto status = IntegrityPolicyWAICT::ValidateManifest(json, manifest);

  EXPECT_EQ(status,
            IntegrityPolicyWAICT::ManifestValidationStatus::InvalidHashFormat);
}

TEST(WAICTManifestValidation, InvalidHash_TrailingWhitespace)
{
  WAICTManifest manifest;
  nsCString json(R"JSON({
    "hashes": {
      "/script.js": "r4j9yW07mpTFSQ6ZRYOV0Au8Hfn2NqjqQMBqKL/SWCY= "
    }
  })JSON");

  auto status = IntegrityPolicyWAICT::ValidateManifest(json, manifest);

  EXPECT_EQ(status,
            IntegrityPolicyWAICT::ManifestValidationStatus::InvalidHashFormat);
}

TEST(WAICTManifestValidation, InvalidHash_EmbeddedWhitespace)
{
  WAICTManifest manifest;
  nsCString json(R"JSON({
    "hashes": {
      "/script.js": "r4j9yW07mpTFSQ6ZRYOV0Au8 Hfn2NqjqQMBqKL/SWCY="
    }
  })JSON");

  auto status = IntegrityPolicyWAICT::ValidateManifest(json, manifest);

  EXPECT_EQ(status,
            IntegrityPolicyWAICT::ManifestValidationStatus::InvalidHashFormat);
}

// Null bytes are not valid in JSON strings, so the JSON parser rejects
// this before we even reach hash validation
TEST(WAICTManifestValidation, InvalidHash_NullByte)
{
  WAICTManifest manifest;
  nsCString json(R"JSON({
    "hashes": {
      "/script.js": "r4j9yW07mpTFSQ6ZRYOV0Au8)JSON");
  json.Append('\0');
  json.Append(R"JSON(Hfn2NqjqQMBqKL/SWCY="
    }
  })JSON");

  auto status = IntegrityPolicyWAICT::ValidateManifest(json, manifest);

  EXPECT_EQ(status,
            IntegrityPolicyWAICT::ManifestValidationStatus::InvalidJSON);
}
