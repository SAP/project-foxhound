# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

## Generative AI (GenAI) Settings section

genai-settings-chat-description = Adds the chatbot of your choice to the sidebar, for quick access as you browse. <a data-l10n-name="connect">Share feedback</a>
genai-settings-chat-choose = Choose a chatbot
genai-settings-chat-choose-one-menuitem =
    .label = Choose one
genai-settings-chat-links = When you choose a chatbot, you agree to the provider’s terms of use and privacy policy.
genai-settings-chat-chatgpt-links = By choosing ChatGPT, you agree to the OpenAI <a data-l10n-name="link1">Terms of Use</a> and <a data-l10n-name="link2">Privacy Policy</a>.
genai-settings-chat-claude-links = By choosing Anthropic Claude, you agree to the Anthropic <a data-l10n-name="link1">Consumer Terms of Service</a>, <a data-l10n-name="link2">Usage Policy</a>, and <a data-l10n-name="link3">Privacy Policy</a>.
genai-settings-chat-copilot-links = By choosing Copilot, you agree to the <a data-l10n-name="link1">Copilot AI Experiences Terms</a> and <a data-l10n-name="link2">Microsoft Privacy Statement</a>.
genai-settings-chat-gemini-links = By choosing Google Gemini, you agree to the <a data-l10n-name="link1">Google Terms of Service</a>, <a data-l10n-name="link2">Generative AI Prohibited Use Policy</a>, and <a data-l10n-name="link3">Gemini Apps Privacy Notice</a>.
genai-settings-chat-huggingchat-links = By choosing HuggingChat, you agree to the <a data-l10n-name="link1">HuggingChat Privacy Notice</a> and <a data-l10n-name="link2">Hugging Face Privacy Policy</a>.
genai-settings-chat-lechat-links = By choosing Le Chat Mistral, you agree to the Mistral AI <a data-l10n-name="link1">Terms of Service</a> and <a data-l10n-name="link2">Privacy Policy</a>.
genai-settings-chat-localhost-links = Bring your own private local chatbot such as <a data-l10n-name="link1">llamafile</a> from { -vendor-short-name }’s Innovation group.
genai-settings-chat-shortcuts =
    .description = Displays a shortcut to prompts when you select text. { -brand-short-name } sends the text, page title, and prompt to the chatbot.
    .label = Show prompts on text select

## Chatbot prompts
## Prompts are plain language ‘instructions’ sent to a chatbot.
## These prompts have been made concise and direct in English because some chatbot providers
## have character restrictions and being direct reduces the chance for misinterpretation.
## When localizing, please be concise and direct, but not at the expense of losing meaning.

# This prompt is added to the beginning of selection prompts sent to a chatbot.
# $tabTitle (string) - title of the webpage
# $selection (string) - selected text
genai-prompt-prefix-selection = I’m on page “{ $tabTitle }” with “{ $selection }” selected.

# Prompt purpose: help users understand what a selection covers at a glance
genai-prompts-summarize =
    .label = Summarize
    .value = Please summarize the selection using precise and concise language. Use headers and bulleted lists in the summary, to make it scannable. Maintain the meaning and factual accuracy.
# Prompt purpose: make a selection easier to read
genai-prompts-simplify =
    .label = Simplify language
    .value = Please rewrite the selection using short sentences and simple words. Maintain the meaning and factual accuracy.
# Prompt purpose: test understanding of selection in an interactive way
genai-prompts-quiz =
    .label = Quiz me
    .value = Please quiz me on this selection. Ask me a variety of types of questions, for example multiple choice, true or false, and short answer. Wait for my response before moving on to the next question.
# Prompt purpose: helps users understand words, phrases, concepts
genai-prompts-explain =
    .label = Explain this
    .value = Please explain the key concepts in this selection, using simple words. Also, use examples.

## Chatbot menu shortcuts

genai-menu-ask-generic =
    .label = Ask AI chatbot
