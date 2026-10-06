/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// This module handles storage of uploaded profile information in IndexedDB
// for the about:logging page.

const DB_NAME = "aboutLoggingProfiles";
const DB_VERSION = 1;
const STORE_NAME = "uploadedProfiles";

/**
 * Initialize the IndexedDB database for storing uploaded profile information.
 *
 * @returns {Promise<IDBDatabase>}
 */
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = e => {
      const db = request.result;
      db.onerror = reject;

      if (e.oldVersion < 1) {
        // Version 1: this is the first version of the DB.
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("uploadDate", "uploadDate", { unique: false });
        store.createIndex("profileToken", "profileToken", { unique: true });
      }
    };
  });
}

/**
 * Save uploaded profile information to IndexedDB.
 *
 * @param {object} profileInfo
 * @param {string} profileInfo.jwtToken - The JWT token returned by the server
 * @param {string} profileInfo.profileToken - The profile token extracted from JWT
 * @param {string} profileInfo.profileUrl - The full profile URL
 * @param {Date} profileInfo.uploadDate - When the profile was uploaded
 * @param {string} profileInfo.profileName - A descriptive name for the profile
 * @returns {Promise<number>} The ID of the stored profile
 */
export async function saveUploadedProfile(profileInfo) {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const request = store.add({
      jwtToken: profileInfo.jwtToken,
      profileToken: profileInfo.profileToken,
      profileUrl: profileInfo.profileUrl,
      uploadDate: profileInfo.uploadDate,
      profileName: profileInfo.profileName,
    });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Get all uploaded profiles from IndexedDB.
 *
 * @returns {Promise<Array>} Array of uploaded profile information
 */
export async function getAllUploadedProfiles() {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("uploadDate");

    const request = index.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      // Sort the list with the most recent uploaded profile first.
      resolve(request.result.reverse());
    };
  });
}

/**
 * Delete an uploaded profile from IndexedDB.
 *
 * @param {number} profileId - The ID of the profile to delete
 * @returns {Promise<void>}
 */
export async function deleteUploadedProfile(profileId) {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const request = store.delete(profileId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get a specific uploaded profile by ID.
 *
 * @param {number} profileId - The ID of the profile to retrieve
 * @returns {Promise<object | null>} The profile information or null if not found
 */
export async function getUploadedProfile(profileId) {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);

    const request = store.get(profileId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}
