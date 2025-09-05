/**
 * Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

export const LocalStorageUtils = {
  createStorage(principal) {
    return Services.domStorageManager.createStorage(
      null,
      principal,
      principal,
      ""
    );
  },
};
