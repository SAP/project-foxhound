/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

import { HttpServer } from "resource://testing-common/httpd.sys.mjs";
import { NetUtil } from "resource://gre/modules/NetUtil.sys.mjs";

const SERVER_PATH = "/api/v1/create";
const SHARE_PATH = "/share/mockShare001";
const AUTH_COMPLETE_PATH = "/auth-complete";

const COOKIE_CONTENTS = "auth=1; Path=/; Max-Age=6000; HttpOnly; SameSite=Lax";

/**
 * Mock content sharing server. Handles POST /api/v1/create and returns a
 * mock shareable URL. Overrides browser.contentsharing.server.url while running.
 */
class ContentSharingMockServerClass {
  #httpServer = null;
  #url = null;
  #mockShareURL = null;
  #requests = [];
  #originalServerUrl = null;
  #mockResponse = null;
  #mockResponseStatus = 201;
  #blockedRespondFns = [];
  get url() {
    return this.#url;
  }

  get mockShareURL() {
    return this.#mockShareURL;
  }

  get requests() {
    return this.#requests;
  }

  get mockResponse() {
    return this.#mockResponse;
  }
  set mockResponse(value) {
    this.#mockResponse = value;
  }

  get mockResponseStatus() {
    return this.#mockResponseStatus;
  }
  set mockResponseStatus(value) {
    this.#mockResponseStatus = value;
  }

  blockNextResponse() {
    return new Promise(resolve => {
      this.#blockedRespondFns.push(resolve);
    });
  }

  constructor() {
    this.#httpServer = new HttpServer();
    this.#httpServer.registerPathHandler(SERVER_PATH, (req, resp) =>
      this.#handleRequest(req, resp)
    );
    this.#httpServer.registerPathHandler(AUTH_COMPLETE_PATH, (req, resp) =>
      this.#handleAuthComplete(req, resp)
    );
  }

  async start() {
    if (this.#url) {
      return;
    }

    this.#httpServer.start(-1);
    const port = this.#httpServer.identity.primaryPort;
    this.#url = `http://localhost:${port}`;
    this.#mockShareURL = `http://localhost:${port}${SHARE_PATH}`;

    this.reset();

    this.#originalServerUrl = Services.prefs.getStringPref(
      "browser.contentsharing.server.url",
      ""
    );
    Services.prefs.setStringPref(
      "browser.contentsharing.server.url",
      this.#url
    );
  }

  async stop() {
    if (!this.#url) {
      return;
    }

    await this.#httpServer.stop();
    this.#url = null;

    if (this.#originalServerUrl) {
      Services.prefs.setStringPref(
        "browser.contentsharing.server.url",
        this.#originalServerUrl
      );
    } else {
      Services.prefs.clearUserPref("browser.contentsharing.server.url");
    }
    this.#originalServerUrl = null;
  }

  reset() {
    this.#requests = [];
    this.#mockResponse = { url: this.#mockShareURL };
    this.#mockResponseStatus = 201;
    this.#blockedRespondFns = [];
  }

  #handleRequest(httpRequest, httpResponse) {
    const bodyStream = httpRequest.bodyInputStream;
    const bodyText = NetUtil.readInputStreamToString(
      bodyStream,
      bodyStream.available(),
      { charset: "UTF-8" }
    );

    let body;
    try {
      body = JSON.parse(bodyText);
    } catch (e) {
      body = null;
    }

    this.#requests.push({ body });

    httpResponse.processAsync();

    const respond = () => {
      httpResponse.setStatusLine("", this.#mockResponseStatus, "");
      if (this.#mockResponseStatus !== 401) {
        httpResponse.setHeader("Set-Cookie", COOKIE_CONTENTS);
      }
      httpResponse.setHeader("Content-Type", "application/json", false);
      httpResponse.write(JSON.stringify(this.#mockResponse));
      httpResponse.finish();
    };

    if (this.#blockedRespondFns.length) {
      const resolveBlocked = this.#blockedRespondFns.shift();
      resolveBlocked(respond);
    } else {
      respond();
    }
  }

  #handleAuthComplete(httpRequest, httpResponse) {
    httpResponse.setStatusLine("", 200, "OK");
    httpResponse.setHeader("Content-Type", "text/html", false);
    httpResponse.write(
      "<!doctype html><title>Signed in</title><p>Signed in.</p>"
    );
  }
}

export const ContentSharingMockServer = new ContentSharingMockServerClass();
