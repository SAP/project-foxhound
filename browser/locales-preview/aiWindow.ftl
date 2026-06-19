# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

## Chrome

main-context-menu-open-link-new-smart-window =
    .label = Open Link in New Smart Window
    .accesskey = S

appmenuitem-new-ai-window =
    .label = New Smart Window
    .value = New Smart Window

appmenuitem-new-classic-window =
    .label = New Classic Window

menu-file-new-ai-window =
    .label = New Smart Window

menu-file-new-classic-window =
    .label = New Classic Window

menu-history-chats =
    .label = Chats

menu-history-chats-recent =
    .label = Recent Chats

smartwindow-fullpage-heading = Smart Window

smartwindow-document-title = New Tab

## Smart Window Toggle Button

toolbar-button-ai-window-toggle =
    .label = Window Type
    .tooltiptext = Switch between Smart and Classic windows.

ai-window-toggleview-switch-classic =
    .label = Classic Window
    .value = Classic Window

ai-window-toggleview-switch-classic-description =
    .label = Standard browsing
    .value = Standard browsing

ai-window-toggleview-switch-ai =
    .label = Smart Window
    .value = Smart Window

ai-window-toggleview-switch-ai-description =
    .label = Ask as you browse
    .value = Ask as you browse

ai-window-toggleview-switch-private =
    .label = Private Window

ai-window-toggleview-open-private =
    .label = Open New Private Window

ai-window-toggleview-status-label-active = Smart Window

ai-window-toggleview-status-label-inactive = Classic Window

## Input CTA

aiwindow-input-cta-submit-label-chat = Ask
aiwindow-input-cta-submit-label-navigate = Go
aiwindow-input-cta-submit-label-search = Search
aiwindow-input-cta-submit-label-stop = Stop

# Text announced to screen readers when response generation starts.
aiwindow-generation-started-announcement = Response generation started

aiwindow-input-cta-menu-label-chat = Ask
aiwindow-input-cta-menu-label-navigate = Go to site
# $searchEngineName (string) - The name of the default search engine
aiwindow-input-cta-menu-label-search = Search with { $searchEngineName }
aiwindow-input-cta-menu-label-search-with = Search with…

aiwindow-input-cta-search-submenu-header = Search

## Smartbar

smartbar-placeholder =
    .placeholder = Ask, search, or type a URL

## Mentions

smartbar-mention-typing-placeholder = Tag a tab or site
smartbar-mentions-list-no-results-label = No results found
smartbar-mentions-list-recent-tabs-label = Recent tabs

## Context mentions menu toggle button

smartbar-context-menu-button =
    .aria-label = Add a tab or site
    .tooltiptext = Add a tab or site

## Website Chip

aiwindow-website-chip-placeholder = Tag a tab or site
aiwindow-website-chip-history-deleted = History deleted
aiwindow-website-chip-remove-button =
    .aria-label = Remove

## Firstrun onboarding

aiwindow-firstrun-title = Welcome to Smart Window
aiwindow-firstrun-model-title = What’s important to you?
aiwindow-firstrun-model-subtitle = Pick a model to power Smart Window. Switch anytime.
aiwindow-firstrun-model-fast-label = Fast
aiwindow-firstrun-model-fast-body = Answers quickly
# $model (string) - The name of the AI model
# $ownerName (string) - The name of the model owner/provider
aiwindow-firstrun-model-chip-subtitle = Model { $model } by { $ownerName }
aiwindow-firstrun-model-allpurpose-label = Flexible
aiwindow-firstrun-model-allpurpose-body = Solid fit for most needs
aiwindow-firstrun-model-personal-label = Personal
aiwindow-firstrun-model-personal-body = Most tailored answers
aiwindow-firstrun-button = Let’s go!
aiwindow-firstrun-back-button = Back
aiwindow-firstrun-next-button = Next

## Firstrun memories onboarding

aiwindow-firstrun-memories-title = More helpful answers, on your terms
aiwindow-firstrun-memories-subtitle = Smart Window can learn from your chats, browsing, or both to create memories. They make answers more helpful over time.

aiwindow-firstrun-memories-conversation-title = Keep the conversation going
aiwindow-firstrun-memories-conversation-body = Learning from chats means you’ll have to repeat yourself less.

aiwindow-firstrun-memories-relevance-title = More relevant answers
aiwindow-firstrun-memories-relevance-body = Learning from browsing gives Smart Window the bigger picture.

aiwindow-firstrun-memories-privacy-title = Private by design
aiwindow-firstrun-memories-privacy-body = Memories are stored on this device. Delete or turn off anytime.

aiwindow-firstrun-memories-choose-label = Choose what Smart Window learns from
aiwindow-firstrun-memories-checkbox-chats = Chats in Smart Window
aiwindow-firstrun-memories-checkbox-browsing = Browsing across { -brand-product-name }
aiwindow-firstrun-memories-update-settings = Update in settings anytime.
aiwindow-firstrun-memories-no-create = Got it. Smart Window won’t create memories. Update in settings anytime.

