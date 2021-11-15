/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { fxAccounts, FxAccounts } = ChromeUtils.import(
  "resource://gre/modules/FxAccounts.jsm"
);

const { PREF_ACCOUNT_ROOT } = ChromeUtils.import(
  "resource://gre/modules/FxAccountsCommon.js"
);

const { FxAccountsProfile } = ChromeUtils.import(
  "resource://gre/modules/FxAccountsProfile.jsm"
);

const { FxAccountsProfileClient } = ChromeUtils.import(
  "resource://gre/modules/FxAccountsProfileClient.jsm"
);

const { FxAccountsTelemetry } = ChromeUtils.import(
  "resource://gre/modules/FxAccountsTelemetry.jsm"
);

XPCOMUtils.defineLazyModuleGetters(this, {
  FxAccountsConfig: "resource://gre/modules/FxAccountsConfig.jsm",
  jwcrypto: "resource://services-crypto/jwcrypto.jsm",
  CryptoUtils: "resource://services-crypto/utils.js",
  PromiseUtils: "resource://gre/modules/PromiseUtils.jsm",
});

_("Misc tests for FxAccounts.telemetry");

const MOCK_HASHED_UID = "00112233445566778899aabbccddeeff";
const MOCK_DEVICE_ID = "ffeeddccbbaa99887766554433221100";

add_task(function test_sanitized_uid() {
  Services.prefs.deleteBranch(
    "identity.fxaccounts.account.telemetry.sanitized_uid"
  );

  // Returns `null` by default.
  Assert.equal(fxAccounts.telemetry.getSanitizedUID(), null);

  // Returns provided value if set.
  fxAccounts.telemetry._setHashedUID(MOCK_HASHED_UID);
  Assert.equal(fxAccounts.telemetry.getSanitizedUID(), MOCK_HASHED_UID);

  // Reverts to unset for falsey values.
  fxAccounts.telemetry._setHashedUID("");
  Assert.equal(fxAccounts.telemetry.getSanitizedUID(), null);
});

add_task(function test_sanitize_device_id() {
  Services.prefs.deleteBranch(
    "identity.fxaccounts.account.telemetry.sanitized_uid"
  );

  // Returns `null` by default.
  Assert.equal(fxAccounts.telemetry.sanitizeDeviceId(MOCK_DEVICE_ID), null);

  // Hashes with the sanitized UID if set.
  // (test value here is SHA256(MOCK_DEVICE_ID + MOCK_HASHED_UID))
  fxAccounts.telemetry._setHashedUID(MOCK_HASHED_UID);
  Assert.equal(
    fxAccounts.telemetry.sanitizeDeviceId(MOCK_DEVICE_ID),
    "dd7c845006df9baa1c6d756926519c8ce12f91230e11b6057bf8ec65f9b55c1a"
  );

  // Reverts to unset for falsey values.
  fxAccounts.telemetry._setHashedUID("");
  Assert.equal(fxAccounts.telemetry.sanitizeDeviceId(MOCK_DEVICE_ID), null);
});

add_task(async function test_getEcosystemAnonId() {
  const ecosystemAnonId = "aaaaaaaaaaaaaaa";
  const testCases = [
    {
      // testing retrieving the ecosystemAnonId from account state
      throw: false,
      accountStateObj: { ecosystemAnonId, ecosystemUserId: "eco-uid" },
      profileObj: { ecosystemAnonId: "bbbbbbbbbbbbbb" },
      expectedEcosystemAnonId: ecosystemAnonId,
    },
    {
      // testing retrieving the ecosystemAnonId when the profile contains it
      throw: false,
      accountStateObj: {},
      profileObj: { ecosystemAnonId },
      expectedEcosystemAnonId: ecosystemAnonId,
    },
    {
      // testing retrieving the ecosystemAnonId when the profile doesn't contain it
      throw: false,
      accountStateObj: {},
      profileObj: {},
      expectedEcosystemAnonId: null,
    },
    {
      // testing retrieving the ecosystemAnonId when the profile is null
      throw: true,
      accountStateObj: {},
      profileObj: null,
      expectedEcosystemAnonId: null,
    },
  ];

  for (const tc of testCases) {
    const profile = new FxAccountsProfile({
      profileServerUrl: "http://testURL",
    });
    const telemetry = new FxAccountsTelemetry({
      profile,
      withCurrentAccountState: async cb => {
        return cb({
          getUserAccountData: async () => {
            return { ...tc.accountStateObj };
          },
        });
      },
    });
    const mockProfile = sinon.mock(profile);
    const mockTelemetry = sinon.mock(telemetry);

    if (!tc.accountStateObj.ecosystemUserId) {
      if (tc.throw) {
        mockProfile
          .expects("getProfile")
          .once()
          .throws(Error);
      } else {
        mockProfile
          .expects("getProfile")
          .once()
          .returns(tc.profileObj);
      }
    }

    if (tc.expectedEcosystemAnonId) {
      mockTelemetry.expects("ensureEcosystemAnonId").never();
    } else {
      mockTelemetry
        .expects("ensureEcosystemAnonId")
        .once()
        .resolves("dddddddddd");
    }

    const actualEcoSystemAnonId = await telemetry.getEcosystemAnonId();
    mockProfile.verify();
    mockTelemetry.verify();
    Assert.equal(actualEcoSystemAnonId, tc.expectedEcosystemAnonId);
  }
});

