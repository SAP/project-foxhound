/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React from "react";
import { createRoot } from "react-dom/client";
import { MultiStageAboutWelcome } from "./components/MultiStageAboutWelcome";

function MultistageWithDismiss({ config, handleDismiss, handleBlock }) {
  function onDismiss() {
    handleBlock?.();
    handleDismiss?.();
  }

  return (
    <div className="multistage-newtab-wrapper">
      <moz-button
        type="icon ghost"
        size="small"
        iconsrc="chrome://global/skin/icons/close.svg"
        data-l10n-id="newtab-activation-window-message-dismiss-button"
        onClick={onDismiss}
      />
      <MultiStageAboutWelcome
        defaultScreens={config.screens}
        message_id={config.id}
        transitions={config.transitions ?? false}
        backdrop={config.backdrop}
        startScreen={0}
        updateHistory={false}
      />
    </div>
  );
}

window.mountMultistageMessage = function mountMultistageMessage(
  container,
  props
) {
  const { messageData, handleDismiss, handleBlock, handleClick } = props;
  const config = messageData.content;

  const awHandlers = {
    AWEvaluateScreenTargeting: screens =>
      window.ASRouterMessage({
        type: "AW_EVALUATE_SCREEN_TARGETING",
        data: screens,
      }),
    AWGetFeatureConfig: () => config,
    AWFinish: () => handleDismiss(),
    AWSendToParent: (handlerName, data) =>
      window.ASRouterMessage({
        type: "USER_ACTION",
        data,
      }),
    AWAddScreenImpression: screenObj => {
      window.ASRouterMessage({
        type: "AW_ADD_SCREEN_IMPRESSION",
        data: screenObj,
      });
    },
    AWSendEventTelemetry: data => {
      if (data.event !== "IMPRESSION") {
        handleClick(data.event);
      }
    },
    AWGetSelectedTheme: () => Promise.resolve(),
    AWGetInstalledAddons: () => Promise.resolve(),
  };

  for (const [handlerName, fn] of Object.entries(awHandlers)) {
    window[handlerName] = fn;
  }

  const root = createRoot(container);
  root.render(
    <MultistageWithDismiss
      config={config}
      handleDismiss={handleDismiss}
      handleBlock={handleBlock}
    />
  );

  return function cleanup() {
    root.unmount();
    for (const handlerName of Object.keys(awHandlers)) {
      delete window[handlerName];
    }
  };
};
