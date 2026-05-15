/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

export const initialMemoriesGenerationSystemPromptMetadata = {
  version: "0.1",
};

export const initialMemoriesGenerationSystemPrompt =
  "You are a privacy respecting data analyst who tries to generate useful memories about user preferences EXCLUDING personal, medical, health, financial, political, religion, private and any sensitive activities of users. Return ONLY valid JSON.";

export const initialMemoriesGenerationPromptMetadata = {
  version: "0.1",
};

export const initialMemoriesGenerationPrompt = `
# Overview
You are an expert at extracting memories from user browser data. A memory is a short, concise statement about user interests or behaviors (products, brands, behaviors) that can help personalize their experience.

You will receive lists of data representing the user's browsing history, search history, and chat history. Use ONLY this data to generate memories.

# Instructions
- Extract up as many memories as you can.
- Each memory must be supported by 3 or more user records. ONLY USE VERBATIM STRINGS FROM THE USER RECORDS!
- Memories are user preferences (products, brands, behaviors) useful for future personalization.
- Do not imagine actions without evidence. Prefer "shops for / plans / looked for" over "bought / booked / watched" unless explicit.
- Do not include personal names unless widely public (avoid PII).
- Base memories on patterns, not single instances. A pattern is 3 or more similar user records.

## Exemplars
Below are examples of high quality memories (for reference only; do NOT copy):
- "Prefers LLBean & Nordstrom formalwear collections"
- "Compares white jeans under $80 at Target"
- "Streams new-release movies via Fandango"
- "Cooks Mediterranean seafood from TasteAtlas recipes"
- "Tracks minimalist fashion drops at Uniqlo"

## Category rules
Every memory requires a category. Choose ONLY one from this list; if none fits, use null:
{categoriesList}

## Intent rules
Every memory requires an intent. Choose ONLY one from this list; if none fits, use null:
{intentsList}

# Output Schema

## Scoring guidelines
Each output object must include a score for the memory. Adhere to these guidelines to compute the score:
- Base "score" on *strength + recency*; boost multi-source corroboration.
- Source priority: user (highest) > chat > search > history (lowest).
- Typical caps: recent history ≤1; search up to 2; multi-source 2-3; recent chat 4; explicit user 5.
- Do not assign 5 unless pattern is strong and recent.

Return ONLY a JSON array of objects, no prose, no code fences. Each object must have:
\`\`\`json
[
  {
    "evidence": [
      {
        "value": "<a **unique, verbatim** string copied from user records>",
        "weight": "<a score from 1-10 representing the contribution of the evidence to the memory's pattern. To compute this, take into consideration both the record's Imporance Score and its contribution towards a clear, unique, and high value pattern of activity (i.e. high similarity to other records).>",
        "type": "<one of ["title","search","chat","user"] depending on from which list the evidence was pulled>"
      },
      ...
    ],
    "reasoning": "<1 to 2 sentences briefly explaining the rationale for the new memory, specifically referencing why the selected evidence constitutes a clear, unique, and high value pattern and justifying the assigned score",
    "category": "<one of the categories or null>",
    "intent": "<one of the intents or null>",
    "memory_summary": "<4-10 words, crisp and specific or null>",
    "score": <integer 1-5>
  },
  ...
]
\`\`\`

# Inputs
Analyze the records below to generate as many unique, non-sensitive, specific user memories as possible.
When selecting a record, consider its Importance Score and its contribution to a clear, unique, and high value pattern of activity. High Importance Scores indicate high value, **recent** records. Records with low relative Importance Scores and/or do not contribute to clear patterns are low value and should be ignored.
Only evaluate the value of an Importance Score within its own tables (i.e. Website Titles OR Web Searches, etc.).
ONLY USE EACH RECORD FOR A SINGLE MEMORY. DO NOT USE A RECORD AS EVIDENCE FOR MULTIPLE MEMORIES.

{profileRecordsRenderedStr}

** CREATE ALL POSSIBLE UNIQUE MEMORIES WITHOUT VIOLATING THE RULES ABOVE **`.trim();

export const memoriesDeduplicationSystemPromptMetadata = {
  version: "0.1",
};

export const memoriesDeduplicationSystemPrompt =
  "You are an expert at identifying duplicate statements. Return ONLY valid JSON.";

export const memoriesDeduplicationPromptMetadata = {
  version: "0.1",
};

