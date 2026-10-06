/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_local_network_access_enabled() {
  // Test enabling LocalNetworkAccess policy (unlocked)
  await setupPolicyEngineWithJson({
    policies: {
      LocalNetworkAccess: {
        Enabled: true,
      },
    },
  });

  // Verify the preference is set correctly and unlocked
  equal(
    Services.prefs.getBoolPref("network.lna.enabled"),
    true,
    "network.lna.enabled should be true when LocalNetworkAccess is enabled"
  );
  equal(
    Services.prefs.getBoolPref("network.lna.block_trackers"),
    true,
    "network.lna.block_trackers should be true when LocalNetworkAccess is enabled"
  );
  equal(
    Services.prefs.getBoolPref("network.lna.blocking"),
    true,
    "network.lna.blocking should be true when LocalNetworkAccess is enabled"
  );

  equal(
    Services.prefs.prefIsLocked("network.lna.enabled"),
    false,
    "network.lna.enabled should not be locked when Locked is not specified"
  );
  equal(
    Services.prefs.prefIsLocked("network.lna.block_trackers"),
    false,
    "network.lna.block_trackers should not be locked when Locked is not specified"
  );
  equal(
    Services.prefs.prefIsLocked("network.lna.blocking"),
    false,
    "network.lna.blocking should not be locked when Locked is not specified"
  );
});

add_task(async function test_local_network_access_disabled() {
  // Test disabling LocalNetworkAccess policy (unlocked)
  await setupPolicyEngineWithJson({
    policies: {
      LocalNetworkAccess: {
        Enabled: false,
      },
    },
  });

  // Verify the preference is set correctly and unlocked
  equal(
    Services.prefs.getBoolPref("network.lna.enabled"),
    false,
    "network.lna.enabled should be false when LocalNetworkAccess is disabled"
  );
  equal(
    Services.prefs.getBoolPref("network.lna.block_trackers"),
    false,
    "network.lna.block_trackers should be false when LocalNetworkAccess is disabled"
  );
  equal(
    Services.prefs.getBoolPref("network.lna.blocking"),
    false,
    "network.lna.blocking should be false when LocalNetworkAccess is disabled"
  );

  equal(
    Services.prefs.prefIsLocked("network.lna.enabled"),
    false,
    "network.lna.enabled should not be locked when Locked is not specified"
  );
  equal(
    Services.prefs.prefIsLocked("network.lna.block_trackers"),
    false,
    "network.lna.block_trackers should not be locked when Locked is not specified"
  );
  equal(
    Services.prefs.prefIsLocked("network.lna.blocking"),
    false,
    "network.lna.blocking should not be locked when Locked is not specified"
  );
});

add_task(async function test_local_network_access_enabled_locked() {
  // Test enabling LocalNetworkAccess policy with locking
  await setupPolicyEngineWithJson({
    policies: {
      LocalNetworkAccess: {
        Enabled: true,
        Locked: true,
      },
    },
  });

  // Verify the preference is set correctly and locked
  equal(
    Services.prefs.getBoolPref("network.lna.enabled"),
    true,
    "network.lna.enabled should be true when LocalNetworkAccess is enabled"
  );
  equal(
    Services.prefs.getBoolPref("network.lna.block_trackers"),
    true,
    "network.lna.block_trackers should be true when LocalNetworkAccess is enabled"
  );
  equal(
    Services.prefs.getBoolPref("network.lna.blocking"),
    true,
    "network.lna.blocking should be true when LocalNetworkAccess is enabled"
  );

  equal(
    Services.prefs.prefIsLocked("network.lna.enabled"),
    true,
    "network.lna.enabled should be locked when Locked: true is specified"
  );
  equal(
    Services.prefs.prefIsLocked("network.lna.block_trackers"),
    true,
    "network.lna.block_trackers should be locked when Locked: true is specified"
  );
  equal(
    Services.prefs.prefIsLocked("network.lna.blocking"),
    true,
    "network.lna.blocking should be locked when Locked: true is specified"
  );
});

add_task(async function test_local_network_access_disabled_locked() {
  // Test disabling LocalNetworkAccess policy with locking
  await setupPolicyEngineWithJson({
    policies: {
      LocalNetworkAccess: {
        Enabled: false,
        Locked: true,
      },
    },
  });

  // Verify the preference is set correctly and locked
  equal(
    Services.prefs.getBoolPref("network.lna.enabled"),
    false,
    "network.lna.enabled should be false when LocalNetworkAccess is disabled"
  );
  equal(
    Services.prefs.getBoolPref("network.lna.block_trackers"),
    false,
    "network.lna.block_trackers should be false when LocalNetworkAccess is disabled"
  );
  equal(
    Services.prefs.getBoolPref("network.lna.blocking"),
    false,
    "network.lna.blocking should be false when LocalNetworkAccess is disabled"
  );

  equal(
    Services.prefs.prefIsLocked("network.lna.enabled"),
    true,
    "network.lna.enabled should be locked when Locked: true is specified"
  );
  equal(
    Services.prefs.prefIsLocked("network.lna.block_trackers"),
    true,
    "network.lna.block_trackers should be locked when Locked: true is specified"
  );
  equal(
    Services.prefs.prefIsLocked("network.lna.blocking"),
    true,
    "network.lna.blocking should be locked when Locked: true is specified"
  );

  // remove the pref locks
  await setupPolicyEngineWithJson({
    policies: {
      LocalNetworkAccess: {
        Enabled: false,
        Locked: false,
      },
    },
  });
});

