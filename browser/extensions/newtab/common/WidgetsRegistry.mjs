/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * WIDGET_REGISTRY — single source of truth for all New Tab widgets.
 *
 * WHY THIS EXISTS
 * Previously, every widget was hardcoded in three places: the render loop in
 * Widgets.jsx, the hideAllWidgets handler, and the toggleMaximize handler.
 * Adding or removing a widget required edits in all three spots and was easy
 * to get out of sync. This registry replaces those hardcoded lists so that
 * Widgets.jsx, WidgetsSidebar.jsx, and any future consumers share one
 * authoritative definition.
 *
 * HOW IT WORKS
 * Each entry describes one widget's static metadata:
 *
 *   id                — unique string key used in prefs and the order pref
 *   telemetryName     — the name sent in Glean events (snake_case; may differ from id)
 *   order             — default render position (0-indexed); used when widgets.order is empty
 *   enabledPref       — the user-facing pref that toggles this widget on/off
 *   sizePref          — the pref that stores the user's chosen size (empty string = not set)
 *   defaultSize       — size to use when sizePref is empty and no trainhop suggestion exists
 *   validSizes        — the sizes this widget supports (drives size picker options)
 *   hasSidebar        — when true, the widget renders in the sidebar instead of the
 *                       widget row when its effective size equals "small". Size alone is not
 *                       sufficient — this flag must be set explicitly so that future
 *                       widgets that support "small" but stay in the row are not
 *                       accidentally moved to the sidebar.
 *   systemEnabledPref — system/operator pref that gates this widget independent of the user pref
 *   trainhopEnabledKey — key in trainhopConfig.widgets.* for the enabled override
 *   trainhopSizeKey    — key in trainhopConfig.widgets.* for the size default suggestion
 *                        (only applies when the user has not explicitly set sizePref)
 *   trainhopSidebarKey — key in trainhopConfig.widgets.* for the hasSidebar override;
 *                        null means the sidebar placement is not overridable via trainhop
 *
 * SIZE PRIORITY
 * sizePref defaults to "" (empty string) in PREFS_CONFIG. An empty value
 * means the user has not explicitly chosen a size; resolveWidgetSize() falls
 * through to a trainhop suggestion and then to widget.defaultSize. Once the
 * user resizes a widget via the UI the pref is written with a real value and
 * trainhop can no longer override it. resolveWidgetSize() applies these in order:
 *   1. User-set pref (sizePref is non-empty) — always wins
 *   2. trainhopConfig suggestion (trainhopSizeKey) — acts as default, not override
 *   3. widget.defaultSize — final fallback
 *
 * Note: widgets.weather.size uses getValue: getWeatherWidgetSize in
 * ActivityStream.sys.mjs rather than value: "" because it has a Nova migration
 * path that infers the correct initial size from the user's previous weather
 * configuration. After migration the stored value is non-empty and the sentinel
 * logic above applies normally.
 *
 * ADDING A NEW WIDGET
 * 1. Add a new entry to WIDGET_REGISTRY below with the next `order` integer.
 *    Set telemetryName to the snake_case Glean name for this widget.
 * 2. Export its pref key constants from this file.
 * 3. Register both prefs (enabled + size) in lib/ActivityStream.sys.mjs.
 * 4. Add the component to WIDGET_ROW_COMPONENTS in WidgetsComponentRegistry.jsx.
 * 5. If it has a sidebar variant, set hasSidebar: true and add its component
 *    to WIDGET_SIDEBAR_COMPONENTS in WidgetsComponentRegistry.jsx.
 *
 * ADDING A NEW PER-WIDGET DIMENSION (e.g. "scale")
 * 1. Add scalePref and trainhopScaleKey fields to each registry entry.
 * 2. Export a resolveWidgetScale(widget, prefs) helper following the same
 *    user-pref-wins pattern as resolveWidgetSize().
 * 3. Update components to call the helper instead of reading the pref directly.
 *
 * The widgets.order pref (CSV of widget IDs) persists user-defined order.
 * It is only written when the user explicitly reorders widgets — never on
 * enable/disable. Disabled widgets keep their slot so they reappear in the
 * same position when re-enabled. See resolveWidgetOrder() below.
 */

