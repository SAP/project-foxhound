/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* globals ContentSearchHandoffUIController */

/**
 * @backward-compat { version 148 }
 *
 * Temporary dual implementation to support train hopping. The old handoff UI
 * is kept alongside the new contentSearchHandoffUI.mjs custom element until
 * the module lands on all channels. Controlled by the pref
 * browser.newtabpage.activity-stream.search.useHandoffComponent.
 * Remove the old implementation and the pref once this ships to Release.
 */

import { actionCreators as ac, actionTypes as at } from "common/Actions.mjs";
import { connect } from "react-redux";
import { Logo } from "content-src/components/Logo/Logo";
import React from "react";
import { ExternalComponentWrapper } from "content-src/components/ExternalComponentWrapper/ExternalComponentWrapper";

export class _Search extends React.PureComponent {
  constructor(props) {
    super(props);
    this.onSearchHandoffClick = this.onSearchHandoffClick.bind(this);
    this.onSearchHandoffPaste = this.onSearchHandoffPaste.bind(this);
    this.onSearchHandoffDrop = this.onSearchHandoffDrop.bind(this);
    this.onInputMountHandoff = this.onInputMountHandoff.bind(this);
    this.onSearchHandoffButtonMount =
      this.onSearchHandoffButtonMount.bind(this);
  }

  handleEvent(event) {
    // Also track search events with our own telemetry
    if (event.detail.type === "Search") {
      this.props.dispatch(ac.UserEvent({ event: "SEARCH" }));
    }
  }

  doSearchHandoff(text) {
    this.props.dispatch(
      ac.OnlyToMain({ type: at.HANDOFF_SEARCH_TO_AWESOMEBAR, data: { text } })
    );
    this.props.dispatch({ type: at.FAKE_FOCUS_SEARCH });
    this.props.dispatch(ac.UserEvent({ event: "SEARCH_HANDOFF" }));
    if (text) {
      this.props.dispatch({ type: at.DISABLE_SEARCH });
    }
  }

  onSearchHandoffClick(event) {
    // When search hand-off is enabled, we render a big button that is styled to
    // look like a search textbox. If the button is clicked, we style
    // the button as if it was a focused search box and show a fake cursor but
    // really focus the awesomebar without the focus styles ("hidden focus").
    event.preventDefault();
    this.doSearchHandoff();
  }

  onSearchHandoffPaste(event) {
    event.preventDefault();
    this.doSearchHandoff(event.clipboardData.getData("Text"));
  }

  onSearchHandoffDrop(event) {
    event.preventDefault();
    let text = event.dataTransfer.getData("text");
    if (text) {
      this.doSearchHandoff(text);
    }
  }

  componentDidMount() {
    const {
      caretBlinkCount,
      caretBlinkTime,
      "search.useHandoffComponent": useHandoffComponent,
      "externalComponents.enabled": useExternalComponents,
    } = this.props.Prefs.values;

    if (useExternalComponents) {
      // Nothing to do - the external component will have set the caret
      // values itself.
      return;
    }

    if (useHandoffComponent) {
      const { handoffUI } = this;
      if (handoffUI) {
        // If caret blink count isn't defined, use the default infinite behavior for animation
        handoffUI.style.setProperty(
          "--caret-blink-count",
          caretBlinkCount > -1 ? caretBlinkCount : "infinite"
        );

        // Apply custom blink rate if set, else fallback to default (567ms on/off --> 1134ms total)
        handoffUI.style.setProperty(
          "--caret-blink-time",
          caretBlinkTime > 0 ? `${caretBlinkTime * 2}ms` : `${1134}ms`
        );
      }
    } else {
      const caret = this.fakeCaret;
      if (caret) {
        // If caret blink count isn't defined, use the default infinite behavior for animation
        caret.style.setProperty(
          "--caret-blink-count",
          caretBlinkCount > -1 ? caretBlinkCount : "infinite"
        );

        // Apply custom blink rate if set, else fallback to default (567ms on/off --> 1134ms total)
        caret.style.setProperty(
          "--caret-blink-time",
          caretBlinkTime > 0 ? `${caretBlinkTime * 2}ms` : `${1134}ms`
        );
      }
    }
  }

  onInputMountHandoff(input) {
    if (input) {
      // The handoff UI controller helps us set the search icon and reacts to
      // changes to default engine to keep everything in sync.
      this._handoffSearchController = new ContentSearchHandoffUIController();
    }
  }

  onSearchHandoffButtonMount(button) {
    // Keep a reference to the button for use during "paste" event handling.
    this._searchHandoffButton = button;
  }

  /*
   * Do not change the ID on the input field, as legacy newtab code
   * specifically looks for the id 'newtab-search-text' on input fields
   * in order to execute searches in various tests
   */
  render() {
    const useHandoffComponent =
      this.props.Prefs.values["search.useHandoffComponent"];
    const useExternalComponents =
      this.props.Prefs.values["externalComponents.enabled"];

    if (useHandoffComponent) {
      if (useExternalComponents) {
        return (
          <div className="search-wrapper">
            {this.props.showLogo && <Logo />}
            <ExternalComponentWrapper
              type="SEARCH"
              className="search-inner-wrapper"
            ></ExternalComponentWrapper>
          </div>
        );
      }
      return (
        <div className="search-wrapper">
          {this.props.showLogo && <Logo />}
          <div className="search-inner-wrapper">
            <content-search-handoff-ui
              ref={el => {
                this.handoffUI = el;
              }}
            ></content-search-handoff-ui>
          </div>
        </div>
      );
    }

    const wrapperClassName = [
      "search-wrapper",
      this.props.disable && "search-disabled",
      this.props.fakeFocus && "fake-focus",
    ]
      .filter(v => v)
      .join(" ");

    return (
      <div className={wrapperClassName}>
        {this.props.showLogo && <Logo />}
        <div className="search-inner-wrapper">
          <button
            className="search-handoff-button"
            ref={this.onSearchHandoffButtonMount}
            onClick={this.onSearchHandoffClick}
            tabIndex="-1"
          >
            <div className="fake-textbox" />
            <input
              type="search"
              className="fake-editable"
              tabIndex="-1"
              aria-hidden="true"
              onDrop={this.onSearchHandoffDrop}
              onPaste={this.onSearchHandoffPaste}
              ref={this.onInputMountHandoff}
            />
            <div
              className="fake-caret"
              ref={el => {
                this.fakeCaret = el;
              }}
            />
          </button>
        </div>
      </div>
    );
  }
}

export const Search = connect(state => ({
  Prefs: state.Prefs,
}))(_Search);
