/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Detects and filters sensitive personal information from text
 *
 * Detects:
 * - Government IDs (SSN, SIN)
 * - Financual information (credit cards, bank accounts, routing numbers)
 * - Contact information (email, phone number)
 * - Network Identifiers (IP addresses, MAC addresses)
 * - Physical addresses
 *
 */
import { CreditCard } from "resource://gre/modules/CreditCard.sys.mjs";

const SENSITIVE_KEYWORDS = {
  medical: [
    "diagnosis",
    "symptom",
    "treatment",
    "condition",
    "disease",
    "illness",
    "medical",
    "doctor",
    "physician",
    "hospital",
    "clinic",
    "prescription",
    "medication",
    "therapy",
    "therapist",
    "mental health",
    "depression",
    "anxiety",
    "ptsd",
    "adhd",
    "autism",
    "pregnancy",
    "pregnant",
    "fertility",
    "contraception",
    "abortion",
    "miscarriage",
    "cancer",
    "diabetes",
    "hiv",
    "aids",
    "std",
    "addiction",
    "rehab",
    "surgery",
    "emergency room",
    "psychiatrist",
    "psychologist",
  ],
  finance: [
    "salary",
    "income",
    "wage",
    "compensation",
    "paycheck",
    "bank account",
    "routing number",
    "credit score",
    "fico",
    "loan",
    "mortgage",
    "foreclosure",
    "debt",
    "bankruptcy",
    "collection",
    "tax",
    "irs",
    "audit",
    "investment",
    "portfolio",
    "brokerage",
    "401k",
    "ira",
    "retirement account",
    "net worth",
    "credit report",
    "payday loan",
    "refinance",
  ],
  legal: [
    "lawsuit",
    "litigation",
    "settlement",
    "subpoena",
    "warrant",
    "arrest",
    "conviction",
    "criminal",
    "felony",
    "misdemeanor",
    "court",
    "trial",
    "hearing",
    "immigration",
    "visa",
    "green card",
    "asylum",
    "deportation",
    "divorce",
    "custody",
    "restraining order",
    "nda",
    "non-disclosure",
    "attorney",
    "lawyer",
    "legal counsel",
    "indictment",
    "probation",
    "parole",
  ],
  political: [
    "democrat",
    "republican",
    "liberal",
    "conservative",
    "progressive",
    "libertarian",
    "socialist",
    "communist",
    "fascist",
    "vote",
    "voting",
    "election",
    "campaign",
    "ballot",
    "political party",
    "leftist",
    "right-wing",
    "left-wing",
  ],
  religion: [
    "religion",
    "religious",
    "catholic",
    "protestant",
    "muslim",
    "islamic",
    "jewish",
    "judaism",
    "christian",
    "christianity",
    "buddhist",
    "buddhism",
    "hindu",
    "hinduism",
    "atheist",
    "atheism",
    "agnostic",
    "mosque",
    "church",
    "temple",
    "synagogue",
    "spiritual",
    "faith",
    "prayer",
  ],
  demographics: [
    "race",
    "ethnicity",
    "racial",
    "ethnic",
    "sexual orientation",
    "gender identity",
    "transgender",
    "lgbtq",
    "lgbt",
    "gay",
    "lesbian",
    "bisexual",
    "queer",
    "non-binary",
    "cisgender",
  ],
};