export const PREF_WIDGETS_LISTS_ENABLED = "widgets.lists.enabled";
export const PREF_WIDGETS_TIMER_ENABLED = "widgets.focusTimer.enabled";
export const PREF_WIDGETS_WEATHER_ENABLED = "widgets.weather.enabled";
export const PREF_LISTS_SIZE = "widgets.lists.size";
export const PREF_FOCUS_TIMER_SIZE = "widgets.focusTimer.size";
export const PREF_WEATHER_SIZE = "widgets.weather.size";
export const PREF_WIDGETS_ORDER = "widgets.order";
export const PREF_WIDGETS_SYSTEM_LISTS_ENABLED = "widgets.system.lists.enabled";
export const PREF_WIDGETS_SYSTEM_TIMER_ENABLED =
  "widgets.system.focusTimer.enabled";
export const PREF_WIDGETS_SYSTEM_WEATHER_ENABLED =
  "widgets.system.weather.enabled";
export const PREF_WIDGETS_SPORTS_WIDGET_ENABLED =
  "widgets.sportsWidget.enabled";
export const PREF_SPORTS_WIDGET_SIZE = "widgets.sportsWidget.size";
export const PREF_WIDGETS_SYSTEM_SPORTS_WIDGET_ENABLED =
  "widgets.system.sportsWidget.enabled";
export const PREF_WIDGETS_CLOCKS_ENABLED = "widgets.clocks.enabled";
export const PREF_CLOCKS_SIZE = "widgets.clocks.size";
export const PREF_WIDGETS_SYSTEM_CLOCKS_ENABLED =
  "widgets.system.clocks.enabled";

/**
 * @typedef {object} WidgetRegistryEntry
 * @property {string} id - Unique key used in prefs and the order pref.
 * @property {string} telemetryName - Snake_case name sent in Glean events. May differ from id (e.g. "focus_timer" for id "focusTimer").
 * @property {number} order - Default render position (0-indexed).
 * @property {string} enabledPref - User-facing pref that toggles this widget on/off.
 * @property {string} sizePref - Pref that stores the user's chosen size ("" = not yet set).
 * @property {string} defaultSize - Fallback size when sizePref is empty and no trainhop suggestion exists.
 * @property {string[]} validSizes - Sizes this widget supports.
 * @property {boolean} hasSidebar - When true, the widget moves to the sidebar at size "small".
 * @property {string} systemEnabledPref - Operator pref that gates the widget independently of the user pref.
 * @property {string} trainhopEnabledKey - Key in trainhopConfig.widgets.* for the enabled override.
 * @property {string|null} trainhopSizeKey - Key in trainhopConfig.widgets.* for the size default suggestion.
 * @property {string|null} trainhopSidebarKey - Key in trainhopConfig.widgets.* for the hasSidebar override.
 * @property {string} widgetsSettingsVisibleKey - Key in trainhopConfig.widgetsSettings.* that additively reveals this widget's toggle in the settings UIs (does not enable the widget).
 * @property {string} widgetsSettingsEnabledKey - Key in trainhopConfig.widgetsSettings.* that overrides this widget's default enabled value (written to the pref default branch; an explicit user toggle still wins).
 */

