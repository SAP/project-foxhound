/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Central registry for network and certificate error page configurations.
 *
 * This module provides a data-driven approach to error handling, replacing
 * scattered switch statements with a centralized configuration registry.
 * Each error code maps to a configuration object that defines its UI behavior,
 * localization strings, and user actions.
 */
import { CERT_ERRORS } from "chrome://global/content/errors/cert-errors.mjs";
import { PKIX_ERRORS } from "chrome://global/content/errors/pkix-errors.mjs";
import { SSL_ERRORS } from "chrome://global/content/errors/ssl-errors.mjs";
import { NET_ERRORS } from "chrome://global/content/errors/net-errors.mjs";

const ERROR_REGISTRY = new Map();

/**
 * Register an error configuration in the registry.
 *
 * @param {object} config - The error configuration object
 */
export function registerError(config) {
  if (!config.id) {
    throw new Error("Error configuration must have an id");
  }
  ERROR_REGISTRY.set(config.id, Object.freeze(config));
}

/**
 * Register multiple error configurations at once.
 *
 * @param {Array<object>} configs - Array of error configuration objects
 */
export function registerErrors(configs) {
  for (const config of configs) {
    registerError(config);
  }
}

/**
 * Get the configuration for a specific error id.
 *
 * @param {string} id - The error id to look up
 * @returns {object|undefined} The error configuration, or undefined if not found.
 */
export function getErrorConfig(id) {
  return ERROR_REGISTRY.get(id);
}

/**
 * Check if an error id is registered in the registry.
 *
 * @param {string} id - The error id to check
 * @returns {boolean} True if the error is registered
 */
export function isErrorSupported(id) {
  return ERROR_REGISTRY.has(id);
}

/**
 * Get all error configurations for a specific category.
 *
 * @param {string} category - The category to filter by ("cert", "net", "blocked")
 * @returns {Array<object>} Array of error configurations in the category
 */
export function getErrorsByCategory(category) {
  return [...ERROR_REGISTRY.values()].filter(e => e.category === category);
}

/**
 * Get all registered error ids.
 *
 * @returns {Array<string>} Array of error id strings
 */
export function getAllErrorIds() {
  return [...ERROR_REGISTRY.keys()];
}

/**
 * Get the total number of registered errors.
 *
 * @returns {number} Count of registered errors
 */
export function getErrorCount() {
  return ERROR_REGISTRY.size;
}

export function _testOnlyClearRegistry() {
  if (!Cu.isInAutomation) {
    return;
  }
  ERROR_REGISTRY.clear();
}

/**
 * Initialize the registry with all error definitions.
 * This function should be called once when the module is first loaded
 * in a context that needs the full error set.
 */
export function initializeRegistry() {
  if (ERROR_REGISTRY.size > 0) {
    return; // Already initialized
  }

  registerErrors(CERT_ERRORS);
  registerErrors(PKIX_ERRORS);
  registerErrors(SSL_ERRORS);
  registerErrors(NET_ERRORS);
}
