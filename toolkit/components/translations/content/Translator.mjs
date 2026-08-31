/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * @typedef {typeof import("../translations")} Translations
 */

/**
 * @typedef {import("../translations").LanguagePair} LanguagePair
 * @typedef {import("../translations").RequestTranslationsPort} RequestTranslationsPort
 * @typedef {import("../translations").TranslationRequest} TranslationRequest
 */

/**
 * The Translator class communicates with the {@link TranslationsEngine} to translate text for a given {@link LanguagePair}.
 *
 * Use the asynchronous {@link Translator.create} method to create a new Translator.
 *
 * You must provide the Translator with a means to acquire a {@link MessagePort} for communication with the engine.
 * For typical use cases, you can pass the {@link TranslationsParent.requestTranslationsPort} function.
 */
export class Translator {
  /**
   * A private token to ensure the constructor is only called internally.
   * Prefer the asynchronous {@link Translator.create} method for instantiation.
   *
   * @type {object}
   */
  static #constructorToken = {};

  /**
   * A port to send requests to and receive reposes from the TranslationsEngine.
   *
   * @type {MessagePort | null}
   */
  #port = null;

  /**
   * A promise that resolves when the Translator has established communication
   * with the TranslationsEngine and is ready to submit translation requests.
   *
   * Rejects if the instantiation of the Translator has failed.
   *
   * @type {Promise<void>}
   */
  #ready = Promise.reject;

  /**
   * The language pair consisting of the source language and target language.
   *
   * @type {LanguagePair}
   */
  #languagePair;

  /**
   * An asynchronous callback that establishes a connection with the TranslationsEngine
   * and returns a {@link MessagePort} for communication with the engine.
   *
   * This function is provided by the caller when a Translator is instantiated.
   *
   * @type {RequestTranslationsPort}
   */
  #requestTranslationsPort;

  /**
   * A monotonically increasing integer that is incremented by 1 with each new translation request.
   * The current value represents the id of the most recent translation request.
   *
   * @type {number}
   */
  #translationId = 0;

  /**
   * A map of active translation requests that have yet to be rejected or resolved.
   *
   * @type {Map<number, TranslationRequest>}
   */
  #translationRequests = new Map();

  /**
   * The limit to the count of active requests that this Translator can have at a given time.
   * If a new request comes in when the Translator is already at capacity, then the oldest request
   * will be cancelled and its promise resolved with null, to make room for the newest request.
   *
   * @type {number | null}
   */
  #activeRequestCapacity = null;

  /**
   * The internal constructor for the Translator.
   * Use the asynchronous {@link Translator.create} function instead.
   *
   * @param {LanguagePair} languagePair
   * @param {RequestTranslationsPort} requestTranslationsPort
   * @param {number | null} [activeRequestCapacity=null]
   * @param {object} [token]
   *
   * @throws {Error}
   */
  constructor(
    languagePair,
    requestTranslationsPort,
    activeRequestCapacity = null,
    token
  ) {
    if (token !== Translator.#constructorToken) {
      throw new Error(
        "Translator constructor called: use async Translator.create() instead."
      );
    }

    this.#languagePair = languagePair;
    this.#requestTranslationsPort = requestTranslationsPort;
    this.#activeRequestCapacity = activeRequestCapacity;
  }

