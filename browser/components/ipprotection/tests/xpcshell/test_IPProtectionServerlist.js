/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const {
  IPProtectionServerlist,
  PrefServerList,
  RemoteSettingsServerlist,
  IPProtectionServerlistFactory,
} = ChromeUtils.importESModule(
  "moz-src:///browser/components/ipprotection/IPProtectionServerlist.sys.mjs"
);

const COLLECTION_NAME = "vpn-serverlist";

const TEST_SERVER_1 = {
  hostname: "test1.example.com",
  port: 443,
  quarantined: false,
  protocols: [
    {
      name: "connect",
      host: "test1.example.com",
      port: 8443,
      scheme: "https",
    },
  ],
};
const TEST_SERVER_2 = {
  hostname: "test2.example.com",
  port: 443,
  quarantined: false,
  protocols: [
    {
      name: "connect",
      host: "test2.example.com",
      port: 8443,
      scheme: "https",
    },
  ],
};
const TEST_SERVER_QUARANTINED = {
  hostname: "quarantined.example.com",
  port: 443,
  quarantined: true,
  protocols: [
    {
      name: "connect",
      host: "quarantined.example.com",
      port: 8443,
      scheme: "https",
    },
  ],
};

const TEST_US_CITY = {
  name: "Test City",
  code: "TC",
  servers: [TEST_SERVER_1, TEST_SERVER_2],
};

const TEST_COUNTRIES = [
  {
    name: "United States",
    code: "US",
    cities: [TEST_US_CITY],
  },
  {
    name: "Canada",
    code: "CA",
    cities: [
      {
        name: "Test City 2",
        code: "TC2",
        servers: [TEST_SERVER_1],
      },
    ],
  },
];

const client = RemoteSettings(COLLECTION_NAME);

add_setup(async function () {
  do_get_profile();
  await client.db.clear();
  for (const country of TEST_COUNTRIES) {
    await client.db.create(country);
  }
  await client.db.importChanges({}, Date.now());

  await IPProtectionServerlist.maybeFetchList();
  await IPProtectionServerlist.initOnStartupCompleted();
  Assert.ok(IPProtectionServerlist instanceof RemoteSettingsServerlist);
});

add_task(async function test_getDefaultLocation() {
  const { country, city } = IPProtectionServerlist.getDefaultLocation();
  Assert.equal(country.code, "US", "The default country should be US");
  Assert.deepEqual(city, TEST_US_CITY, "The default city should be returned");
});

add_task(async function test_selectServer() {
  // Test with a city with multiple non-quarantined servers
  let selected = IPProtectionServerlist.selectServer(TEST_US_CITY);
  Assert.ok(
    [TEST_SERVER_1, TEST_SERVER_2].some(s => s.hostname === selected.hostname),
    "A valid server should be selected"
  );

  // Test with a city with one server
  const cityWithOneServer = {
    name: "One Server City",
    code: "OSC",
    servers: [TEST_SERVER_1],
  };
  selected = IPProtectionServerlist.selectServer(cityWithOneServer);
  Assert.deepEqual(
    selected,
    TEST_SERVER_1,
    "The single server should be selected"
  );

  // Test with a city with a mix of quarantined and non-quarantined servers
  const cityWithMixedServers = {
    name: "Mixed Servers City",
    code: "MSC",
    servers: [TEST_SERVER_1, TEST_SERVER_QUARANTINED],
  };
  selected = IPProtectionServerlist.selectServer(cityWithMixedServers);
  Assert.deepEqual(
    selected,
    TEST_SERVER_1,
    "The non-quarantined server should be selected"
  );

  // Test with a city with only quarantined servers
  const cityWithQuarantinedServers = {
    name: "Quarantined City",
    code: "QC",
    servers: [TEST_SERVER_QUARANTINED],
  };
  selected = IPProtectionServerlist.selectServer(cityWithQuarantinedServers);
  Assert.equal(selected, null, "No server should be selected");

  // Test with a city with no servers
  const cityWithNoServers = {
    name: "No Server City",
    code: "NSC",
    servers: [],
  };
  selected = IPProtectionServerlist.selectServer(cityWithNoServers);
  Assert.equal(selected, null, "No server should be selected");
});

add_task(async function test_syncRespected() {
  let { country, city } = IPProtectionServerlist.getDefaultLocation();
  Assert.equal(country.code, "US", "The default country should be US");
  Assert.deepEqual(city, TEST_US_CITY, "The correct city should be returned");

  // Now, update the server list to remove the US entry
  const updated_server = {
    ...TEST_SERVER_1,
    hostname: "updated.example.com",
  };
  const updated_city = {
    ...TEST_US_CITY,
    servers: [updated_server],
  };
  const updated_country = {
    ...TEST_COUNTRIES[0],
    cities: [updated_city],
  };

  await client.db.clear();
  await client.db.create(updated_country);
  await client.db.importChanges({}, Date.now());
  await client.emit("sync", { data: {} });

  await IPProtectionServerlist.maybeFetchList();

  ({ country, city } = IPProtectionServerlist.getDefaultLocation());
  Assert.equal(country.code, "US", "The default country should be US");
  Assert.deepEqual(city, updated_city, "The updated city should be returned");
});

add_task(async function test_PrefServerList() {
  registerCleanupFunction(() => {
    Services.prefs.clearUserPref(PrefServerList.PREF_NAME);
  });
  Services.prefs.setCharPref(
    PrefServerList.PREF_NAME,
    JSON.stringify(TEST_COUNTRIES)
  );

  Assert.equal(
    PrefServerList.hasPrefValue,
    true,
    "PrefServerList should have a pref value set."
  );
  Assert.deepEqual(
    PrefServerList.prefValue,
    TEST_COUNTRIES,
    "PrefServerList's pref value should match the set value."
  );

  const serverList = new PrefServerList();
  await serverList.maybeFetchList();

  const { country, city } = serverList.getDefaultLocation();
  Assert.equal(country.code, "US", "The default country should be US");
  Assert.deepEqual(city, TEST_US_CITY, "The default city should be returned.");
});

add_task(async function test_IPProtectionServerlistFactory() {
  registerCleanupFunction(() => {
    Services.prefs.clearUserPref(PrefServerList.PREF_NAME);
  });
  // Without the pref set, it should return RemoteSettingsServerlist
  Services.prefs.clearUserPref(PrefServerList.PREF_NAME);
  let instance = IPProtectionServerlistFactory();
  Assert.ok(instance instanceof RemoteSettingsServerlist);
  Services.prefs.setCharPref(
    PrefServerList.PREF_NAME,
    JSON.stringify(TEST_COUNTRIES)
  );
  // With the pref set, it should return PrefServerList
  Assert.ok(IPProtectionServerlistFactory() instanceof PrefServerList);
});