# $provider (string) - name of the provider
genai-menu-ask-provider =
    .label = Ask { $provider }

genai-input-ask-generic =
    .placeholder = Ask AI chatbot…
# $provider (string) - name of the provider
genai-input-ask-provider =
    .placeholder = Ask { $provider }…

genai-shortcuts-hide =
    .label = Hide chatbot shortcut

## Chatbot header

genai-chatbot-title = AI chatbot
genai-header-provider-menu =
    .title = Choose a chatbot
genai-header-options-button =
    .title = Open menu
genai-header-close-button =
    .title = Close

genai-provider-view-details =
    .label = View chatbot details
genai-provider-about-chatbots =
    .label = About these chatbots
genai-options-reload-generic =
    .label = Reload AI chatbot
# $provider (string) - name of the provider
genai-options-reload-provider =
    .label = Reload { $provider }
genai-options-show-shortcut =
    .label = Show shortcut when selecting text
genai-options-hide-shortcut =
    .label = Hide shortcut when selecting text
genai-options-about-chatbot =
    .label = About AI chatbots in { -brand-short-name }

## Chatbot onboarding

genai-onboarding-header = Summarize, brainstorm, and more as you browse
# "Switch anytime" refers to allowing the user to switch to a different chatbot.
genai-onboarding-description = Choose an AI chatbot to use in the { -brand-short-name } sidebar. We’ll show details about each chatbot when you select it. Switch anytime. <a data-l10n-name="learn-more">Learn more</a>
genai-onboarding-primary = Continue
genai-onboarding-secondary = Close
genai-onboarding-claude-tooltip =
    .title = Anthropic Claude
genai-onboarding-claude-learn = Learn more about Claude
genai-onboarding-chatgpt-tooltip =
    .title = ChatGPT
genai-onboarding-chatgpt-learn = Learn more about ChatGPT
genai-onboarding-copilot-tooltip =
    .title = Copilot
genai-onboarding-copilot-learn = Learn more about Copilot
genai-onboarding-gemini-tooltip =
    .title = Google Gemini
genai-onboarding-gemini-learn = Learn more about Gemini
genai-onboarding-huggingchat-tooltip =
    .title = HuggingChat
genai-onboarding-huggingchat-learn = Learn more about HuggingChat
genai-onboarding-lechat-tooltip =
    .title = Le Chat Mistral
genai-onboarding-lechat-learn = Learn more about Le Chat

genai-onboarding-select-header = Select text to see suggestions
genai-onboarding-select-description = When you select text, we’ll suggest prompts you can send to the chatbot. You can also write in your own prompts.
genai-onboarding-select-primary = Start chatting

## Chatbot onboarding choices
## These describe features/capabilities of chatbot providers. These are not buttons/actions.

genai-onboarding-claude-generate = Generate text and code
genai-onboarding-claude-analyze = Analyze documents and images
genai-onboarding-claude-price = Free and paid options; account required
genai-onboarding-chatgpt-generate = Generate text, images, and code
genai-onboarding-chatgpt-analyze = Analyze documents and images
genai-onboarding-chatgpt-price = Free and paid options; account required for some countries and tasks
genai-onboarding-copilot-generate = Generate text, images, and code
genai-onboarding-copilot-analyze = Analyze images
genai-onboarding-copilot-price = Free and paid options; account required for some tasks
genai-onboarding-gemini-generate = Generate text, images, and code
genai-onboarding-gemini-analyze = Analyze images (free) and documents (paid)
genai-onboarding-gemini-price = Free and paid options; account required
genai-onboarding-huggingchat-generate = Generate text and code
genai-onboarding-huggingchat-switch = Switch between a diverse set of open models
genai-onboarding-huggingchat-price-2 = Free; account required after a certain number of requests
genai-onboarding-lechat-generate = Generate text and code
genai-onboarding-lechat-price = Free; account required