  /**
   * Asynchronously constructs a new Translator instance.
   *
   * @param {object} params
   * @param {LanguagePair} params.languagePair - The source and target language pair.
   * @param {boolean} [params.allowSameLanguage=true]
   *  Whether a same-language pair is allowed, such as English to English.
   *  When allowed, this results in a simple passthrough as the translation.
   * @param {number | null} [params.activeRequestCapacity=null]
   *  The limit to the count of active requests that this Translator can have at a given time.
   *  If a new request comes in when the Translator is already at capacity, then the oldest request
   *  will be cancelled and its promise resolved with null, to make room for the newest request.
   * @param {RequestTranslationsPort} [params.requestTranslationsPort]
   *  A callback to request a new {@link MessagePort} for communication with the TranslationsEngine.
   *  For typical use cases, you can pass the {@link TranslationsParent.requestTranslationsPort} function.
   *
   * @returns {Promise<Translator|PassthroughTranslator>}
   *  Resolves once a valid message port has been established for communication
   *  with the TranslationsEngine, otherwise rejects if instantiation has failed.
   *
   * @throws {Error}
   */
  static async create({
    languagePair,
    allowSameLanguage = true,
    activeRequestCapacity = null,
    requestTranslationsPort,
  }) {
    if (languagePair.sourceLanguage === languagePair.targetLanguage) {
      if (!allowSameLanguage) {
        throw new Error("Attempt to create disallowed PassthroughTranslator");
      }
      return new PassthroughTranslator(languagePair);
    }

    if (!requestTranslationsPort) {
      throw new Error(
        "Attempt to create Translator without a requestTranslationsPort function"
      );
    }

    if (activeRequestCapacity !== null && activeRequestCapacity <= 0) {
      throw new Error(
        `Attempt to create Translator with an invalid active request capacity: ${activeRequestCapacity}`
      );
    }

    const translator = new Translator(
      languagePair,
      requestTranslationsPort,
      activeRequestCapacity,
      Translator.#constructorToken
    );

    await translator.#createNewPortIfClosed();

    return translator;
  }

  /**
   * Returns true if the message port has been closed, otherwise false.
   *
   * @returns {boolean}
   */
  get portClosed() {
    return this.#port === null;
  }

  /**
   * Returns true if the given language pair matches this translator, otherwise false.
   *
   * @param {LanguagePair} languagePair
   * @returns {boolean}
   */
  matchesLanguagePair(languagePair) {
    return (
      languagePair.sourceLanguage === this.#languagePair.sourceLanguage &&
      languagePair.targetLanguage === this.#languagePair.targetLanguage &&
      languagePair.sourceVariant === this.#languagePair.sourceVariant &&
      languagePair.targetVariant === this.#languagePair.targetVariant
    );
  }

  /**
   * Sends a request to translate the source text.
   *
   * @param {string} sourceText - The text to translate into the target language.
   * @param {boolean} [isHTML=false] - True if the source text contains HTML markup, otherwise false.
   *
   * @returns {Promise<string | null>}
   *  Resolves with the translated text when the request is complete.
   *  Resolves with null if the request has been cancelled.
   *  Rejects if an error has occurred during translation.
   */
  async translate(sourceText, isHTML = false) {
    await this.#createNewPortIfClosed();
    await this.#ready;

    const translationId = ++this.#translationId;

    this.#maybeCancelOldestActiveRequest();

    const { promise, resolve, reject } = Promise.withResolvers();

    this.#translationRequests.set(translationId, {
      sourceText,
      isHTML,
      resolve,
      reject,
    });

    this.#port?.postMessage({
      type: "TranslationsPort:TranslationRequest",
      translationId,
      sourceText,
      isHTML,
    });

    return promise;
  }

  /**
   * Destroys the Translator, ensuring its port is closed, and all pending requests are cancelled.
   *
   * @returns {void}
   */
  destroy() {
    try {
      this.#port?.close();
    } catch {
      // We're destroying anyway, nothing to do.
    }
    this.#port = null;

    for (const request of this.#translationRequests.values()) {
      request.resolve(null);
    }

    this.#translationRequests.clear();
    this.#ready = Promise.reject;
  }

  /**
   * Creates a new {@link MessagePort} for communication with the TranslationsEngine,
   * only if the Translator does not currently have an open port.
   *
   * @returns {Promise<void>}
   *  Resolves once the port has been instantiated.
   *  Rejects if the port failed to instantiate.
   */
  async #createNewPortIfClosed() {
    if (this.#port !== null) {
      return;
    }

    this.#port = await this.#requestTranslationsPort(this.#languagePair);

    const { promise, resolve, reject } = Promise.withResolvers();

    this.#port.onmessage = ({ data }) => {
      switch (data.type) {
        case "TranslationsPort:TranslationResponse": {
          const { targetText, translationId } = data;
          const request = this.#translationRequests.get(translationId);
          if (request) {
            request.resolve(targetText);
            this.#translationRequests.delete(translationId);
          }
          break;
        }
        case "TranslationsPort:GetEngineStatusResponse": {
          if (data.status === "ready") {
            resolve();
          } else {
            this.#port = null;
            reject(new Error(data.error));
          }

          break;
        }
        case "TranslationsPort:EngineTerminated": {
          this.#port = null;

          for (const request of this.#translationRequests.values()) {
            request.resolve(null);
          }

          this.#translationRequests.clear();

          break;
        }
        default: {
          throw new Error(
            `Translator receive unexpected port message: ${data.type}`
          );
        }
      }
    };

    this.#ready = promise;
    this.#port.postMessage({ type: "TranslationsPort:GetEngineStatusRequest" });
  }

  /**
   * Cancels an active translation request that belongs to the given id.
   *
   * @param {number} translationId
   * @returns {void}
   */
  #cancelTranslationRequest(translationId) {
    const request = this.#translationRequests.get(translationId);

    if (!request) {
      return;
    }

    request.resolve(null);
    this.#port?.postMessage({
      type: "TranslationsPort:CancelSingleTranslation",
      translationId,
    });

    this.#translationRequests.delete(translationId);
  }

  /**
   * Cancels the oldest active translation request,
   * only if this Translator is at its active request capacity.
   */
  #maybeCancelOldestActiveRequest() {
    if (this.#activeRequestCapacity === null) {
      // This Translator has no limit to active requests.
      return;
    }

    if (this.#translationRequests.size < this.#activeRequestCapacity) {
      // This Translator is not currently at capacity.
      return;
    }

    // Since JS Map preserves insertion order, the oldest request will be the first key.
    const oldestId = this.#translationRequests.keys().next().value;
    this.#cancelTranslationRequest(oldestId);
  }
}

