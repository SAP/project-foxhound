/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import { ContentSection } from "content-src/components/CustomizeMenu/ContentSection/ContentSection";
import { connect } from "react-redux";
import React from "react";

const PREF_NOVA_ENABLED = "nova.enabled";
// eslint-disable-next-line no-shadow
import { CSSTransition } from "react-transition-group";

export class _CustomizeMenu extends React.PureComponent {
  constructor(props) {
    super(props);
    this.onEntered = this.onEntered.bind(this);
    this.onExited = this.onExited.bind(this);
    this.onSubpanelToggle = this.onSubpanelToggle.bind(this);
    this.onCancel = this.onCancel.bind(this);
    this.onDialogClick = this.onDialogClick.bind(this);
    this.personalizeButtonRef = React.createRef();
    this.dialogRef = React.createRef();
    this.closeButtonRef = React.createRef();
    this.state = {
      subpanelOpen: false,
    };
  }

  onSubpanelToggle(isOpen) {
    this.setState({ subpanelOpen: isOpen });
  }

  componentDidUpdate(prevProps) {
    if (this.props.showing && !prevProps.showing) {
      if (!this.dialogRef.current?.open) {
        this.dialogRef.current?.showModal();
      }
    }
  }

  onCancel(e) {
    e.preventDefault();
    this.props.onClose();
  }

  onDialogClick(e) {
    if (e.target === this.dialogRef.current) {
      this.props.onClose();
    }
  }

  onEntered() {
    if (this.closeButtonRef.current) {
      this.closeButtonRef.current.focus();
    }
  }

  onExited() {
    if (this.dialogRef.current?.open) {
      this.dialogRef.current.close();
    }
    if (this.props.showWidgetsManagementPanel) {
      this.props.toggleWidgetsManagementPanel();
    }
    if (this.props.showSectionsMgmtPanel) {
      this.props.toggleSectionsMgmtPanel();
    }
    if (this.personalizeButtonRef.current) {
      this.personalizeButtonRef.current.focus();
    }
  }

  render() {
    const activationWindowVariant =
      this.props.Prefs.values["activationWindow.variant"];

    const activationWindowClass = activationWindowVariant
      ? `activation-window-variant-${activationWindowVariant}`
      : "";
    // @nova-cleanup(remove-pref): remove nova pref
    const novaEnabled = this.props.Prefs.values[PREF_NOVA_ENABLED];

    return (
      <span>
        <CSSTransition
          nodeRef={this.personalizeButtonRef}
          timeout={300}
          classNames="personalize-animate"
          in={!this.props.showing}
          appear={true}
        >
          {
            // @nova-cleanup(remove-conditional): replace with moz-button only
            novaEnabled ? (
              <moz-button
                ref={this.personalizeButtonRef}
                className={`open-customization-button${activationWindowClass ? ` ${activationWindowClass}` : ""}`}
                data-l10n-id="newtab-customize-panel-label"
                aria-haspopup="dialog"
                aria-expanded={this.props.showing ? "true" : "false"}
                onClick={() => this.props.onOpen()}
                iconsrc="chrome://global/skin/icons/edit-outline.svg"
                iconposition="end"
                type="default"
              ></moz-button>
            ) : (
              <button
                ref={this.personalizeButtonRef}
                className={`${activationWindowClass} personalize-button`}
                data-l10n-id="newtab-customize-panel-icon-button"
                aria-haspopup="dialog"
                aria-expanded={this.props.showing}
                onClick={() => this.props.onOpen()}
              >
                <label data-l10n-id="newtab-customize-panel-icon-button-label" />
                <div>
                  <img
                    alt=""
                    src="chrome://global/skin/icons/edit-outline.svg"
                  />
                </div>
              </button>
            )
          }
        </CSSTransition>
        <CSSTransition
          nodeRef={this.dialogRef}
          timeout={250}
          classNames="customize-animate"
          in={this.props.showing}
          onEntered={this.onEntered}
          onExited={this.onExited}
          appear={true}
        >
          <dialog
            ref={this.dialogRef}
            // @nova-cleanup(remove-conditional): Remove nova-enabled class
            className={`customize-menu ${novaEnabled ? "nova-enabled" : ""}`}
            data-l10n-id="newtab-settings-dialog-label"
            onCancel={this.onCancel}
            onClick={this.onDialogClick}
          >
            <div
              className={`customize-menu-content${this.state.subpanelOpen ? " subpanel-open" : ""}`}
            >
              <div className="close-button-wrapper">
                <moz-button
                  onClick={() => this.props.onClose()}
                  id="close-button"
                  type="icon ghost"
                  data-l10n-id="newtab-custom-close-menu-button"
                  iconsrc="chrome://global/skin/icons/close.svg"
                  ref={this.closeButtonRef}
                ></moz-button>
              </div>
              <ContentSection
                openPreferences={this.props.openPreferences}
                setPref={this.props.setPref}
                enabledSections={this.props.enabledSections}
                enabledWidgets={this.props.enabledWidgets}
                wallpapersEnabled={this.props.wallpapersEnabled}
                wallpapersUserEnabled={this.props.wallpapersUserEnabled}
                activeWallpaper={this.props.activeWallpaper}
                pocketRegion={this.props.pocketRegion}
                mayHaveTopicSections={this.props.mayHaveTopicSections}
                mayHaveInferredPersonalization={
                  this.props.mayHaveInferredPersonalization
                }
                mayHaveWeather={this.props.mayHaveWeather}
                mayHaveWidgets={this.props.mayHaveWidgets}
                mayHaveWeatherForecast={this.props.mayHaveWeatherForecast}
                weatherDisplay={this.props.weatherDisplay}
                mayHaveTimerWidget={this.props.mayHaveTimerWidget}
                mayHaveListsWidget={this.props.mayHaveListsWidget}
                mayHaveSportsWidget={this.props.mayHaveSportsWidget}
                mayHaveClocksWidget={this.props.mayHaveClocksWidget}
                dispatch={this.props.dispatch}
                onSubpanelToggle={this.onSubpanelToggle}
                toggleSectionsMgmtPanel={this.props.toggleSectionsMgmtPanel}
                showSectionsMgmtPanel={this.props.showSectionsMgmtPanel}
                novaEnabled={novaEnabled}
                toggleWidgetsManagementPanel={
                  this.props.toggleWidgetsManagementPanel
                }
                showWidgetsManagementPanel={
                  this.props.showWidgetsManagementPanel
                }
                widgetsEnabled={this.props.widgetsEnabled}
              />
            </div>
          </dialog>
        </CSSTransition>
      </span>
    );
  }
}

export const CustomizeMenu = connect(state => ({
  DiscoveryStream: state.DiscoveryStream,
  Prefs: state.Prefs,
}))(_CustomizeMenu);
