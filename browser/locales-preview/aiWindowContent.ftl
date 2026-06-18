# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

smartwindow-messages-document-title = Smart window chat messages

## Error messages in the chat content

smartwindow-assistant-error-generic-header = Something went wrong. Please try again.
smartwindow-assistant-error-budget-header = You’ve reached today’s chat limit.
smartwindow-assistant-error-account-header = To use Smart Window, you’ll need to sign in.
smartwindow-assistant-error-capacity-header = Smart Window is at capacity right now. Please try again later.

## TODO: ET timezone should be replaced before rolling to other locales: https://bugzilla.mozilla.org/show_bug.cgi?id=2017944

smartwindow-assistant-error-budget-body = You can still browse in this window. Chat will be available again after midnight ET.
smartwindow-assistant-error-many-requests-header = Please wait a moment and try again. Too many messages were sent in a short time.
smartwindow-assistant-error-max-length-header = It’s time to start a new chat. This one’s reached its length limit.
smartwindow-assistant-error-page-content-header = This request didn’t go through because something in the page or your message was flagged as potentially unsafe. Try a different request.
# Variables:
#   $status (Number) - HTTP status code returned by the inference back-end
smartwindow-assistant-error-http-header = Server error (HTTP { $status }). Please try again.
smartwindow-retry-btn = Try Again
smartwindow-clear-btn = New chat
smartwindow-signin-btn = Sign in

## Assistant Message footer

aiwindow-memories-used = Memories used
aiwindow-memories-callout-description = Memories helped personalize this response.
aiwindow-memories-learn-more = Learn more
aiwindow-manage-memories =
    .label = Memory settings
aiwindow-retry-without-memories =
    .label = Retry without memories
aiwindow-retry =
  .tooltiptext = Retry
  .aria-label = Retry
aiwindow-copy-message =
    .tooltiptext = Copy
    .aria-label = Copy message
aiwindow-thumbs-up =
    .tooltiptext = Share positive feedback
    .aria-label = Share positive feedback
aiwindow-thumbs-down =
    .tooltiptext = Share negative feedback
    .aria-label = Share negative feedback
aiwindow-applied-memories-popover =
    .aria-label = Memories panel
aiwindow-applied-memories-list =
    .aria-label = Memories

## Jump to Bottom Button

aiwindow-jump-to-bottom =
    .tooltiptext = Jump to bottom
    .aria-label = Jump to bottom of chat

## Natural Language Action

smartwindow-nl-retry-tool-button =
    .label = Retry

smartwindow-nl-retry-message = If you still want to close tabs, choose <strong>Retry</strong> and make your selection in the card that opens.

smartwindow-nl-thinking = Looking for matching tabs…
smartwindow-nl-undo-button =
    .label = Undo

## Variables
##   $count (number) - Number of tabs closed/restored

smart-window-closed-tabs-label =
    { $count ->
        [one] Closed { $count } tab
       *[other] Closed { $count } tabs
    }
smart-window-closed-tabs-summary =
    { $count ->
        [one] Done! Tab closed.
       *[other] Done! Tabs closed.
    }
smart-window-closed-tabs-row-label = Closed tabs
smart-window-closed-and-restored-label = Closed and restored tabs
smart-window-restored-row-label =
    { $count ->
        [one] Restored { $count } tab
       *[other] Restored { $count } tabs
    }
smart-window-restore-success-summary =
    { $count ->
        [one] Tab closed, then restored.
       *[other] Tabs closed, then restored.
    }
smart-window-cancelled-label = Request cancelled.

## Action log

action-log-searching-tabs = Searching tabs
action-log-searched-open-tabs = Searched open tabs
action-log-searching-history = Searching history
action-log-searched-history = Searched history
action-log-reading-page = Reading page
action-log-read-page = Read page content
action-log-searching-web = Searching the web
action-log-searched-web = Searched the web
action-log-checking-memories = Checking memories
action-log-checked-memories = Checked memories
action-log-searching-settings = Searching settings
action-log-searched-settings = Searched settings
action-log-searching-world-cup-matches = Searching World Cup matches
action-log-searched-world-cup-matches = Searched World Cup matches
action-log-checking-world-cup-live = Checking live World Cup matches
action-log-checked-world-cup-live = Checked live World Cup matches

# Variables
#   $count (Number) - how many tool steps completed in the turn
action-log-completed-steps =
    { $count ->
        [one] Completed 1 step
       *[other] Completed { $count } steps
    }
