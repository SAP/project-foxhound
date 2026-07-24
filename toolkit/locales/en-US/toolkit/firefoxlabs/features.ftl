# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# The title of the experiment should be kept in English as it may be referenced
# by various online articles and is technical in nature.
experimental-features-media-jxl =
    .label = Media: JPEG XL
experimental-features-media-jxl-description = With this feature enabled, { -brand-short-name } supports the JPEG XL (JXL) format. This is an enhanced image file format that supports lossless transition from traditional JPEG files. See <a data-l10n-name="bugzilla">bug 1539075</a> for more details.

# JS JIT Warp project
experimental-features-js-warp =
    .label = JavaScript JIT: Warp
experimental-features-js-warp-description = Enable Warp, a project to improve JavaScript performance and memory usage.

# Search during IME
experimental-features-ime-search =
    .label = Address Bar: show results during IME composition
experimental-features-ime-search-description = An IME (Input Method Editor) is a tool that allows you to enter complex symbols, such as those used in East Asian or Indic written languages, using a standard keyboard. Enabling this experiment will keep the address bar panel open, showing search results and suggestions, while using IME to input text. Note that the IME might display a panel that covers the address bar results, therefore this preference is only suggested for IME not using this type of panel.

experimental-features-group-developer-tools =
  .label = Developer Tools
experimental-features-group-webpage-display =
  .label = Webpage Display
experimental-features-group-customize-browsing =
  .label = Customize your browsing
experimental-features-group-productivity =
  .label = Productivity

# New Tab Custom Wallpapers
experimental-features-custom-wallpaper =
    .label = Choose a custom wallpaper or color for New Tab
experimental-features-custom-wallpaper-description = Upload your own wallpaper or pick a custom color for your New Tab background.

# Link Previews with AI
experimental-features-link-previews =
    .label = Link previews
experimental-features-link-previews-description =
    { PLATFORM() ->
        [macos] To learn more about a webpage before you click, hover over a link and press Shift (⇧) plus Option (⌥) or Alt. Previews can include details like title and reading time. For some webpages, AI can also read the page text and generate key points. The AI is optimized to read and generate English text. To prioritize your privacy, the AI runs locally on your computer. <a data-l10n-name="connect">Share feedback</a>
       *[other] To learn more about a webpage before you click, hover over a link and press Shift + Alt. Previews can include details like title and reading time. For some webpages, AI can also read the page text and generate key points. The AI is optimized to read and generate English text. To prioritize your privacy, the AI runs locally on your computer. <a data-l10n-name="connect">Share feedback</a>
    }

# This version of the link previews description does not mention AI.
experimental-features-link-previews-description-no-ai =
    { PLATFORM() ->
        [macos] To learn more about a webpage before you click, hover over a link and press Shift (⇧) plus Option (⌥) or Alt. Previews can include details like title and reading time. <a data-l10n-name="connect">Share feedback</a>
       *[other] To learn more about a webpage before you click, hover over a link and press Shift + Alt. Previews can include details like title and reading time. <a data-l10n-name="connect">Share feedback</a>
    }

# New Tab Sections with follow and block
experimental-features-newtab-sections-follow-block =
    .label = Topic Sections and Follow/Block for New Tab Stories
experimental-features-newtab-sections-follow-block-description = Organize the stories on your New Tab page into topic sections (Sports, Food, Entertainment and more) for a more structured and easy-to-scan experience. Use our new Follow and Block controls to customize what content you see. <a data-l10n-name="connect">Share feedback</a>

# Firefox Web Apps
experimental-features-fx-web-apps =
    .label = Add sites to your taskbar

# “Add tab to taskbar” is found in the tooltip text of `-taskbar-tab-urlbar-button-open`.
experimental-features-fx-web-apps-description = Open sites you frequently visit as a web app from your taskbar. Look for the “Add tab to taskbar” icon to the right the address bar to launch that site in a streamlined window with all of { -brand-product-name }’s protections. <a data-l10n-name="connect">Share feedback</a>

## New Tab Productivity Widgets

# Lists Widget
experimental-features-newtab-widget-lists =
    .label = Lists on { -firefox-home-brand-name }
experimental-features-newtab-widget-lists-description = Keep your to-do list top-of-mind when you open a new tab. From packing lists to shopping lists, make your plans in { -brand-product-name }. <a data-l10n-name="connect">Share feedback</a>

# Timer Widget
experimental-features-newtab-widget-timer =
    .label = Timer on { -firefox-home-brand-name }
experimental-features-newtab-widget-timer-description = Set a timer to keep you focused, nudge you to stay on track, or remind you to recharge. <a data-l10n-name="connect">Share feedback</a>

# Lists and Timer Widget (Combined)
experimental-features-newtab-widget-lists-and-timer =
    .label = Lists and timer on { -firefox-home-brand-name }
experimental-features-newtab-widget-lists-and-timer-description = Keep your to-do list top-of-mind when you open a new tab. From packing lists to shopping lists, make your plans in { -brand-product-name }. Set a timer to keep you focused, nudge you to stay on track, or remind you to recharge. <a data-l10n-name="connect">Share feedback</a>

# Semantic History Search
experimental-features-semantic-history-search =
    .label = Semantic History Search
experimental-features-semantic-history-search-description = Use a local Machine Learning model to suggest entries from history that are related to your searches based on natural language understanding in the { -brand-product-name } address bar. <a data-l10n-name="connect">Share feedback</a>

# Tab Notes
experimental-features-tab-notes =
    .label = Tab notes
experimental-features-tab-notes-description = Tab notes are an experimental feature that lets you add sticky notes to your browser tabs. Jot down context, reminders, or next steps so you can come back and remember why you opened it. We’d love your feedback as we keep improving this feature. <a data-l10n-name="connect">Share feedback</a>