add_task(
  async function test_local_network_access_fine_grained_block_trackers_only() {
    // Test enabling LNA with only tracker blocking, no prompting
    await setupPolicyEngineWithJson({
      policies: {
        LocalNetworkAccess: {
          Enabled: true,
          BlockTrackers: true,
          EnablePrompting: false,
        },
      },
    });

    equal(
      Services.prefs.getBoolPref("network.lna.enabled"),
      true,
      "network.lna.enabled should be true"
    );
    equal(
      Services.prefs.getBoolPref("network.lna.block_trackers"),
      true,
      "network.lna.block_trackers should be true when BlockTrackers is true"
    );
    equal(
      Services.prefs.getBoolPref("network.lna.blocking"),
      false,
      "network.lna.blocking should be false when EnablePrompting is false"
    );
  }
);

add_task(
  async function test_local_network_access_fine_grained_prompting_only() {
    // Test enabling LNA with only prompting, no tracker blocking
    await setupPolicyEngineWithJson({
      policies: {
        LocalNetworkAccess: {
          Enabled: true,
          BlockTrackers: false,
          EnablePrompting: true,
        },
      },
    });

    equal(
      Services.prefs.getBoolPref("network.lna.enabled"),
      true,
      "network.lna.enabled should be true"
    );
    equal(
      Services.prefs.getBoolPref("network.lna.block_trackers"),
      false,
      "network.lna.block_trackers should be false when BlockTrackers is false"
    );
    equal(
      Services.prefs.getBoolPref("network.lna.blocking"),
      true,
      "network.lna.blocking should be true when EnablePrompting is true"
    );
  }
);

add_task(
  async function test_local_network_access_enabled_only_backward_compatibility() {
    // Test backward compatibility: Enabled: true defaults fine-grained controls to true
    await setupPolicyEngineWithJson({
      policies: {
        LocalNetworkAccess: {
          Enabled: true,
        },
      },
    });

    equal(
      Services.prefs.getBoolPref("network.lna.enabled"),
      true,
      "network.lna.enabled should be true"
    );
    equal(
      Services.prefs.getBoolPref("network.lna.block_trackers"),
      true,
      "network.lna.block_trackers should default to true for backward compatibility"
    );
    equal(
      Services.prefs.getBoolPref("network.lna.blocking"),
      true,
      "network.lna.blocking should default to true for backward compatibility"
    );
  }
);

add_task(
  async function test_local_network_access_disabled_overrides_fine_grained() {
    // Test that Enabled: false overrides fine-grained settings
    await setupPolicyEngineWithJson({
      policies: {
        LocalNetworkAccess: {
          Enabled: false,
          BlockTrackers: true, // This should be ignored
          EnablePrompting: true, // This should be ignored
        },
      },
    });

    equal(
      Services.prefs.getBoolPref("network.lna.enabled"),
      false,
      "network.lna.enabled should be false when Enabled is false"
    );
    equal(
      Services.prefs.getBoolPref("network.lna.block_trackers"),
      false,
      "network.lna.block_trackers should be false when LNA is disabled, regardless of BlockTrackers setting"
    );
    equal(
      Services.prefs.getBoolPref("network.lna.blocking"),
      false,
      "network.lna.blocking should be false when LNA is disabled, regardless of EnablePrompting setting"
    );
  }
);

add_task(
  async function test_local_network_access_no_enabled_field_no_modification() {
    // Test that omitting "Enabled" field doesn't modify any prefs
    Services.prefs.setBoolPref("network.lna.enabled", false);
    Services.prefs.setBoolPref("network.lna.block_trackers", false);
    Services.prefs.setBoolPref("network.lna.blocking", true);

    // Apply policy with LocalNetworkAccess but no "Enabled" field
    await setupPolicyEngineWithJson({
      policies: {
        LocalNetworkAccess: {
          BlockTrackers: true, // Should be ignored
          EnablePrompting: false, // Should be ignored
        },
      },
    });

    // All prefs should remain at their original values
    equal(
      Services.prefs.getBoolPref("network.lna.enabled"),
      false,
      "network.lna.enabled should remain unchanged when Enabled is not specified"
    );
    equal(
      Services.prefs.getBoolPref("network.lna.block_trackers"),
      false,
      "network.lna.block_trackers should remain unchanged when Enabled is not specified"
    );
    equal(
      Services.prefs.getBoolPref("network.lna.blocking"),
      true,
      "network.lna.blocking should remain unchanged when Enabled is not specified"
    );
  }
);

