/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const {
  IPProtectionServerlist,
  PrefServerList,
  RemoteSettingsServerlist,
  IPProtectionServerlistFactory,
} = ChromeUtils.importESModule(
  "moz-src:///toolkit/components/ipprotection/IPProtectionServerlist.sys.mjs"
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

const TEST_REC_CITY = {
  name: "Anycast",
  code: "REC1",
  servers: [TEST_SERVER_1],
};

const TEST_QUARANTINED_CITY = {
  name: "All Quarantined",
  code: "QC1",
  servers: [TEST_SERVER_QUARANTINED],
};

const TEST_REC_COUNTRY = {
  name: "Recommended",
  code: "REC",
  cities: [TEST_REC_CITY],
};

const TEST_COUNTRIES = [
  TEST_REC_COUNTRY,
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
  {
    name: "Quarantineland",
    code: "QL",
    cities: [TEST_QUARANTINED_CITY],
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

add_task(async function test_getRecommendedLocation() {
  const rec = IPProtectionServerlist.getRecommendedLocation();
  Assert.equal(rec.country.code, "REC", "Recommended country is REC");
  Assert.deepEqual(rec.city, TEST_REC_CITY, "Recommended city is the REC city");

  const defaultArg = IPProtectionServerlist.getLocation();
  Assert.deepEqual(
    defaultArg,
    rec,
    "getLocation() with no argument returns the recommended location"
  );

  const byRecCode = IPProtectionServerlist.getLocation("REC");
  Assert.deepEqual(
    byRecCode,
    rec,
    "getLocation('REC') returns the recommended location"
  );
});

add_task(async function test_getRecommendedLocation_fallback() {
  const withoutRec = TEST_COUNTRIES.filter(c => c.code !== "REC");
  Services.prefs.setCharPref(
    PrefServerList.PREF_NAME,
    JSON.stringify(withoutRec)
  );
  try {
    const fallbackList = new PrefServerList();
    await fallbackList.maybeFetchList();

    Assert.equal(
      fallbackList.getLocation("REC"),
      null,
      "Without a REC entry, getLocation('REC') is null"
    );

    const rec = fallbackList.getRecommendedLocation();
    Assert.equal(
      rec.country.code,
      "US",
      "Recommended falls back to US when REC is absent"
    );
    Assert.deepEqual(rec.city, TEST_US_CITY, "Fallback city is the US city");
  } finally {
    Services.prefs.clearUserPref(PrefServerList.PREF_NAME);
  }
});

add_task(async function test_getLocation_byCode() {
  const us = IPProtectionServerlist.getLocation("US");
  Assert.equal(us.country.code, "US", "getLocation('US') returns the US entry");
  Assert.deepEqual(us.city, TEST_US_CITY, "getLocation('US') returns US city");

  Assert.equal(
    IPProtectionServerlist.getLocation("ZZ"),
    null,
    "Unknown country codes return null"
  );

  // Countries with only quarantined servers still return a {country, city}
  // (quarantine is enforced later in selectServer); verify selectServer
  // filters it out.
  const ql = IPProtectionServerlist.getLocation("QL");
  Assert.equal(ql.country.code, "QL", "getLocation('QL') returns the QL entry");
  Assert.equal(
    IPProtectionServerlist.selectServer(ql.city),
    null,
    "selectServer returns null for a city with only quarantined servers"
  );
});

add_task(async function test_countries() {
  const countries = IPProtectionServerlist.countries;
  const codes = countries.map(c => c.code);
  Assert.ok(!codes.includes("REC"), "REC is excluded from the countries list");
  Assert.deepEqual(
    codes.sort(),
    ["CA", "QL", "US"],
    "Every non-REC country is included"
  );

  const byCode = Object.fromEntries(countries.map(c => [c.code, c]));
  Assert.equal(byCode.US.available, true, "US has a non-quarantined server");
  Assert.equal(byCode.CA.available, true, "CA has a non-quarantined server");
  Assert.equal(
    byCode.QL.available,
    false,
    "QL has only quarantined servers, so available is false"
  );
});

add_task(async function test_listChangedEvent() {
  let fired = 0;
  const onChanged = () => {
    fired++;
  };
  IPProtectionServerlist.addEventListener(
    "IPProtectionServerlist:ListChanged",
    onChanged
  );

  try {
    await client.emit("sync", { data: {} });
    Assert.greater(
      fired,
      0,
      "ListChanged event is dispatched when RS sync triggers a refetch"
    );
  } finally {
    IPProtectionServerlist.removeEventListener(
      "IPProtectionServerlist:ListChanged",
      onChanged
    );
  }
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
  let { country, city } = IPProtectionServerlist.getLocation("US");
  Assert.equal(country.code, "US", "getLocation('US') returns the US entry");
  Assert.deepEqual(city, TEST_US_CITY, "The correct city should be returned");

  // Now, update the server list: keep only an updated US entry.
  const updated_server = {
    ...TEST_SERVER_1,
    hostname: "updated.example.com",
  };
  const updated_city = {
    ...TEST_US_CITY,
    servers: [updated_server],
  };
  const updated_country = {
    name: "United States",
    code: "US",
    cities: [updated_city],
  };

  await client.db.clear();
  await client.db.create(updated_country);
  await client.db.importChanges({}, Date.now());
  await client.emit("sync", { data: {} });

  await IPProtectionServerlist.maybeFetchList();

  ({ country, city } = IPProtectionServerlist.getLocation("US"));
  Assert.equal(country.code, "US", "getLocation('US') still returns US");
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

  const { country, city } = serverList.getLocation("US");
  Assert.equal(country.code, "US", "getLocation('US') returns the US entry");
  Assert.deepEqual(city, TEST_US_CITY, "The US city should be returned.");
});

add_task(async function test_PrefServerList_prefChangeTriggersListChanged() {
  registerCleanupFunction(() => {
    Services.prefs.clearUserPref(PrefServerList.PREF_NAME);
  });

  Services.prefs.setCharPref(
    PrefServerList.PREF_NAME,
    JSON.stringify(TEST_COUNTRIES)
  );

  const serverList = new PrefServerList();
  await serverList.initOnStartupCompleted();
  Assert.ok(serverList.hasList, "Initial list should be loaded.");

  let listChangedFired = false;
  serverList.addEventListener("IPProtectionServerlist:ListChanged", () => {
    listChangedFired = true;
  });

  const updatedList = [
    {
      code: "US",
      cities: [{ servers: [{ host: "updated.example.com", port: "9090" }] }],
    },
  ];
  Services.prefs.setCharPref(
    PrefServerList.PREF_NAME,
    JSON.stringify(updatedList)
  );

  Assert.ok(
    listChangedFired,
    "ListChanged should fire when the serverlist pref changes."
  );

  serverList.uninit();
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
