# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

preferences-ai-controls-block-confirmation-smart-window = Smart Window
smart-window-block-title = Block Smart Window?
smart-window-block-description-both = This will delete your Smart Window chats and memories.
smart-window-block-description-chats = This will delete your Smart Window chats.
smart-window-block-description-memories = This will delete your Smart Window memories.

ai-window-features-group =
    .label = Smart Window
    .description = Ask questions, compare pages, and get personalized suggestions with a built-in assistant.

smart-window-select-label =
    .label = Smart Window

ai-window-activate-link =
    .label = Get started

ai-window-personalize-button =
    .label = Smart Window settings

ai-window-personalize-header =
    .heading = Smart Window

ai-window-default-section =
    .label = Default settings
ai-window-is-default-window =
    .label = Use Smart Window by default
    .description = Open Smart Window when {-brand-short-name} starts, restarts, or opens links from other apps.
ai-window-open-sidebar =
    .label = Open assistant automatically
    .description = Show the assistant sidebar on each new tab. Close it anytime.
ai-window-smart-cursor-in-smart-window =
    .label = Show shortcuts when selecting text
    .description = Get quick access to summarize, explain, and more.

smart-window-model-section =
    .label = Assistant model
    .description = Choose a model based on what’s important to you.
smart-window-model-learn-link = Learn about models

## Variables:
##   $model (string) - The name of the AI model
##   $ownerName (String) - The name of owner of the AI model

smart-window-model-fast =
    .label = Fast: Answers quickly
    .description = Model { $model } by { $ownerName }
smart-window-model-flexible =
    .label = Flexible: Solid fit for most needs
    .description = Model { $model } by { $ownerName }
smart-window-model-personal =
    .label = Personal: Most tailored answers
    .description = Model { $model } by { $ownerName }
smart-window-model-custom =
    .label = Custom: Use your own LLM
smart-window-model-custom-name =
    .label = Model name
    .placeholder = Example: glm4
smart-window-model-custom-url =
    .label = Model endpoint
    .placeholder = Example: http://localhost:11434/v1
smart-window-model-custom-token =
    .label = API key or auth token, if required
smart-window-model-custom-info =
    .message = When you use a custom model, Smart Window may not work as expected.
smart-window-model-custom-more-link = More about custom models
smart-window-model-custom-save =
    .label = Save
smart-window-model-custom-save-confirmation = Model details saved. Start a new chat to test.

ai-window-memories-section =
    .label = Memories
    .description = { -brand-short-name } can learn from your activity to create memories. They’re used to help personalize responses and are stored locally on this device.

ai-window-learn-from-chat-activity =
    .label = Learn from chats in Smart Window

ai-window-learn-from-browsing-activity =
    .label = Learn from browsing in Classic and Smart Windows

ai-window-manage-memories-button =
    .label = Manage memories

ai-window-manage-memories-header =
    .heading = Manage memories
    .description = Memories are stored locally on this device to help protect your privacy. They refresh a few times a day while you use Smart Window, so recent activity may take time to be reflected.

ai-window-no-memories =
    .label = No memories yet
    .description = As Smart Window learns from your activity, you’ll see memories here.

ai-window-no-memories-learning-off =
    .label = No memories to show
    .description = Learning from activity is off, so Smart Window isn’t creating memories.

ai-window-delete-all-memories-button =
    .label = Delete all

ai-window-delete-all-memories-title = Delete all memories?
ai-window-delete-all-memories-message = Existing memories will be deleted. If you don’t want any new memories created, uncheck the options to “Learn from…” in Smart Window settings.
ai-window-delete-all-memories-confirm = Delete
ai-window-delete-all-memories-cancel = Cancel

# Variables:
#   $label (String) - The memory summary text that will be deleted
ai-window-memory-delete-button =
    .title = Delete memory
    .aria-label = Delete { $label }