add_task(async function test_local_network_access_fine_grained_locked() {
  // Test that fine-grained controls respect locking
  await setupPolicyEngineWithJson({
    policies: {
      LocalNetworkAccess: {
        Enabled: true,
        BlockTrackers: false,
        EnablePrompting: true,
        Locked: true,
      },
    },
  });

  equal(Services.prefs.getBoolPref("network.lna.enabled"), true);
  equal(Services.prefs.getBoolPref("network.lna.block_trackers"), false);
  equal(Services.prefs.getBoolPref("network.lna.blocking"), true);

  // Verify all prefs are locked
  equal(
    Services.prefs.prefIsLocked("network.lna.enabled"),
    true,
    "network.lna.enabled should be locked"
  );
  equal(
    Services.prefs.prefIsLocked("network.lna.block_trackers"),
    true,
    "network.lna.block_trackers should be locked"
  );
  equal(
    Services.prefs.prefIsLocked("network.lna.blocking"),
    true,
    "network.lna.blocking should be locked"
  );
});

add_task(async function test_local_network_access_policy_enforcement() {
  // Test that locked policy cannot be changed
  await setupPolicyEngineWithJson({
    policies: {
      LocalNetworkAccess: {
        Enabled: false,
        Locked: true,
      },
    },
  });

  // Verify initial state
  equal(Services.prefs.getBoolPref("network.lna.enabled"), false);
  equal(Services.prefs.prefIsLocked("network.lna.enabled"), true);

  // Try to change the preference - this should be ignored due to locking
  // In Firefox, setting a locked preference doesn't throw, it just gets ignored
  Services.prefs.setBoolPref("network.lna.enabled", true);

  // Verify the preference remains unchanged (setting was ignored)
  equal(
    Services.prefs.getBoolPref("network.lna.enabled"),
    false,
    "Locked preference should remain unchanged after attempted modification"
  );

  // Verify it's still locked
  equal(
    Services.prefs.prefIsLocked("network.lna.enabled"),
    true,
    "Preference should still be locked"
  );
});

add_task(async function test_local_network_access_skip_domains() {
  // Test SkipDomains policy
  await setupPolicyEngineWithJson({
    policies: {
      LocalNetworkAccess: {
        SkipDomains: ["example.com", "*.local", "localhost"],
      },
    },
  });

  equal(
    Services.prefs.getCharPref("network.lna.skip-domains"),
    "example.com,*.local,localhost",
    "network.lna.skip-domains should be set correctly"
  );

  equal(
    Services.prefs.prefIsLocked("network.lna.skip-domains"),
    false,
    "network.lna.skip-domains should not be locked when Locked is not specified"
  );
});

add_task(async function test_local_network_access_skip_domains_locked() {
  // Test SkipDomains policy with locking
  await setupPolicyEngineWithJson({
    policies: {
      LocalNetworkAccess: {
        SkipDomains: ["*.example.com", "server.local"],
        Locked: true,
      },
    },
  });

  equal(
    Services.prefs.getCharPref("network.lna.skip-domains"),
    "*.example.com,server.local",
    "network.lna.skip-domains should be set correctly"
  );

  equal(
    Services.prefs.prefIsLocked("network.lna.skip-domains"),
    true,
    "network.lna.skip-domains should be locked when Locked: true is specified"
  );
});

add_task(async function test_local_network_access_enabled_with_skip_domains() {
  // Test combining Enabled with SkipDomains
  await setupPolicyEngineWithJson({
    policies: {
      LocalNetworkAccess: {
        Enabled: true,
        SkipDomains: ["*"],
      },
    },
  });

  equal(
    Services.prefs.getBoolPref("network.lna.enabled"),
    true,
    "network.lna.enabled should be true"
  );
  equal(
    Services.prefs.getCharPref("network.lna.skip-domains"),
    "*",
    'network.lna.skip-domains should be "*" to skip all domains'
  );
});

add_task(async function test_local_network_access_skip_domains_empty_array() {
  // Test SkipDomains with empty array
  await setupPolicyEngineWithJson({
    policies: {
      LocalNetworkAccess: {
        SkipDomains: [],
      },
    },
  });

  equal(
    Services.prefs.getCharPref("network.lna.skip-domains"),
    "",
    "network.lna.skip-domains should be empty string for empty array"
  );
});