/** @type {WidgetRegistryEntry[]} */
export const WIDGET_REGISTRY = [
  {
    id: "sportsWidget",
    telemetryName: "sports",
    order: 0,
    enabledPref: PREF_WIDGETS_SPORTS_WIDGET_ENABLED,
    sizePref: PREF_SPORTS_WIDGET_SIZE,
    defaultSize: "medium",
    validSizes: ["medium", "large"],
    hasSidebar: false,
    systemEnabledPref: PREF_WIDGETS_SYSTEM_SPORTS_WIDGET_ENABLED,
    trainhopEnabledKey: "sportsWidgetEnabled",
    trainhopSizeKey: "sportsWidgetSize",
    trainhopSidebarKey: null,
    widgetsSettingsVisibleKey: "sportsWidgetVisible",
    widgetsSettingsEnabledKey: "sportsWidgetEnabled",
  },
  {
    id: "clocks",
    telemetryName: "clocks",
    order: 1,
    enabledPref: PREF_WIDGETS_CLOCKS_ENABLED,
    sizePref: PREF_CLOCKS_SIZE,
    defaultSize: "medium",
    validSizes: ["small", "medium", "large"],
    hasSidebar: false,
    systemEnabledPref: PREF_WIDGETS_SYSTEM_CLOCKS_ENABLED,
    trainhopEnabledKey: "clocksEnabled",
    trainhopSizeKey: "clocksSize",
    trainhopSidebarKey: null,
    widgetsSettingsVisibleKey: "clocksVisible",
    widgetsSettingsEnabledKey: "clocksEnabled",
  },
  {
    id: "lists",
    telemetryName: "lists",
    order: 2,
    enabledPref: PREF_WIDGETS_LISTS_ENABLED,
    sizePref: PREF_LISTS_SIZE,
    defaultSize: "medium",
    validSizes: ["small", "medium", "large"],
    hasSidebar: false,
    systemEnabledPref: PREF_WIDGETS_SYSTEM_LISTS_ENABLED,
    trainhopEnabledKey: "listsEnabled",
    trainhopSizeKey: "listsSize",
    trainhopSidebarKey: null,
    widgetsSettingsVisibleKey: "listsVisible",
    widgetsSettingsEnabledKey: "listsEnabled",
  },
  {
    id: "focusTimer",
    telemetryName: "focus_timer",
    order: 3,
    enabledPref: PREF_WIDGETS_TIMER_ENABLED,
    sizePref: PREF_FOCUS_TIMER_SIZE,
    defaultSize: "medium",
    validSizes: ["small", "medium", "large"],
    hasSidebar: false,
    systemEnabledPref: PREF_WIDGETS_SYSTEM_TIMER_ENABLED,
    trainhopEnabledKey: "timerEnabled",
    trainhopSizeKey: "timerSize",
    trainhopSidebarKey: null,
    widgetsSettingsVisibleKey: "focusTimerVisible",
    widgetsSettingsEnabledKey: "focusTimerEnabled",
  },
  {
    id: "weather",
    telemetryName: "weather",
    order: 4,
    enabledPref: PREF_WIDGETS_WEATHER_ENABLED,
    sizePref: PREF_WEATHER_SIZE,
    defaultSize: "small",
    validSizes: ["small", "medium", "large"],
    hasSidebar: true,
    systemEnabledPref: PREF_WIDGETS_SYSTEM_WEATHER_ENABLED,
    trainhopEnabledKey: "weatherEnabled",
    trainhopSizeKey: "weatherSize",
    trainhopSidebarKey: "weatherSidebar",
    widgetsSettingsVisibleKey: "weatherVisible",
    widgetsSettingsEnabledKey: "weatherEnabled",
  },
];

/**
 * Returns an ordered list of all widget IDs (including disabled ones).
 * Saved order is respected; any widget IDs not in the saved pref are appended
 * in registry-default order. Unknown IDs in the saved pref are dropped.
 *
 * @param {string} orderPref - value of the widgets.order pref (CSV string)
 */
export function getWidgetOrder(orderPref) {
  const registryIds = WIDGET_REGISTRY.map(w => w.id);
  if (!orderPref) {
    return registryIds;
  }
  const seen = new Set();
  const saved = orderPref
    .split(",")
    .filter(id => registryIds.includes(id) && !seen.has(id) && seen.add(id));
  const appended = registryIds.filter(id => !seen.has(id));
  return [...saved, ...appended];
}

/**
 * Returns the effective widget render order. The user's saved order wins;
 * a trainhop suggestion applies only when no user order is saved.
 *
 * @param {object} prefs - current pref values from the Redux store
 * @returns {string[]} ordered array of widget IDs
 */
export function resolveWidgetOrder(prefs) {
  const userOrder = prefs[PREF_WIDGETS_ORDER];
  if (userOrder) {
    return getWidgetOrder(userOrder);
  }
  const trainhopOrder = prefs.trainhopConfig?.widgets?.order;
  if (trainhopOrder) {
    return getWidgetOrder(trainhopOrder);
  }
  return getWidgetOrder(null);
}

/**
 * Returns true if the widget is available to the user, based on the
 * system pref, the trainhopConfig.widgets addable key, or a
 * widgetsSettings.*Visible override (revealing a toggle also makes the widget
 * addable so the toggle is functional). Does not consider whether the user has
 * turned the widget on, or whether the widgets container is enabled.
 *
 * @param {object} widget - a WIDGET_REGISTRY entry
 * @param {object} prefs - current pref values from the Redux store
 * @returns {boolean}
 */
export function isWidgetAddable(widget, prefs) {
  return Boolean(
    prefs.trainhopConfig?.widgets?.[widget.trainhopEnabledKey] ||
    prefs.trainhopConfig?.widgetsSettings?.[widget.widgetsSettingsVisibleKey] ||
    prefs[widget.systemEnabledPref]
  );
}

