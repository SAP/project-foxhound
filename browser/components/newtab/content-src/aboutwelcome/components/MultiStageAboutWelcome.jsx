/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React, { useState, useEffect, useRef } from "react";
import { Localized } from "./MSLocalized";
import { AboutWelcomeUtils } from "../../lib/aboutwelcome-utils";
import { MultiStageProtonScreen } from "./MultiStageProtonScreen";
import { useLanguageSwitcher } from "./LanguageSwitcher";
import {
  BASE_PARAMS,
  addUtmParams,
} from "../../asrouter/templates/FirstRun/addUtmParams";

// Amount of milliseconds for all transitions to complete (including delays).
const TRANSITION_OUT_TIME = 1000;

export const MultiStageAboutWelcome = props => {
  let { screens } = props;

  const [index, setScreenIndex] = useState(props.startScreen);
  const [previousOrder, setPreviousOrder] = useState(props.startScreen - 1);
  useEffect(() => {
    const screenInitials = screens
      .map(({ id }) => id?.split("_")[1]?.[0])
      .join("");
    // Send impression ping when respective screen first renders
    screens.forEach((screen, order) => {
      if (index === order) {
        AboutWelcomeUtils.sendImpressionTelemetry(
          `${props.message_id}_${order}_${screen.id}_${screenInitials}`
        );
      }
    });

    // Remember that a new screen has loaded for browser navigation
    if (props.updateHistory && index > window.history.state) {
      window.history.pushState(index, "");
    }

    // Remember the previous screen index so we can animate the transition
    setPreviousOrder(index);
  }, [index]);

  const [flowParams, setFlowParams] = useState(null);
  const { metricsFlowUri } = props;
  useEffect(() => {
    (async () => {
      if (metricsFlowUri) {
        setFlowParams(await AboutWelcomeUtils.fetchFlowParams(metricsFlowUri));
      }
    })();
  }, [metricsFlowUri]);

  // Allow "in" style to render to actually transition towards regular state,
  // which also makes using browser back/forward navigation skip transitions.
  const [transition, setTransition] = useState(props.transitions ? "in" : "");
  useEffect(() => {
    if (transition === "in") {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setTransition(""))
      );
    }
  }, [transition]);

  // Transition to next screen, opening about:home on last screen button CTA
  const handleTransition = () => {
    // Only handle transitioning out from a screen once.
    if (transition === "out") {
      return;
    }

    // Start transitioning things "out" immediately when moving forwards.
    setTransition(props.transitions ? "out" : "");

    // Actually move forwards after all transitions finish.
    setTimeout(
      () => {
        if (index < screens.length - 1) {
          setTransition(props.transitions ? "in" : "");
          setScreenIndex(prevState => prevState + 1);
        } else {
          window.AWFinish();
        }
      },
      props.transitions ? TRANSITION_OUT_TIME : 0
    );
  };

  useEffect(() => {
    if (props.updateHistory) {
      // Switch to the screen tracked in state (null for initial state)
      // or last screen index if a user navigates by pressing back
      // button from about:home
      const handler = ({ state }) => {
        if (transition === "out") {
          return;
        }
        setTransition(props.transitions ? "out" : "");
        setTimeout(
          () => {
            setTransition(props.transitions ? "in" : "");
            setScreenIndex(Math.min(state, screens.length - 1));
          },
          props.transitions ? TRANSITION_OUT_TIME : 0
        );
      };

      // Handle page load, e.g., going back to about:welcome from about:home
      const { state } = window.history;
      if (state) {
        setScreenIndex(Math.min(state, screens.length - 1));
        setPreviousOrder(Math.min(state, screens.length - 1));
      }

      // Watch for browser back/forward button navigation events
      window.addEventListener("popstate", handler);
      return () => window.removeEventListener("popstate", handler);
    }
    return false;
  }, []);

  // Update top sites with default sites by region when region is available
  const [region, setRegion] = useState(null);
  useEffect(() => {
    (async () => {
      setRegion(await window.AWGetRegion());
    })();
  }, []);

  // Save the active multi select state containing array of checkbox ids
  // used in handleAction to update MULTI_ACTION data
  const [activeMultiSelect, setActiveMultiSelect] = useState(null);

  // Get the active theme so the rendering code can make it selected
  // by default.
  const [activeTheme, setActiveTheme] = useState(null);
  const [initialTheme, setInitialTheme] = useState(null);
  useEffect(() => {
    (async () => {
      let theme = await window.AWGetSelectedTheme();
      setInitialTheme(theme);
      setActiveTheme(theme);
    })();
  }, []);

  const useImportable = props.message_id.includes("IMPORTABLE");
  // Track whether we have already sent the importable sites impression telemetry
  const importTelemetrySent = useRef(false);
  const [topSites, setTopSites] = useState([]);
  useEffect(() => {
    (async () => {
      let DEFAULT_SITES = await window.AWGetDefaultSites?.();
      const importable = JSON.parse(
        (await window.AWGetImportableSites?.()) || "[]"
      );
      const showImportable = useImportable && importable.length >= 5;
      if (!importTelemetrySent.current) {
        AboutWelcomeUtils.sendImpressionTelemetry(`${props.message_id}_SITES`, {
          display: showImportable ? "importable" : "static",
          importable: importable.length,
        });
        importTelemetrySent.current = true;
      }
      setTopSites(
        showImportable
          ? { data: importable, showImportable }
          : { data: DEFAULT_SITES, showImportable }
      );
    })();
  }, [useImportable, region]);

  const centeredScreens = props.screens.filter(
    s => s.content.position !== "corner"
  );

  const {
    negotiatedLanguage,
    langPackInstallPhase,
    languageFilteredScreens,
  } = useLanguageSwitcher(
    props.appAndSystemLocaleInfo,
    screens,
    index,
    setScreenIndex
  );

  screens = languageFilteredScreens;

  return (
    <React.Fragment>
      <div
        className={`outer-wrapper onboardingContainer proton transition-${transition}`}
        style={props.backdrop ? { background: props.backdrop } : {}}
      >
        {screens.map((screen, order) => {
          const isFirstCenteredScreen =
            (!screen.content.position ||
              screen.content.position === "center") &&
            screen === centeredScreens[0];
          const isLastCenteredScreen =
            (!screen.content.position ||
              screen.content.position === "center") &&
            screen === centeredScreens[centeredScreens.length - 1];
          /* If first screen is corner positioned, don't include it in the count for the steps indicator. This assumes corner positioning will only be used on the first screen. */
          const totalNumberOfScreens =
            screens[0].content.position === "corner"
              ? screens.length - 1
              : screens.length;
          /* Don't include a starting corner screen when determining step indicator order */
          const stepOrder =
            screens[0].content.position === "corner" ? order - 1 : order;

          return index === order ? (
            <WelcomeScreen
              key={screen.id + order}
              id={screen.id}
              totalNumberOfScreens={totalNumberOfScreens}
              isFirstCenteredScreen={isFirstCenteredScreen}
              isLastCenteredScreen={isLastCenteredScreen}
              stepOrder={stepOrder}
              order={order}
              previousOrder={previousOrder}
              content={screen.content}
              navigate={handleTransition}
              topSites={topSites}
              messageId={`${props.message_id}_${order}_${screen.id}`}
              UTMTerm={props.utm_term}
              flowParams={flowParams}
              activeTheme={activeTheme}
              initialTheme={initialTheme}
              setActiveTheme={setActiveTheme}
              setInitialTheme={setInitialTheme}
              activeMultiSelect={activeMultiSelect}
              setActiveMultiSelect={setActiveMultiSelect}
              autoAdvance={screen.auto_advance}
              negotiatedLanguage={negotiatedLanguage}
              langPackInstallPhase={langPackInstallPhase}
            />
          ) : null;
        })}
      </div>
    </React.Fragment>
  );
};

