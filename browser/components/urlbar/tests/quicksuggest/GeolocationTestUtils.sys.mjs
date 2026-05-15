/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  sinon: "resource://testing-common/Sinon.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "GeolocationUtils", () => {
  try {
    return ChromeUtils.importESModule(
      "moz-src:///browser/components/urlbar/private/GeolocationUtils.sys.mjs"
    ).GeolocationUtils;
  } catch {
    // Fallback to URI format prior to FF 144.
    return ChromeUtils.importESModule(
      "resource:///modules/urlbar/private/GeolocationUtils.sys.mjs"
    ).GeolocationUtils;
  }
});

/**
 *
 */
class _GeolocationTestUtils {
  get SAN_FRANCISCO() {
    return {
      country_code: "US",
      city: "San Francisco",
      region_code: "CA",
    };
  }

  /**
   * Initializes the utils.
   *
   * @param {object} scope
   *   The global JS scope where tests are being run. This allows the instance
   *   to access test helpers like `Assert` that are available in the scope.
   */
  init(scope) {
    if (!scope) {
      throw new Error(
        "GeolocationTestUtils.init() must be called with a scope"
      );
    }

    this.#scope = scope;
  }

  /**
   * Setup stub for GeolocationUtils.geolocation() using given geolocation.
   *
   * @param {object} geolocation
   * @param {string} [geolocation.country_code]
   * @param {string} [geolocation.city]
   * @param {string} [geolocation.region_code]
   * @returns {Function} function to restore the stub.
   */
  stubGeolocation(geolocation) {
    let sandbox = lazy.sinon.createSandbox();
    sandbox.stub(lazy.GeolocationUtils, "geolocation").resolves(geolocation);

    let cleanup = () => {
      sandbox.restore();
    };

    this.#scope.registerCleanupFunction?.(cleanup);

    return cleanup;
  }

  #scope;
}

export let GeolocationTestUtils = new _GeolocationTestUtils();
