# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

## Chrome

appmenuitem-new-ai-window =
    .label = New smart window

appmenuitem-new-classic-window =
    .label = New classic window

menu-file-new-ai-window =
    .label = New Smart Window

menu-file-new-classic-window =
    .label = New Classic Window

menu-history-chats =
    .label = Chats

menu-history-chats-recent =
    .label = Recent Chats

smartwindow-document-title = New Tab

## Smart Window Toggle Button

toolbar-button-ai-window-toggle =
    .label = Smart window
    .tooltiptext = Switch between Smart and Classic windows.

ai-window-toggleview-switch-classic =
    .label = Classic Window

ai-window-toggleview-switch-ai =
    .label = Smart Window

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

aiwindow-input-cta-menu-label-chat = Ask
aiwindow-input-cta-menu-label-navigate = Go to site
# $searchEngineName (string) - The name of the default search engine
aiwindow-input-cta-menu-label-search = Search with { $searchEngineName }

## Smartbar

smartbar-placeholder =
    .placeholder = Ask, search, or type a URL

## Mentions

smartbar-mentions-list-no-results-label = No results found
smartbar-mentions-list-recent-tabs-label = Recent tabs

## Context mentions menu toggle button

smartbar-context-menu-button =
    .aria-label = Add a tab or site
    .tooltiptext = Add a tab or site

## Website Chip

aiwindow-website-chip-placeholder = Tag a tab or site
aiwindow-website-chip-remove-button =
    .aria-label = Remove

## Firstrun onboarding

aiwindow-firstrun-title = Welcome to Smart Window
aiwindow-firstrun-model-title = What’s important to you?
aiwindow-firstrun-model-subtitle = Pick a model to power Smart Window. Switch anytime.
aiwindow-firstrun-model-fast-label = Fast
aiwindow-firstrun-model-fast-body = Answers quickly
aiwindow-firstrun-model-allpurpose-label = Flexible
aiwindow-firstrun-model-allpurpose-body = Solid fit for most needs
aiwindow-firstrun-model-personal-label = Personal
aiwindow-firstrun-model-personal-body = Most tailored answers
aiwindow-firstrun-button = Let’s go!

## Ask Toolbar Button

smartwindow-ask-button =
    .label = Ask

## Memories toggle button

aiwindow-memories-on =
    .tooltiptext = Memories on
    .aria-label = Memories on
aiwindow-memories-off =
    .tooltiptext = Memories off
    .aria-label = Memories off

## New Chat Button

aiwindow-new-chat =
    .tooltiptext = New chat
    .aria-label = New chat

## Sign out dialog

fxa-signout-dialog-body-aiwindow = Synced data will remain in your account. Your open Smart Windows will switch to standard windows.

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