add_task(async function test_ensureEcosystemAnonId_useAnonIdFromAccountState() {
  // If there's an eco-uid and anon-id in the account state,
  // we should use them without attempting any other updates.
  const expectedEcosystemAnonId = "account-state-anon-id";

  const telemetry = new FxAccountsTelemetry({
    withCurrentAccountState: async cb => {
      return cb({
        getUserAccountData: async () => {
          return {
            ecosystemAnonId: expectedEcosystemAnonId,
            ecosystemUserId: "account-state-eco-uid",
          };
        },
      });
    },
  });

  const actualEcoSystemAnonId = await telemetry.ensureEcosystemAnonId();

  Assert.equal(actualEcoSystemAnonId, expectedEcosystemAnonId);
});

add_task(async function test_ensureEcosystemAnonId_useUserIdFromAccountState() {
  // If there's an eco-uid in the account state but not anon-id,
  // we should generate and save our own unique anon-id.
  const expectedEcosystemUserId = "02".repeat(32);
  const expectedEcosystemAnonId = "bbbbbbbbbbbb";

  const mockedUpdate = sinon
    .mock()
    .once()
    .withExactArgs({
      ecosystemAnonId: expectedEcosystemAnonId,
    });
  const telemetry = new FxAccountsTelemetry({
    withCurrentAccountState: async cb => {
      return cb({
        getUserAccountData: async () => {
          return {
            // Note: no ecosystemAnonId field here.
            ecosystemUserId: expectedEcosystemUserId,
          };
        },
        updateUserAccountData: mockedUpdate,
      });
    },
  });
  const mockFxAccountsConfig = sinon.mock(FxAccountsConfig);
  const mockJwcrypto = sinon.mock(jwcrypto);

  mockFxAccountsConfig
    .expects("fetchConfigDocument")
    .once()
    .returns({
      ecosystem_anon_id_keys: ["testKey"],
    });

  mockJwcrypto
    .expects("generateJWE")
    .once()
    .withExactArgs("testKey", new TextEncoder().encode(expectedEcosystemUserId))
    .returns(expectedEcosystemAnonId);

  const actualEcosystemAnonId = await telemetry.ensureEcosystemAnonId();
  Assert.equal(expectedEcosystemAnonId, actualEcosystemAnonId);

  mockFxAccountsConfig.verify();
  mockJwcrypto.verify();
  mockedUpdate.verify();
});

add_task(async function test_ensureEcosystemAnonId_useValueFromProfile() {
  // If there's no eco-uid in the account state,
  // we should use the anon-id value present in the user's profile data.
  const expectedEcosystemAnonId = "bbbbbbbbbbbb";

  const profileClient = new FxAccountsProfileClient({
    serverURL: "http://testURL",
  });
  const profile = new FxAccountsProfile({ profileClient });
  const telemetry = new FxAccountsTelemetry({
    profile,
    withCurrentAccountState: async cb => {
      return cb({
        getUserAccountData: async () => {
          return {};
        },
      });
    },
  });
  const mockProfile = sinon.mock(profile);

  mockProfile
    .expects("ensureProfile")
    .withArgs(sinon.match({ staleOk: true }))
    .once()
    .returns({
      ecosystemAnonId: expectedEcosystemAnonId,
    });

  const actualEcosystemAnonId = await telemetry.ensureEcosystemAnonId();
  Assert.equal(expectedEcosystemAnonId, actualEcosystemAnonId);

  mockProfile.verify();
});

