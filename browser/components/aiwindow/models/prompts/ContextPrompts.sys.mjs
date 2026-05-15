/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export const realTimeContextDatePrompt = `# Real Time Browser Context

Below are some real-time context details you can use to inform your response.

- Locale: {locale}
- Timezone: {timezone}
- Current date & time in ISO format: {isoTimestamp}
- Today's date: {todayDate}
`;

export const realTimeContextTabPrompt = `

## Active browser tab data

Current active browser tab details appear below. If the current active browser tab is relevant to the user's query, use the 'get_page_content' tool to view the page before responding. 

Active tab:
- URL: {url}
- Title: {title}
- Description: {description}`;

export const realTimeContextMentionsPrompt = `

# User-Selected Tabs Context

Below you will find a list of open tabs that the user has selected for you to consider as context when responding to their query. Use the 'get_page_content' tool to view the page the content of any of the pages listed.

User-selected tabs:
{contextUrls}`;
