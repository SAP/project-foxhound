/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import {
  OMC_HIGHLIGHT_REGISTRY,
  SHELLS,
  DISMISS_MODES,
  getRegistryEntry,
  resolveText,
  resolveImage,
} from "content-src/components/DiscoveryStreamComponents/FeatureHighlight/OMCHighlightRegistry.mjs";
import { SLOTS } from "content-src/components/DiscoveryStreamComponents/FeatureHighlight/OMCHighlightSlots.mjs";

describe("OMCHighlightRegistry", () => {
  describe("getRegistryEntry", () => {
    it("returns the entry for a known messageType", () => {
      const entry = getRegistryEntry("WorldCupWidgetsCallout");
      expect(entry).toBeTruthy();
      expect(entry.slot).toBe(SLOTS.WIDGETS_ROW);
      expect(entry.shell).toBe(SHELLS.POPOVER);
    });

    it("returns null for unknown messageType", () => {
      expect(getRegistryEntry("NonexistentType")).toBeNull();
    });

    it("returns null when messageType is falsy", () => {
      expect(getRegistryEntry(undefined)).toBeNull();
      expect(getRegistryEntry(null)).toBeNull();
      expect(getRegistryEntry("")).toBeNull();
    });
  });

  describe("resolveText override chain", () => {
    const args = {
      rawKey: "cardTitle",
      l10nKey: "title",
      defaultL10nId: "default-title-id",
    };

    it("prefers raw string from content", () => {
      const result = resolveText({
        ...args,
        content: { cardTitle: "Raw Override", title: "custom-id" },
      });
      expect(result).toEqual({ raw: "Raw Override" });
    });

    it("falls back to custom l10n id when raw is absent", () => {
      const result = resolveText({
        ...args,
        content: { title: "custom-id" },
      });
      expect(result).toEqual({ l10nId: "custom-id" });
    });

    it("falls back to default l10n id when neither override is present", () => {
      const result = resolveText({ ...args, content: {} });
      expect(result).toEqual({ l10nId: "default-title-id" });
    });

    it("returns null when no default and no overrides", () => {
      const result = resolveText({
        rawKey: "cardTitle",
        l10nKey: "title",
        defaultL10nId: undefined,
        content: {},
      });
      expect(result).toBeNull();
    });

    it("treats missing content the same as empty content", () => {
      const result = resolveText({ ...args, content: undefined });
      expect(result).toEqual({ l10nId: "default-title-id" });
    });
  });

  describe("resolveImage override chain", () => {
    const defaults = { src: "default.png" };

    it("returns null when content.hideImage is truthy", () => {
      expect(
        resolveImage({ content: { hideImage: true }, defaults })
      ).toBeNull();
    });

    it("returns the override when content.imageURL is present", () => {
      const result = resolveImage({
        content: { imageURL: "override.png" },
        defaults,
      });
      expect(result).toEqual({ src: "override.png" });
    });

    it("falls back to registry defaults when no override", () => {
      expect(resolveImage({ content: {}, defaults })).toEqual(defaults);
    });

    it("returns null when neither overrides nor defaults are present", () => {
      expect(resolveImage({ content: {}, defaults: undefined })).toBeNull();
    });

    it("supports srcLight/srcDark default", () => {
      const result = resolveImage({
        content: {},
        defaults: { srcLight: "light.png", srcDark: "dark.png" },
      });
      expect(result).toEqual({ srcLight: "light.png", srcDark: "dark.png" });
    });
  });

  describe("World Cup widgets popover entry", () => {
    it("references the agreed-upon shared l10n ids", () => {
      const entry = OMC_HIGHLIGHT_REGISTRY.WorldCupWidgetsCallout;
      expect(entry.body.title.l10nId).toBe(
        "newtab-sports-widget-message-day-in-play-title"
      );
      expect(entry.body.subtitle.l10nId).toBe(
        "newtab-sports-widget-message-day-in-play-body"
      );
    });

    it("uses BLOCK dismiss mode", () => {
      const entry = OMC_HIGHLIGHT_REGISTRY.WorldCupWidgetsCallout;
      expect(entry.dismiss).toBe(DISMISS_MODES.BLOCK);
    });
  });

  describe("Non-World-Cup widgets popover entry", () => {
    it("references the focus-and-forecasts l10n ids", () => {
      const entry = OMC_HIGHLIGHT_REGISTRY.WidgetsCallout;
      expect(entry.body.title.l10nId).toBe(
        "newtab-widget-message-focus-forecasts-title"
      );
      expect(entry.body.subtitle.l10nId).toBe(
        "newtab-widget-message-focus-forecasts-body"
      );
    });

    it("uses BLOCK dismiss mode", () => {
      const entry = OMC_HIGHLIGHT_REGISTRY.WidgetsCallout;
      expect(entry.dismiss).toBe(DISMISS_MODES.BLOCK);
    });

    it("shares the widgets-callout className with the World Cup popover", () => {
      const wc = OMC_HIGHLIGHT_REGISTRY.WorldCupWidgetsCallout;
      const nonWc = OMC_HIGHLIGHT_REGISTRY.WidgetsCallout;
      expect(nonWc.chrome.modalClassName).toBe(wc.chrome.modalClassName);
    });
  });
});