add_task(
  async function test_ensureEcosystemAnonId_generatePlaceholderInProfile() {
    // If there's no eco-uid in the account state, and no anon-id in the profile data,
    // we should generate a placeholder value and persist it to the profile data.
    const expectedEcosystemUserIdBytes = new Uint8Array(32);
    const expectedEcosystemUserId = "0".repeat(64);
    const expectedEcosystemAnonId = "bbbbbbbbbbbb";
    const profileClient = new FxAccountsProfileClient({
      serverURL: "http://testURL",
    });
    const profile = new FxAccountsProfile({ profileClient });
    const telemetry = new FxAccountsTelemetry({
      profile,
      withCurrentAccountState: async cb => {
        return cb({
          getUserAccountData: async () => {
            return {};
          },
        });
      },
    });
    const mockProfile = sinon.mock(profile);
    const mockFxAccountsConfig = sinon.mock(FxAccountsConfig);
    const mockJwcrypto = sinon.mock(jwcrypto);
    const mockCryptoUtils = sinon.mock(CryptoUtils);
    const mockProfileClient = sinon.mock(profileClient);

    mockProfile
      .expects("ensureProfile")
      .once()
      .returns({});

    mockCryptoUtils
      .expects("generateRandomBytes")
      .once()
      .withExactArgs(32)
      .returns(expectedEcosystemUserIdBytes);

    mockFxAccountsConfig
      .expects("fetchConfigDocument")
      .once()
      .returns({
        ecosystem_anon_id_keys: ["testKey"],
      });

    mockJwcrypto
      .expects("generateJWE")
      .once()
      .withExactArgs(
        "testKey",
        new TextEncoder().encode(expectedEcosystemUserId)
      )
      .returns(expectedEcosystemAnonId);

    mockProfileClient
      .expects("setEcosystemAnonId")
      .once()
      .withExactArgs(expectedEcosystemAnonId)
      .returns(null);

    const actualEcosystemAnonId = await telemetry.ensureEcosystemAnonId(true);
    Assert.equal(expectedEcosystemAnonId, actualEcosystemAnonId);

    mockProfile.verify();
    mockCryptoUtils.verify();
    mockFxAccountsConfig.verify();
    mockJwcrypto.verify();
    mockProfileClient.verify();
  }
);

add_task(async function test_ensureEcosystemAnonId_failToGenerateKeys() {
  // If we attempt to generate an anon-id but can't get the right keys,
  // we should fail with a sensible error.
  const expectedErrorMessage =
    "Unable to fetch ecosystem_anon_id_keys from FxA server";
  const testCases = [
    {
      accountStateObj: {},
      serverConfig: {},
    },
    {
      accountStateObj: {},
      serverConfig: {
        ecosystem_anon_id_keys: [],
      },
    },
    {
      accountStateObj: { ecosystemUserId: "bbbbbbbbbb" },
      serverConfig: {},
    },
    {
      accountStateObj: { ecosystemUserId: "bbbbbbbbbb" },
      serverConfig: {
        ecosystem_anon_id_keys: [],
      },
    },
  ];
  for (const tc of testCases) {
    const profile = new FxAccountsProfile({
      profileServerUrl: "http://testURL",
    });
    const telemetry = new FxAccountsTelemetry({
      profile,
      withCurrentAccountState: async cb => {
        return cb({
          getUserAccountData: async () => {
            return { ...tc.accountStateObj };
          },
        });
      },
    });
    const mockProfile = sinon.mock(profile);
    const mockFxAccountsConfig = sinon.mock(FxAccountsConfig);

    if (!tc.accountStateObj.ecosystemUserId) {
      mockProfile
        .expects("ensureProfile")
        .once()
        .returns({});
    } else {
      mockProfile.expects("ensureProfile").never();
    }

    mockFxAccountsConfig
      .expects("fetchConfigDocument")
      .once()
      .returns(tc.serverConfig);

    try {
      await telemetry.ensureEcosystemAnonId();
    } catch (e) {
      Assert.equal(expectedErrorMessage, e.message);
      mockProfile.verify();
      mockFxAccountsConfig.verify();
    }
  }
});

