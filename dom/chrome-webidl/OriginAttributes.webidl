/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Used by principals and the script security manager to represent origin
 * attributes. The first dictionary is designed to contain the full set of
 * OriginAttributes, the second is used for pattern-matching (i.e. does this
 * OriginAttributesDictionary match the non-empty attributes in this pattern).
 *
 * IMPORTANT: If you add any members here, you need to do the following:
 * (1) Add them to both dictionaries.
 * (2) Update the methods on mozilla::OriginAttributes, including equality,
 *     serialization, deserialization, and inheritance.
 * (3) Update the methods on mozilla::OriginAttributesPattern, including matching.
 */
[GenerateInitFromJSON, GenerateEqualityOperator]
dictionary OriginAttributesDictionary {
  unsigned long userContextId = 0;
  unsigned long privateBrowsingId = 0;
  DOMString firstPartyDomain = "";
  DOMString geckoViewSessionContextId = "";
  DOMString partitionKey = "";
};

[GenerateInitFromJSON, GenerateToJSON]
dictionary OriginAttributesPatternDictionary {
  unsigned long userContextId;
  unsigned long privateBrowsingId;
  DOMString firstPartyDomain;
  DOMString geckoViewSessionContextId;
  // partitionKey takes precedence over partitionKeyPattern.
  DOMString partitionKey;
  PartitionKeyPatternDictionary partitionKeyPattern;
};

dictionary PartitionKeyPatternDictionary {
  DOMString scheme;
  DOMString baseDomain;
  long port;
  boolean foreignByAncestorContext;
};
