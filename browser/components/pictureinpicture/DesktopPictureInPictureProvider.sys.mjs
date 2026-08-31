/* -*- Mode: JavaScript; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { getActorFor } from "resource://gre/actors/PictureInPictureChild.sys.mjs";

/**
 * Desktop's implementation of the PIP Chrome JS interface declared in
 * dom/media/nsIMediaPictureInPictureProvider.idl
 */
class PictureInPictureFunctionsImpl {
  QueryInterface = ChromeUtils.generateQI(["nsIMediaPictureInPictureProvider"]);

  /**
   * Retrieves a named JSWindowActor from the window global of the given video element.
   *
   * @param {Element} videoElement - The video element to retrieve the actor for.
   * @param {string} actorType - The name of the actor to retrieve.
   * @returns {JSWindowActorChild} The requested actor.
   * @throws {Components.Exception} If the video element is invalid, has no window global, or the actor is not found.
   */
  #getActor(videoElement, actorType) {
    if (!videoElement) {
      throw Components.Exception(
        "Invalid video element",
        Cr.NS_ERROR_INVALID_ARG
      );
    }

    const docShell = videoElement.documentGlobal.docShell;
    const windowGlobalChild = docShell.domWindow.windowGlobalChild;

    if (!windowGlobalChild) {
      throw Components.Exception(
        "No WindowGlobalChild available",
        Cr.NS_ERROR_FAILURE
      );
    }

    const actor = windowGlobalChild.getActor(actorType);
    if (!actor) {
      throw Components.Exception(
        `${actorType} actor not found`,
        Cr.NS_ERROR_FAILURE
      );
    }
    return actor;
  }

  // See nsIMediaPictureInPictureProvider.idl for the function definition.
  async openMediaPictureInPictureWindow(videoElement, pictureInPictureWindow) {
    if (!pictureInPictureWindow) {
      throw Components.Exception(
        "Invalid PictureInPictureWindow argument",
        Cr.NS_ERROR_INVALID_ARG
      );
    }

    const actor = this.#getActor(videoElement, "PictureInPictureLauncher");
    // resolve early in the case where native PIP already has a window open
    if (videoElement.isCloningElementVisually) {
      return;
    }
    await actor.togglePictureInPicture({
      video: videoElement,
      reason: "Api",
      pictureInPictureWindow,
      eventExtraKeys: {},
    });

    // We've raced/tried to be used at the same time as the native
    // implementation, which stops cloning when that happens.
    // and if that's the case, we should reject.
    if (!videoElement.isCloningElementVisually) {
      throw Components.Exception(
        "Video is not cloning.",
        Cr.NS_ERROR_INVALID_ARG
      );
    }
  }

  // See nsIMediaPictureInPictureProvider.idl for the function definition.
  closeMediaPictureInPictureWindow(videoElement) {
    if (!videoElement) {
      throw Components.Exception(
        "Invalid PictureInPictureWindow argument",
        Cr.NS_ERROR_INVALID_ARG
      );
    }

    // Protect against theoretical race with native PIP
    if (!videoElement.isCloningElementVisually) {
      return Promise.resolve();
    }

    const actor = getActorFor(videoElement);
    if (!actor) {
      throw Components.Exception(
        "No actor found available",
        Cr.NS_ERROR_FAILURE
      );
    }
    return actor.closePictureInPicture({ reason: "Api" });
  }
}

export function PictureInPictureProvider() {
  return new PictureInPictureFunctionsImpl();
}