export const SecondaryCTA = props => {
  let targetElement = props.position
    ? `secondary_button_${props.position}`
    : `secondary_button`;
  const buttonStyling = props.content.secondary_button?.has_arrow_icon
    ? `secondary text-link arrow-icon`
    : `secondary text-link`;

  return (
    <div
      className={
        props.position ? `secondary-cta ${props.position}` : "secondary-cta"
      }
    >
      <Localized text={props.content[targetElement].text}>
        <span />
      </Localized>
      <Localized text={props.content[targetElement].label}>
        <button
          className={buttonStyling}
          value={targetElement}
          onClick={props.handleAction}
        />
      </Localized>
    </div>
  );
};

export const StepsIndicator = props => {
  let steps = [];
  for (let i = 0; i < props.totalNumberOfScreens; i++) {
    let className = `${i === props.order ? "current" : ""} ${
      i < props.order ? "complete" : ""
    }`;
    steps.push(
      <div key={i} className={`indicator ${className}`} role="presentation" />
    );
  }
  return steps;
};

export const ProgressBar = ({ step, previousStep, totalNumberOfScreens }) => {
  const [progress, setProgress] = React.useState(
    previousStep / totalNumberOfScreens
  );
  useEffect(() => {
    // We don't need to hook any dependencies because any time the step changes,
    // the screen's entire DOM tree will be re-rendered.
    setProgress(step / totalNumberOfScreens);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div
      className="indicator"
      role="presentation"
      style={{ "--progress-bar-progress": `${progress * 100}%` }}
    />
  );
};

export class WelcomeScreen extends React.PureComponent {
  constructor(props) {
    super(props);
    this.handleAction = this.handleAction.bind(this);
  }

  handleOpenURL(action, flowParams, UTMTerm) {
    let { type, data } = action;
    if (type === "SHOW_FIREFOX_ACCOUNTS") {
      let params = {
        ...BASE_PARAMS,
        utm_term: `aboutwelcome-${UTMTerm}-screen`,
      };
      if (action.addFlowParams && flowParams) {
        params = {
          ...params,
          ...flowParams,
        };
      }
      data = { ...data, extraParams: params };
    } else if (type === "OPEN_URL") {
      let url = new URL(data.args);
      addUtmParams(url, `aboutwelcome-${UTMTerm}-screen`);
      if (action.addFlowParams && flowParams) {
        url.searchParams.append("device_id", flowParams.deviceId);
        url.searchParams.append("flow_id", flowParams.flowId);
        url.searchParams.append("flow_begin_time", flowParams.flowBeginTime);
      }
      data = { ...data, args: url.toString() };
    }
    AboutWelcomeUtils.handleUserAction({ type, data });
  }

  async handleAction(event) {
    let { props } = this;
    const value =
      event.currentTarget.value ?? event.currentTarget.getAttribute("value");
    let targetContent =
      props.content[value] ||
      props.content.tiles ||
      props.content.languageSwitcher;

    if (!(targetContent && targetContent.action)) {
      return;
    }
    // Send telemetry before waiting on actions
    AboutWelcomeUtils.sendActionTelemetry(props.messageId, value, event.name);

    // Send additional telemetry if a messaging surface like feature callout is
    // dismissed via the dismiss button. Other causes of dismissal will be
    // handled separately by the messaging surface's own code.
    if (value === "dismiss_button" && !event.name) {
      AboutWelcomeUtils.sendDismissTelemetry(props.messageId, value);
    }

    let { action } = targetContent;

    if (action.collectSelect) {
      // Populate MULTI_ACTION data actions property with selected checkbox actions from tiles data
      action.data = {
        actions: this.props.activeMultiSelect.map(
          id => props.content?.tiles?.data.find(ckbx => ckbx.id === id)?.action
        ),
      };

      // Send telemetry with selected checkbox ids
      AboutWelcomeUtils.sendActionTelemetry(
        props.messageId,
        props.activeMultiSelect,
        "SELECT_CHECKBOX"
      );
    }

    if (["OPEN_URL", "SHOW_FIREFOX_ACCOUNTS"].includes(action.type)) {
      this.handleOpenURL(action, props.flowParams, props.UTMTerm);
    } else if (action.type) {
      AboutWelcomeUtils.handleUserAction(action);
      // Wait until migration closes to complete the action
      if (
        action.type === "SHOW_MIGRATION_WIZARD" ||
        (action.type === "MULTI_ACTION" &&
          action?.data?.actions.find(
            subAction => subAction.type === "SHOW_MIGRATION_WIZARD"
          ))
      ) {
        await window.AWWaitForMigrationClose();
        AboutWelcomeUtils.sendActionTelemetry(props.messageId, "migrate_close");
      }
    }

    // A special tiles.action.theme value indicates we should use the event's value vs provided value.
    if (action.theme) {
      let themeToUse =
        action.theme === "<event>"
          ? event.currentTarget.value
          : this.props.initialTheme || action.theme;

      this.props.setActiveTheme(themeToUse);
      window.AWSelectTheme(themeToUse);
    }

    // If the action has persistActiveTheme: true, we set the initial theme to the currently active theme
    // so that it can be reverted to in the event that the user navigates away from the screen
    if (action.persistActiveTheme) {
      this.props.setInitialTheme(this.props.activeTheme);
    }

    if (action.navigate) {
      props.navigate();
    }

    if (action.dismiss) {
      window.AWFinish();
    }
  }

  render() {
    return (
      <MultiStageProtonScreen
        content={this.props.content}
        id={this.props.id}
        order={this.props.order}
        stepOrder={this.props.stepOrder}
        previousOrder={this.props.previousOrder}
        activeTheme={this.props.activeTheme}
        activeMultiSelect={this.props.activeMultiSelect}
        setActiveMultiSelect={this.props.setActiveMultiSelect}
        totalNumberOfScreens={this.props.totalNumberOfScreens}
        appAndSystemLocaleInfo={this.props.appAndSystemLocaleInfo}
        negotiatedLanguage={this.props.negotiatedLanguage}
        langPackInstallPhase={this.props.langPackInstallPhase}
        handleAction={this.handleAction}
        messageId={this.props.messageId}
        isFirstCenteredScreen={this.props.isFirstCenteredScreen}
        isLastCenteredScreen={this.props.isLastCenteredScreen}
        startsWithCorner={this.props.startsWithCorner}
        autoAdvance={this.props.autoAdvance}
      />
    );
  }
}