add_task(async function test_ensureEcosystemAnonId_selfRace() {
  // If we somehow end up calling `ensureEcosystemAnonId` twice,
  // we should serialize the requests rather than generting two
  // different placeholder ids.
  const expectedEcosystemAnonId = "self-race-id";

  const profileClient = new FxAccountsProfileClient({
    serverURL: "http://testURL",
  });
  const profile = new FxAccountsProfile({ profileClient });
  const telemetry = new FxAccountsTelemetry({
    profile,
    withCurrentAccountState: async cb => {
      return cb({
        getUserAccountData: async () => {
          return {};
        },
      });
    },
  });

  const mockProfile = sinon.mock(profile);
  const mockFxAccountsConfig = sinon.mock(FxAccountsConfig);
  const mockJwcrypto = sinon.mock(jwcrypto);
  const mockProfileClient = sinon.mock(profileClient);

  mockProfile
    .expects("ensureProfile")
    .once()
    .returns({});

  mockProfileClient
    .expects("setEcosystemAnonId")
    .once()
    .returns(null);

  // We are going to "block" the config document promise and make 2 calls
  // to ensureEcosystemAnonId() while blocked, just to ensure we don't
  // actually enter the ensureEcosystemAnonId() impl twice.
  const deferInConfigDocument = PromiseUtils.defer();
  const deferConfigDocument = PromiseUtils.defer();
  mockFxAccountsConfig
    .expects("fetchConfigDocument")
    .once()
    .callsFake(() => {
      deferInConfigDocument.resolve();
      return deferConfigDocument.promise;
    });

  mockJwcrypto
    .expects("generateJWE")
    .once()
    .returns(expectedEcosystemAnonId);

  let p1 = telemetry.ensureEcosystemAnonId();
  let p2 = telemetry.ensureEcosystemAnonId();

  // Make sure we've entered fetchConfigDocument
  await deferInConfigDocument.promise;
  // Let it go.
  deferConfigDocument.resolve({ ecosystem_anon_id_keys: ["testKey"] });

  Assert.equal(await p1, expectedEcosystemAnonId);
  Assert.equal(await p2, expectedEcosystemAnonId);

  // And all the `.once()` calls on the mocks are checking we only did the
  // work once.
  mockProfile.verify();
  mockFxAccountsConfig.verify();
  mockJwcrypto.verify();
  mockProfileClient.verify();
});

add_task(async function test_ensureEcosystemAnonId_clientRace() {
  // If we attempt to upload a placeholder anon-id to the user's profile,
  // and our write conflicts with another client doing a similar upload,
  // then we should recover and accept the server version.
  const expectedEcosystemAnonId = "bbbbbbbbbbbb";
  const expectedErrrorMessage = "test error at 'setEcosystemAnonId'";

  const testCases = [
    {
      errorCode: 412,
      errorMessage: null,
    },
    {
      errorCode: 405,
      errorMessage: expectedErrrorMessage,
    },
  ];

  for (const tc of testCases) {
    const profileClient = new FxAccountsProfileClient({
      serverURL: "http://testURL",
    });
    const profile = new FxAccountsProfile({ profileClient });
    const telemetry = new FxAccountsTelemetry({
      profile,
      withCurrentAccountState: async cb => {
        return cb({
          getUserAccountData: async () => {
            return {};
          },
        });
      },
    });
    const mockProfile = sinon.mock(profile);
    const mockFxAccountsConfig = sinon.mock(FxAccountsConfig);
    const mockJwcrypto = sinon.mock(jwcrypto);
    const mockProfileClient = sinon.mock(profileClient);

    mockProfile
      .expects("ensureProfile")
      .withArgs(sinon.match({ staleOk: true }))
      .once()
      .returns({});

    mockFxAccountsConfig
      .expects("fetchConfigDocument")
      .once()
      .returns({
        ecosystem_anon_id_keys: ["testKey"],
      });

    mockJwcrypto
      .expects("generateJWE")
      .once()
      .returns(expectedEcosystemAnonId);

    mockProfileClient
      .expects("setEcosystemAnonId")
      .once()
      .throws({
        code: tc.errorCode,
        message: tc.errorMessage,
      });

    if (tc.errorCode === 412) {
      mockProfile
        .expects("ensureProfile")
        .withArgs(sinon.match({ forceFresh: true }))
        .once()
        .returns({
          ecosystemAnonId: expectedEcosystemAnonId,
        });

      const actualEcosystemAnonId = await telemetry.ensureEcosystemAnonId();
      Assert.equal(expectedEcosystemAnonId, actualEcosystemAnonId);
    } else {
      try {
        await telemetry.ensureEcosystemAnonId();
      } catch (e) {
        Assert.equal(expectedErrrorMessage, e.message);
      }
    }

    mockProfile.verify();
    mockFxAccountsConfig.verify();
    mockJwcrypto.verify();
    mockProfileClient.verify();
  }
});
