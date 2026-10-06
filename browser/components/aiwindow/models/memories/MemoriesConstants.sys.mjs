/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

export const HISTORY = "history";
export const CONVERSATION = "conversation";
export const ALL_SOURCES = new Set([HISTORY, CONVERSATION]);

/**
 * Memory categories
 */
export const CATEGORIES = "categories";
export const CATEGORIES_LIST = [
  "Arts & Entertainment",
  "Autos & Vehicles",
  "Beauty & Fitness",
  "Books & Literature",
  "Business & Industrial",
  "Computers & Electronics",
  "Food & Drink",
  "Games",
  "Hobbies & Leisure",
  "Home & Garden",
  "Internet & Telecom",
  "Jobs & Education",
  "Law & Government",
  "News",
  "Online Communities",
  "People & Society",
  "Pets & Animals",
  "Real Estate",
  "Reference",
  "Science",
  "Shopping",
  "Sports",
  "Travel & Transportation",
];
export const CATEGORY_TO_ID_PREFIX = {
  "Arts & Entertainment": "arts_entertainment",
  "Autos & Vehicles": "vehicles",
  "Beauty & Fitness": "beauty_fitness",
  "Books & Literature": "books_literature",
  "Business & Industrial": "business_industrial",
  "Computers & Electronics": "computers_electronics",
  "Food & Drink": "food_drink",
  Games: "games",
  "Hobbies & Leisure": "hobbies_leisure",
  "Home & Garden": "home_garden",
  "Internet & Telecom": "internet_telecom",
  "Jobs & Education": "jobs_education",
  "Law & Government": "law_government",
  News: "news",
  "Online Communities": "online_communities",
  "People & Society": "people_society",
  "Pets & Animals": "pets_animals",
  "Real Estate": "real_estate",
  Reference: "reference",
  Science: "science",
  Shopping: "shopping",
  Sports: "sports",
  "Travel & Transportation": "travel_transportation",
};

/**
 * Memory intents
 */
export const INTENTS = "intents";
export const INTENTS_LIST = [
  "Research / Learn",
  "Compare / Evaluate",
  "Plan / Organize",
  "Buy / Acquire",
  "Create / Produce",
  "Communicate / Share",
  "Monitor / Track",
  "Entertain / Relax",
  "Resume / Revisit",
];

// if generate memories is enabled. This is used by
// - MemoriesScheduler
export const PREF_GENERATE_MEMORIES_FROM_HISTORY =
  "browser.smartwindow.memories.generateFromHistory";
export const PREF_GENERATE_MEMORIES_FROM_CONVERSATION =
  "browser.smartwindow.memories.generateFromConversation";

// Number of latest sessions to check drift
export const DRIFT_EVAL_DELTA_COUNT = 3;

// Quantile of baseline scores used as a threshold (e.g. 0.9 => 90th percentile).
export const DRIFT_TRIGGER_QUANTILE = 0.9;

// Important! Changing or removing this value requires a security review.
//
// Memories are generated from conversations that may contain private and untrusted content.
// However, memories are easily applied to conversations, and if they are marked with untrusted
// content flags then some tool calls may no longer be allowed for that conversation. In order to
// relax this restriction, we enforce a limit for each memory to be no larger than 100 characters.
// This limits the potential for prompt injection. The memories are already told to be short by the
// model requiring 4-10 words, but this programmatic check ensures that memories adhere to these
// requirements.
export const MAX_MEMORY_SUMMARY_LENGTH = 100;