export const memoriesDeduplicationPrompt = `
You are an expert at identifying duplicate statements.

Examine the following list of statements and find the unique ones. If you identify a set of statements that express the same general idea, pick the most general one from the set as the "main memory" and mark the rest as duplicates of it.

There are 2 lists of statements: Existing Statements and New Statements. If you find a duplicate between the 2, **ALWAYS** pick the Existing Statement as the "main memory".

If all statements are unique, simply return them all.

## Existing Statements:
{existingMemoriesList}

## New Statements:
{newMemoriesList}

Return ONLY JSON per the schema below.
\`\`\`json
{
  "unique_memories": [
    {
      "main_memory": "<the main unique memory statement>",
      "duplicates": [
        "<duplicate_statement_1>",
        "<duplicate_statement_2>",
        ...
      ]
    },
    ...
  ]
}
\`\`\``.trim();

export const memoriesSensitivityFilterSystemPromptMetadata = {
  version: "0.1",
};

export const memoriesSensitivityFilterSystemPrompt =
  "You are an expert at identifying sensitive statements and content. Return ONLY valid JSON.";

export const memoriesSensitivityFilterPromptMetadata = {
  version: "0.1",
};

export const memoriesSensitivityFilterPrompt = `
You are an expert at identifying sensitive statements and content.

Examine the following list of statements and filter out any that contain sensitive information or content.
Sensitive information includes, but is not limited to:

- Medical/Health: diagnoses, symptoms, treatments, conditions, mental health, pregnancy, fertility, contraception.
- Finance: income/salary/compensation, bank/credit card details, credit score, loans/mortgage, taxes/benefits, debt/collections, investments/brokerage.
- Legal: lawsuits, settlements, subpoenas/warrants, arrests/convictions, immigration status/visas/asylum, divorce/custody, NDAs.
- Politics/Demographics/PII: political leaning/affiliation, religion, race/ethnicity, gender/sexual orientation, addresses/phones/emails/IDs.

Below are exemplars of sensitive statements:
- "Researches treatment about arthritis"
- "Searches about pregnancy tests online"
- "Pediatrician in San Francisco"
- "Political leaning towards a party"
- "Research about ethnicity demographics in a city"
- "Negotiates debt settlement with bank"
- "Prepares documents for divorce hearing"
- "Tracks mortgage refinance rates"
- "Applies for work visa extension"
- "Marie, female from Ohio looking for rental apartments"

If all statements are not sensitive, simply return them all.

Here are the statements to analyze:
{memoriesList}

Return ONLY JSON per the schema below.
\`\`\`json
{
  "non_sensitive_memories": [
    "<memory_statement_1>",
    "<memory_statement_2>",
    ...
  ]
}
\`\`\``.trim();

export const messageMemoryClassificationSystemPromptMetadata = {
  version: "0.1",
};

export const messageMemoryClassificationSystemPrompt =
  "Classify the user's message into one more more high-level Categories and Intents. Return ONLY valid JSON per schema.";

export const messageMemoryClassificationPrompt = `
{message}

Pick Categories from:
{categories}

Pick Intents from:
{intents}

Guidance:
- Choose the most directly implied category/intent.
- If ambiguous, pick the closest likely choice.
- Keep it non-sensitive and general; do NOT fabricate specifics.

Return ONLY JSON per the schema below.
\`\`\`json
{
  "categories": ["<category 1>", "<category 2>", ...],
  "intents": ["<intent 1>", "<intent 2>", ...]
}
\`\`\``.trim();

export const relevantMemoriesContextPromptMetadata = {
  version: "0.1",
};

export const relevantMemoriesContextPrompt = `
# Existing Memories

Below is a list of existing memory texts with their unique IDs:

{relevantMemoriesList}

Use them to personalized your response using the following guidelines:

1. Consider the user message below
2. Choose SPECIFIC and RELEVANT memories from the list above to personalize your response to the user
3. Tag the IDs of the SPECIFIC memories you selected BEFORE your response using the format \`§existing_memory: memory ID§\`
4. When writing your response to the user message, INTEGRATE ONLY memory text of those SPECIFIC memories into your response to make it more helpful and tailored. NEVER integrate the memory ID ANYWHERE in your response; it must ALWAYS be before using the format \`§existing_memory: memory ID§\`

NEVER tag memories you DID NOT USE in your response.
NEVER cite memory IDs anywhere other than BEFORE your response using the \`§existing_memory: memory ID§\ format`.trim();
