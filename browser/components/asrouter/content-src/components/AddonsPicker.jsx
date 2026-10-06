/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React from "react";
import { MultiStageUtils } from "../lib/multistage-utils.mjs";
import { Localized } from "./MSLocalized";
import { InstallButton } from "./InstallButton";

export const AddonsPicker = props => {
  const { content, installedAddons, layout, handleAction } = props;

  if (!content) {
    return null;
  }

  function handleInstallClick(event) {
    const { message_id } = props;
    let { action, source_id } = content.tiles.data[event.currentTarget.value];

    if (action.type === "INSTALL_ADDON_FROM_URL") {
      if (!action.data) {
        return;
      }
    }

    handleAction(event, action);
    MultiStageUtils.sendActionTelemetry(message_id, source_id, "CLICK_BUTTON");
  }

  function handleAuthorClick(event, authorId) {
    event.stopPropagation();
    MultiStageUtils.handleUserAction({
      type: "OPEN_URL",
      data: {
        args: `https://addons.mozilla.org/firefox/user/${authorId}/`,
        where: "tab",
      },
    });
  }

  return (
    <div className={"addons-picker-container"}>
      {content.tiles.data.map(
        (
          {
            id,
            name: addonName,
            type,
            description,
            icon,
            author,
            install_label,
            install_complete_label,
          },
          index
        ) =>
          addonName ? (
            <div key={id} className="addon-container">
              <div className="rtamo-icon">
                <img
                  className={`${
                    type === "theme" ? "rtamo-theme-icon" : "brand-logo"
                  }`}
                  src={icon}
                  role="presentation"
                  alt=""
                />
              </div>

              {layout === "split" ? (
                <div className="addon-rows-container">
                  <div className="addon-row">
                    <div className="addon-author-details">
                      <Localized text={addonName}>
                        <div className="addon-title" />
                      </Localized>

                      {author && (
                        <div className="addon-author">
                          <Localized text={author.byLine}>
                            <span className="addon-by-line" />
                          </Localized>
                          <button
                            href="#"
                            onClick={e => {
                              handleAuthorClick(e, author.id);
                            }}
                            className="author-link"
                          >
                            <span>{author.name}</span>
                          </button>
                        </div>
                      )}
                    </div>
                    <InstallButton
                      key={id}
                      addonId={id}
                      handleAction={handleInstallClick}
                      index={index}
                      installedAddons={installedAddons}
                      install_label={install_label}
                      install_complete_label={install_complete_label}
                    />
                  </div>

                  <div className="addon-row">
                    <Localized text={description}>
                      <div className="addon-description" />
                    </Localized>
                  </div>
                </div>
              ) : (
                <>
                  <div className="addon-details">
                    <Localized text={addonName}>
                      <div className="addon-title" />
                    </Localized>
                    <Localized text={description}>
                      <div className="addon-description" />
                    </Localized>
                  </div>
                  <InstallButton
                    key={id}
                    addonId={id}
                    handleAction={handleInstallClick}
                    index={index}
                    installedAddons={installedAddons}
                    install_label={install_label}
                    install_complete_label={install_complete_label}
                  />
                </>
              )}
            </div>
          ) : null
      )}
    </div>
  );
};