const PATTERNS = {
  ssn: {
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
    name: "ssn",
    description: "US Social Security Number",
  },
  sin: {
    regex: /\b\d{3}-\d{3}-\d{3}\b/g,
    name: "sin",
    description: "Canadian Social Insurance Number",
  },
  email: {
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    name: "email",
    description: "Email address",
  },
  phone: {
    regex:
      /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/g,
    name: "phone",
    description: "Phone number",
  },
  creditCard: {
    regex: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    name: "creditCard",
    description: "Credit card number",
    validator: validateCreditCard,
  },
  ipv4: {
    regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    name: "ipv4",
    description: "IPv4 address",
    validator: isPublicIPv4,
  },
  ipv6: {
    regex: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,
    name: "ipv6",
    description: "IPv6 address",
  },
  macAddress: {
    regex: /\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/g,
    name: "macAddress",
    description: "MAC address",
  },
  streetAddress: {
    regex:
      /\b\d+\s+[A-Za-z0-9\s]+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir|Way|Place|Pl)\.?\b/gi,
    name: "streetAddress",
    description: "Street address",
  },
  poBox: {
    regex: /\b(?:P\.?\s*O\.?|Post\s+Office)\s+Box\s+\d+\b/gi,
    name: "poBox",
    description: "PO Box address",
  },
  routingNumber: {
    regex: /\b\d{9}\b/g,
    name: "routingNumber",
    description: "Bank routing number",
    validator: validateRoutingNumber,
  },
};

/**
 * Validate credit card number
 *
 * @param {string} cardNumber
 * @returns {boolena} - True if valid credit card number
 */
function validateCreditCard(cardNumber) {
  return CreditCard.isValidNumber(cardNumber);
}

/**
 * Check if IPv4 address is public (not private / local)
 *
 * @param {string} ip - IPv4 address
 * @returns {boolean} - True if public IP
 */
function isPublicIPv4(ip) {
  const parts = ip.split(".").map(Number);

  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return false;
  }

  const [a, b] = parts;

  if (
    a === 10 || // 10.0.0.0/8 (private class A)
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12 (private class B)
    (a === 192 && b === 168) || // 192.168.0.0/16 (private class C)
    a === 127 || // 127.0.0.0/8 (loopback)
    (a === 169 && b === 254) || // 169.254.0.0/16 (link-local)
    a === 0 // 0.0.0.0/8 (Current network)
  ) {
    return false;
  }

  return true;
}

/**
 * Validate routing number using checksum algorithm.
 *
 * logic based on https://en.wikipedia.org/wiki/Routing_transit_number#Check_digit
 *
 * @param {string} routingNumber - 9-digit routing number
 * @returns {boolean} - True if valid routing number
 */
function validateRoutingNumber(routingNumber) {
  if (!/^\d{9}$/.test(routingNumber)) {
    return false;
  }

  const digits = routingNumber.split("").map(Number);
  const checksum =
    3 * (digits[0] + digits[3] + digits[6]) +
    7 * (digits[1] + digits[4] + digits[7]) +
    (digits[2] + digits[5] + digits[8]);

  return checksum % 10 === 0;
}

/**
 *
 */
export class SensitiveInfoDetector {
  constructor() {
    this.patterns = PATTERNS;
  }

  /**
   * Check if text contains any sensitive information.
   *
   * @param {string} text - Text to check
   * @returns {boolen} - True if sensitive info found
   */
  containsSensitiveInfo(text) {
    if (!text || typeof text !== "string") {
      return false;
    }

    for (const pattern of Object.values(this.patterns)) {
      const regex = new RegExp(pattern.regex);
      const matches = text.match(regex);

      if (matches) {
        if (pattern.validator) {
          for (const match of matches) {
            if (pattern.validator(match)) {
              return true;
            }
          }
        } else {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if text contains sensitive keywords related to medical, financial,
   * legal, political, religious, or demographic topics.
   *
   * @param {string} text - Text to check
   * @returns {boolean} - True if sensitive keywords found
   */
  containsSensitiveKeywords(text) {
    if (!text || typeof text !== "string") {
      return false;
    }

    const lowerText = text.toLowerCase();

    for (const category of Object.values(SENSITIVE_KEYWORDS)) {
      for (const keyword of category) {
        let pattern;
        if (keyword.endsWith("y")) {
          const stem = keyword.slice(0, -1);
          pattern = new RegExp(`\\b(?:${keyword}(?:e?s)?|${stem}ies)\\b`, "i");
        } else {
          pattern = new RegExp(`\\b${keyword}(?:e?s)?\\b`, "i");
        }
        if (pattern.test(lowerText)) {
          return true;
        }
      }
    }

    return false;
  }
}
