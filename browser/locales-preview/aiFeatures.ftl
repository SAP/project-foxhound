# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

ai-window-features-group =
    .label = Smart Window
    .description = Ask questions, compare pages, and more in a separate window with a built-in assistant. Smart Window can learn as you browse, for a more personalized experience.

ai-window-activate-link =
    .label = Get started

ai-window-personalize-button =
    .label = Personalize Smart Window

ai-window-personalize-header =
    .heading = Smart Window

smart-window-model-section =
    .label = Assistant model
    .description = Choose a model based on what’s important to you.
smart-window-model-learn-link = Learn about models

## Variables:
##   $modelName (String) - The name of the AI model

smart-window-model-fast =
    .label = Fast: Answers quickly
    .description = { $modelName }
smart-window-model-flexible =
    .label = Flexible: Solid fit for most needs
    .description = { $modelName }
smart-window-model-personal =
    .label = Personal: Most tailored answers
    .description = { $modelName }
smart-window-model-custom =
    .label = Custom: Use your own LLM
smart-window-model-custom-name =
    .label = Model name
    .placeholder = Example: glm4
smart-window-model-custom-url =
    .label = Model endpoint
    .placeholder = Example: http://localhost:11434/v1/chat/completions
smart-window-model-custom-token =
    .label = API key or auth token, if required
smart-window-model-custom-help =
    .message = Heads up! When you use a custom model, Smart Window may not work as expected.
smart-window-model-custom-more-link = More about custom models
smart-window-model-custom-save =
    .label = Save

ai-window-memories-section =
    .label = Memories
    .description = Manage what Smart Window learns from your activity.

ai-window-learn-from-activity =
    .label = Learn from your activity
    .description = Smart Window can use your browsing and chat activity to create memories and personalize responses.

ai-window-manage-memories-button =
    .label = Manage memories

ai-window-manage-memories-header =
    .heading = Manage memories
    .description = Memories are what Smart Window learns from your activity.

ai-window-no-memories =
    .label = No memories yet
    .description = As Smart Window learns from your activity, you’ll see memories here.

ai-window-no-memories-learning-off =
    .label = No memories to show
    .description = Learning from activity is off, so Smart Window isn’t creating memories.

ai-window-delete-all-memories-button =
    .label = Delete all

ai-window-delete-all-memories-title = Delete all memories?
ai-window-delete-all-memories-message = This also prevents Smart Window from creating similar memories later. If you don’t want Smart Window to learn from your activity anymore, you can turn this off in settings.
ai-window-delete-all-memories-confirm = Delete
ai-window-delete-all-memories-cancel = Cancel

# Variables:
#   $label (String) - The memory summary text that will be deleted
ai-window-memory-delete-button =
    .title = Delete memory
    .aria-label = Delete { $label }
