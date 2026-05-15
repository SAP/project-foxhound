/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://w3c.github.io/reporting/#interface-reporting-observer
 */

interface nsISupports;

[Pref="dom.reporting.enabled",
 Exposed=(Window,Worker)]
interface ReportBody {
  [Default] object toJSON
();
};

// Not exposed to Window for webcompat reasons
[Exposed=(Window,Worker), LegacyNoInterfaceObject]
interface Report {
  [Default] object toJSON
();
  readonly attribute DOMString type;
  readonly attribute DOMString url;
  readonly attribute ReportBody? body;
};

[Pref="dom.reporting.enabled",
 Exposed=(Window,Worker)]
interface ReportingObserver {
  [Throws]
  constructor(ReportingObserverCallback callback, optional ReportingObserverOptions options = {});
  undefined observe();
  undefined disconnect();
  ReportList takeRecords();
};

callback ReportingObserverCallback = undefined (sequence<Report> reports, ReportingObserver observer);

dictionary ReportingObserverOptions {
  sequence<DOMString> types;
  boolean buffered = false;
};

typedef sequence<Report> ReportList;

// Not exposed to Window for webcompat reasons
[Exposed=Window, LegacyNoInterfaceObject]
interface DeprecationReportBody : ReportBody {
  [Default] object toJSON();

  readonly attribute DOMString id;
  readonly attribute object? anticipatedRemoval;
  readonly attribute DOMString message;
  readonly attribute UTF8String? sourceFile;
  readonly attribute unsigned long? lineNumber;
  readonly attribute unsigned long? columnNumber;
};

[Deprecated="DeprecatedTestingInterface",
 Pref="dom.reporting.testing.enabled",
 Exposed=(Window,DedicatedWorker)]
interface TestingDeprecatedInterface {
  constructor();

  [Deprecated="DeprecatedTestingMethod"]
  undefined deprecatedMethod();

  [Deprecated="DeprecatedTestingAttribute"]
  readonly attribute boolean deprecatedAttribute;
};

[Exposed=Window, Pref="dom.reporting.enabled"]
interface CSPViolationReportBody : ReportBody {
  [Default] object toJSON();
  readonly attribute USVString documentURL;
  readonly attribute USVString? referrer;
  readonly attribute USVString? blockedURL;
  readonly attribute DOMString effectiveDirective;
  readonly attribute DOMString originalPolicy;
  readonly attribute UTF8String? sourceFile;
  readonly attribute DOMString? sample;
  readonly attribute SecurityPolicyViolationEventDisposition disposition;
  readonly attribute unsigned short statusCode;
  readonly attribute unsigned long? lineNumber;
  readonly attribute unsigned long? columnNumber;
};

// https://w3c.github.io/webappsec-subresource-integrity/#report-violations
[Exposed=Window, Pref="dom.reporting.enabled"]
interface IntegrityViolationReportBody : ReportBody {
  [Default] object toJSON();
  readonly attribute UTF8String documentURL;
  readonly attribute UTF8String blockedURL;
  readonly attribute UTF8String destination;
  readonly attribute boolean    reportOnly;
};

// Used internally to process the JSON
[GenerateInit]
dictionary ReportingHeaderValue {
  sequence<ReportingItem> items;
};

// Used internally to process the JSON
dictionary ReportingItem {
  // This is a long.
  any max_age;
  // This is a sequence of ReportingEndpoint.
  any endpoints;
  // This is a string. If missing, the value is 'default'.
  any group;
  boolean include_subdomains = false;
};

// Used internally to process the JSON
[GenerateInit]
dictionary ReportingEndpoint {
  // This is a string.
  any url;
  // This is an unsigned long.
  any priority;
  // This is an unsigned long.
  any weight;
};

dictionary GenerateTestReportParameters
{
  required DOMString message;
  DOMString group = "default";
};

[ChromeOnly, Pref="dom.reporting.enabled", Exposed=Window]
namespace TestReportGenerator {
  [Throws]
  Promise<undefined> generateReport(GenerateTestReportParameters params);
};

[LegacyNoInterfaceObject, Exposed=Window]
interface TestReportBody : ReportBody {
  [Default] object toJSON();
  readonly attribute DOMString message;
};