/**
 * Returns true if this widget's toggle should be shown in the settings UIs
 * (about:preferences#home and the Customize menu). A widget is shown when it is
 * addable (system pref, trainhopConfig.widgets, or widgetsSettings.*Visible) or
 * when the legacy `widgetsConfig` Nimbus variable enables it. Showing a toggle
 * does NOT enable the widget — enablement is the widget's own enabled pref,
 * whose default can be overridden via widgetsSettings.*Enabled.
 *
 * @param {object} widget - a WIDGET_REGISTRY entry
 * @param {object} prefs - current pref values from the Redux store
 * @returns {boolean}
 */
export function isWidgetToggleVisible(widget, prefs) {
  return Boolean(
    isWidgetAddable(widget, prefs) ||
    prefs.widgetsConfig?.[widget.trainhopEnabledKey]
  );
}

/**
 * Returns true if the Widgets container/section toggle should be shown.
 * Additive across the system pref, the legacy `widgetsConfig` variable, the
 * `trainhopConfig.widgets.enabled` addable key, and the new
 * `trainhopConfig.widgetsSettings.enabled` override.
 *
 * @param {object} prefs - current pref values from the Redux store
 * @returns {boolean}
 */
export function isWidgetsContainerVisible(prefs) {
  return Boolean(
    prefs["widgets.system.enabled"] ||
    prefs.widgetsConfig?.enabled ||
    prefs.trainhopConfig?.widgets?.enabled ||
    prefs.trainhopConfig?.widgetsSettings?.enabled
  );
}

/**
 * Returns true if the widget is currently enabled: the widgets container is
 * on, the widget is addable, and the user's enabled pref is set.
 *
 * @param {object} widget - a WIDGET_REGISTRY entry
 * @param {object} prefs - current pref values from the Redux store
 * @param {boolean} widgetsEnabled - value of the widgets.enabled container pref
 * @returns {boolean}
 */
export function isWidgetEnabled(widget, prefs, widgetsEnabled) {
  return Boolean(
    widgetsEnabled &&
    isWidgetAddable(widget, prefs) &&
    prefs[widget.enabledPref]
  );
}

/**
 * Returns the effective size for a widget, applying priority:
 *   user-set pref > trainhop suggestion > registry defaultSize
 *
 * A sizePref value of "" means the user has not explicitly chosen a size,
 * so trainhop and defaultSize are consulted. Any non-empty value was written
 * by a user action (size picker, maximize/minimize button) and always wins.
 *
 * @param {object} widget - a WIDGET_REGISTRY entry
 * @param {object} prefs - current pref values from the Redux store
 * @returns {string}
 */
export function resolveWidgetSize(widget, prefs) {
  const userPref = prefs[widget.sizePref];
  if (userPref) {
    return userPref;
  }
  const trainhopSize = widget.trainhopSizeKey
    ? prefs.trainhopConfig?.widgets?.[widget.trainhopSizeKey]
    : null;
  return trainhopSize || widget.defaultSize;
}

/**
 * Returns whether the widget should be placed in the sidebar.
 * A trainhop override (trainhopSidebarKey) takes precedence over the
 * static registry hasSidebar flag when present.
 *
 * @param {object} widget - a WIDGET_REGISTRY entry
 * @param {object} prefs - current pref values from the Redux store
 * @returns {boolean}
 */
export function resolveWidgetHasSidebar(widget, prefs) {
  if (widget.trainhopSidebarKey) {
    const override = prefs.trainhopConfig?.widgets?.[widget.trainhopSidebarKey];
    if (override !== undefined) {
      return override;
    }
  }
  return widget.hasSidebar;
}

/**
 * Returns the list of widgets to disable when "hide all" is triggered.
 * A widget is included if it has no sidebar variant OR if it is currently
 * in the row (not the sidebar). Each entry carries the pref to disable,
 * the telemetry name, and whether it was active (for telemetry filtering).
 *
 * @param {object} prefs - current pref values from the Redux store
 * @param {object} widgetEnabledMap - map of widget id → boolean (currently active in row)
 * @returns {{ enabledPref: string, telemetryName: string, active: boolean }[]}
 */
export function getHideAllTargets(prefs, widgetEnabledMap) {
  return WIDGET_REGISTRY.filter(
    w => !resolveWidgetHasSidebar(w, prefs) || widgetEnabledMap[w.id]
  ).map(w => ({
    enabledPref: w.enabledPref,
    telemetryName: w.telemetryName,
    active: !!widgetEnabledMap[w.id],
  }));
}