## Firstrun set as default onboarding

aiwindow-firstrun-default-title = Make Smart Window your go-to
aiwindow-firstrun-default-subtitle = Browse, search, and ask in one place. You can still open Private and Classic Windows when you want.
aiwindow-firstrun-default-checkbox-label = Always open { -brand-product-name } in Smart Window
aiwindow-firstrun-default-checkbox-description = Switch in settings anytime

## Ask Toolbar Button

smartwindow-ask-button =
    .label = Ask

## Memories toggle button

aiwindow-memories-on =
    .tooltiptext = Use memories in responses when helpful
    .aria-label = Memories on
aiwindow-memories-off =
    .tooltiptext = Don’t use memories in responses
    .aria-label = Memories off

## New Chat Button

aiwindow-new-chat =
    .tooltiptext = New chat
    .aria-label = New chat

## Close Sidebar Button

aiwindow-close-sidebar =
    .tooltiptext = Close
    .aria-label = Close

## Sign out dialog

fxa-signout-dialog-body-aiwindow = Synced data will remain in your account. Open Smart Windows will switch to Classic Windows.

## Smart Window Toggle Button (in-page)

smartwindow-switch-to-smart-window = Switch to Smart Window

## Fullpage Footer Actions

smartwindow-footer-chats =
    .tooltiptext = Chats
    .aria-label = Chats
    .label = Chats

smartwindow-footer-history =
    .tooltiptext = History
    .aria-label = History
    .label = History

## Disclaimer
## Text displayed to user to warn user about potential mistakes.

smartwindow-disclaimer = AI can make mistakes. <a data-l10n-name="report-link">Report any issues</a>.

## FirefoxView Chats
## Chats in this context refers to chats saved from the Smart Window Assistant

firefoxview-chats-nav = Chats
  .title = Chats
firefoxview-chats-header = Chats

firefoxview-chat-context-delete = Delete from Chats
    .accesskey = D

# Placeholder for the input field to search in open tabs ("search" is a verb).
firefoxview-search-text-box-chats =
  .placeholder = Search chats

## Variables:
##   $date (string) - Date to be formatted based on locale

firefoxview-chat-date-today = Today - { DATETIME($date, dateStyle: "full") }
firefoxview-chat-date-yesterday = Yesterday - { DATETIME($date, dateStyle: "full") }
firefoxview-chat-date-this-month = { DATETIME($date, dateStyle: "full") }
firefoxview-chat-date-prev-month = { DATETIME($date, month: "long", year: "numeric") }

## Message displayed in Firefox View when the user has no chat data

firefoxview-chats-empty-header = Get back to your chats
firefoxview-chats-empty-description = As you use Smart Window, your chats will be saved here.

## Count displayed in fxview chat search results

# Variables:
#   $count (Number) - The number of chats matching the search query.

firefoxview-search-chat-results-count = { $count ->
  [one] { $count } chat
 *[other] { $count } chats
}

## Clear browsing data dialog

item-history-downloads-and-chat =
    .label = Browsing, download, & chat history
    .accesskey = B

item-history-downloads-and-chat-description = Clears site, download, and chat history

## Natural Language Interactions

smart-window-confirm-select-all =
    .aria-label = Select all
    .label = Select all

smart-window-confirm-deselect-all =
    .aria-label = Deselect all
    .label = Deselect all

smart-window-close-confirm =
    .tooltiptext = Close confirm
    .aria-label = Close confirm

smart-window-confirm-close-tab = Close

# Variables
#   $count (number) - Number of tabs to close
smart-window-confirm-close-tabs =
    { $count ->
        [one] Close { $count } tab
       *[other] Close { $count } tabs
    }

## Smart Window new tab promo

smart-window-default-promo-heading = Make Smart Window your default?
smart-window-default-promo-message = { -brand-short-name } will open in Smart Window every time.
smart-window-default-promo-primary-button = Set as default
smart-window-default-promo-additional-button = Not now

## Feedback modal

aiwindow-feedback-modal-title = Share feedback
aiwindow-feedback-what-worked-well = What worked well? No personal info, please.
aiwindow-feedback-choose-any = Choose any that apply
aiwindow-feedback-add-details = Add details if you’d like. No personal info, please.
aiwindow-feedback-disclaimer = Submitting shares your feedback and a few details, like { -brand-shorter-name } version and model used, to help improve Smart Window. <a data-l10n-name="learn-more">Learn more</a>
aiwindow-feedback-submit = Submit
aiwindow-feedback-cancel = Cancel
aiwindow-feedback-reason-incorrect-or-misleading = Incorrect or misleading
aiwindow-feedback-reason-doesnt-address-my-request = Doesn’t address my request
aiwindow-feedback-reason-lacks-personalization = Lacks personalization or context
aiwindow-feedback-reason-performance-or-usability = Performance or usability issue
aiwindow-feedback-reason-harmful-or-offensive = Harmful or offensive
aiwindow-feedback-reason-other = Other