/**
 * The PassthroughTranslator class mimics the same API as the Translator class,
 * but it does not create any message ports for actual translation. This class
 * may only be constructed with the same sourceLanguage and targetLanguage value, and
 * instead of translating, it just passes through the source text as the translated
 * text.
 *
 * The Translator class may return a PassthroughTranslator instance if the sourceLanguage
 * and targetLanguage passed to the create() method are the same.
 *
 * @see Translator.create
 */
class PassthroughTranslator {
  /**
   * The BCP-47 language tag for the source and target language..
   *
   * @type {string}
   */
  #language;

  /**
   * @returns {Promise<void>} A promise that indicates if the Translator is ready to translate.
   */
  get ready() {
    return Promise.resolve;
  }

  /**
   * @returns {boolean} Always false for PassthroughTranslator because there is no port.
   */
  get portClosed() {
    return false;
  }

  /**
   * @returns {string} The BCP-47 language tag of the source language.
   */
  get sourceLanguage() {
    return this.#language;
  }

  /**
   * @returns {string} The BCP-47 language tag of the source language.
   */
  get targetLanguage() {
    return this.#language;
  }

  /**
   * Initializes a new PassthroughTranslator.
   *
   * Prefer using the Translator.create() function.
   *
   * @see Translator.create
   *
   * @param {LanguagePair} languagePair
   */
  constructor(languagePair) {
    if (languagePair.sourceLanguage !== languagePair.targetLanguage) {
      throw new Error(
        "Attempt to create PassthroughTranslator with different sourceLanguage and targetLanguage."
      );
    }
    this.#language = languagePair.sourceLanguage;
  }

  /**
   * Returns true if the given language pair matches this translator, otherwise false.
   *
   * @param {LanguagePair} languagePair
   * @returns {boolean}
   */
  matchesLanguagePair(languagePair) {
    return (
      languagePair.sourceLanguage === this.#language &&
      languagePair.targetLanguage === this.#language
    );
  }

  /**
   * Passes through the source text as if it was translated.
   *
   * @returns {Promise<string>}
   */
  async translate(sourceText) {
    return Promise.resolve(sourceText);
  }

  /**
   * There is nothing to destroy in the PassthroughTranslator class.
   * This function is implemented to maintain the same API surface as
   * the Translator class.
   *
   * @see Translator
   */
  destroy() {}
}
