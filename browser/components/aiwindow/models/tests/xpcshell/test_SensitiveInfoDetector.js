/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { SensitiveInfoDetector } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/memories/SensitiveInfoDetector.sys.mjs"
);

add_task(function test_detector_initialization() {
  const detector = new SensitiveInfoDetector();
  Assert.ok(detector, "Detector instance created");
  Assert.ok(detector.patterns, "Detector has patterns");
  Assert.greater(
    Object.keys(detector.patterns).length,
    0,
    "Detector has at least one pattern"
  );
});

add_task(function test_containsSensitiveInfo_ssn() {
  const detector = new SensitiveInfoDetector();

  const withSSN = "My SSN is 123-45-6789 and I need help.";
  Assert.ok(
    detector.containsSensitiveInfo(withSSN),
    "Detects US Social Security Number"
  );

  const withoutSSN = "My account number is 12345";
  Assert.ok(
    !detector.containsSensitiveInfo(withoutSSN),
    "Does not flag non-SSN number"
  );

  const invalidSSN = "123-45-678";
  Assert.ok(
    !detector.containsSensitiveInfo(invalidSSN),
    "Does not flag invalid SSN format (missing digit)"
  );
});

add_task(function test_containsSensitiveInfo_sin() {
  const detector = new SensitiveInfoDetector();

  const withSIN = "My SIN is 123-456-789 for taxes.";
  Assert.ok(
    detector.containsSensitiveInfo(withSIN),
    "Detects Canadian Social Insurance Number"
  );

  const withoutSIN = "The number is 123-45-6789";
  Assert.ok(
    detector.containsSensitiveInfo(withoutSIN),
    "SSN detected (different format)"
  );
});

add_task(function test_containsSensitiveInfo_email() {
  const detector = new SensitiveInfoDetector();

  const withEmail = "Contact me at user@example.com for details.";
  Assert.ok(detector.containsSensitiveInfo(withEmail), "Detects email address");

  const withComplexEmail = "Send to john.doe+tag@subdomain.example.co.uk";
  Assert.ok(
    detector.containsSensitiveInfo(withComplexEmail),
    "Detects complex email address"
  );

  const withoutEmail = "Visit example dot com for info";
  Assert.ok(
    !detector.containsSensitiveInfo(withoutEmail),
    "Does not flag non-email text"
  );
});

add_task(function test_containsSensitiveInfo_phone() {
  const detector = new SensitiveInfoDetector();

  const withPhone1 = "Call me at 555-123-4567";
  Assert.ok(
    detector.containsSensitiveInfo(withPhone1),
    "Detects phone with dashes"
  );

  const withPhone2 = "My number is (555) 123-4567";
  Assert.ok(
    detector.containsSensitiveInfo(withPhone2),
    "Detects phone with parentheses"
  );

  const withPhone3 = "Dial +1-555-123-4567 for support";
  Assert.ok(
    detector.containsSensitiveInfo(withPhone3),
    "Detects phone with country code"
  );

  const withPhone4 = "Phone: 555.123.4567";
  Assert.ok(
    detector.containsSensitiveInfo(withPhone4),
    "Detects phone with dots"
  );

  const shortNumber = "Call 911 for emergency";
  Assert.ok(
    !detector.containsSensitiveInfo(shortNumber),
    "Does not flag short numbers"
  );
});

add_task(function test_containsSensitiveInfo_creditCard() {
  const detector = new SensitiveInfoDetector();

  const withValidCard = "Card number: 4111-1111-1111-1111";
  Assert.ok(
    detector.containsSensitiveInfo(withValidCard),
    "Detects valid credit card (Visa test card with dashes)"
  );

  const withValidCardNoSpaces = "Card: 4111111111111111";
  Assert.ok(
    detector.containsSensitiveInfo(withValidCardNoSpaces),
    "Detects valid credit card (no spaces)"
  );

  const invalidCard = "1234-5678-9012-3456";
  Assert.ok(
    !detector.containsSensitiveInfo(invalidCard),
    "Does not flag invalid credit card (fails Luhn check)"
  );
});

add_task(function test_containsSensitiveInfo_ipv4() {
  const detector = new SensitiveInfoDetector();

  const withPublicIP = "Server at 8.8.8.8 is down.";
  Assert.ok(
    detector.containsSensitiveInfo(withPublicIP),
    "Detects public IPv4 address"
  );

  const withPrivateIP = "Local server at 192.168.1.1";
  Assert.ok(
    !detector.containsSensitiveInfo(withPrivateIP),
    "Does not flag private IPv4 (192.168.x.x)"
  );

  const withLocalhost = "Server at 127.0.0.1";
  Assert.ok(
    !detector.containsSensitiveInfo(withLocalhost),
    "Does not flag localhost"
  );

  const withPrivate10 = "Network at 10.0.0.1";
  Assert.ok(
    !detector.containsSensitiveInfo(withPrivate10),
    "Does not flag private IPv4 (10.x.x.x)"
  );

  const withPrivate172 = "Server at 172.16.0.1";
  Assert.ok(
    !detector.containsSensitiveInfo(withPrivate172),
    "Does not flag private IPv4 (172.16-31.x.x)"
  );
});

add_task(function test_containsSensitiveInfo_ipv6() {
  const detector = new SensitiveInfoDetector();

  const withIPv6 = "Server at 2001:0db8:85a3:0000:0000:8a2e:0370:7334";
  Assert.ok(detector.containsSensitiveInfo(withIPv6), "Detects IPv6 address");

  const shortIPv6 = "Connect to 2001:db8::1";
  Assert.ok(
    !detector.containsSensitiveInfo(shortIPv6),
    "Does not detect abbreviated IPv6 (pattern limitation)"
  );
});

add_task(function test_containsSensitiveInfo_macAddress() {
  const detector = new SensitiveInfoDetector();

  const withMacColon = "Device MAC: 00:1A:2B:3C:4D:5E";
  Assert.ok(
    detector.containsSensitiveInfo(withMacColon),
    "Detects MAC address with colons"
  );

  const withMacDash = "MAC address: 00-1A-2B-3C-4D-5E";
  Assert.ok(
    detector.containsSensitiveInfo(withMacDash),
    "Detects MAC address with dashes"
  );

  const partialMac = "Device: 00:1A:2B";
  Assert.ok(
    !detector.containsSensitiveInfo(partialMac),
    "Does not flag partial MAC address"
  );
});

add_task(function test_containsSensitiveInfo_streetAddress() {
  const detector = new SensitiveInfoDetector();

  const withStreet1 = "I live at 123 Main Street";
  Assert.ok(
    detector.containsSensitiveInfo(withStreet1),
    "Detects street address with 'Street'"
  );

  const withStreet2 = "Address: 456 Oak Ave";
  Assert.ok(
    detector.containsSensitiveInfo(withStreet2),
    "Detects street address with 'Ave'"
  );

  const withStreet3 = "Located at 789 Park Blvd.";
  Assert.ok(
    detector.containsSensitiveInfo(withStreet3),
    "Detects street address with 'Blvd.'"
  );

  const noStreet = "I went to the park";
  Assert.ok(
    !detector.containsSensitiveInfo(noStreet),
    "Does not flag generic text with street words"
  );
});

add_task(function test_containsSensitiveInfo_poBox() {
  const detector = new SensitiveInfoDetector();

  const withPOBox1 = "Mail to P.O. Box 12345";
  Assert.ok(detector.containsSensitiveInfo(withPOBox1), "Detects P.O. Box");

  const withPOBox2 = "Send to Post Office Box 67890";
  Assert.ok(
    detector.containsSensitiveInfo(withPOBox2),
    "Detects Post Office Box"
  );

  const withPOBox3 = "PO Box 999";
  Assert.ok(detector.containsSensitiveInfo(withPOBox3), "Detects PO Box");
});

add_task(function test_containsSensitiveInfo_routingNumber() {
  const detector = new SensitiveInfoDetector();

  const withValidRouting = "Routing number: 111000025";
  Assert.ok(
    detector.containsSensitiveInfo(withValidRouting),
    "Detects valid routing number"
  );

  const invalidRouting = "Number: 123456789";
  Assert.ok(
    !detector.containsSensitiveInfo(invalidRouting),
    "Does not flag invalid routing number (fails checksum)"
  );

  const shortNumber = "Code: 12345678";
  Assert.ok(
    !detector.containsSensitiveInfo(shortNumber),
    "Does not flag 8-digit number"
  );
});

add_task(function test_containsSensitiveInfo_multipleTypes() {
  const detector = new SensitiveInfoDetector();

  const multipleTypes =
    "Email user@example.com and call 555-123-4567 at 123 Main St.";
  Assert.ok(
    detector.containsSensitiveInfo(multipleTypes),
    "Detects text with multiple sensitive info types"
  );
});

add_task(function test_containsSensitiveInfo_emptyAndInvalid() {
  const detector = new SensitiveInfoDetector();

  Assert.ok(!detector.containsSensitiveInfo(""), "Empty string returns false");

  Assert.ok(!detector.containsSensitiveInfo(null), "Null returns false");

  Assert.ok(
    !detector.containsSensitiveInfo(undefined),
    "Undefined returns false"
  );

  Assert.ok(!detector.containsSensitiveInfo(123), "Number returns false");

  Assert.ok(!detector.containsSensitiveInfo({}), "Object returns false");
});

add_task(function test_containsSensitiveInfo_cleanText() {
  const detector = new SensitiveInfoDetector();

  const cleanText =
    "The quick brown fox jumps over the lazy dog. This is a test.";
  Assert.ok(
    !detector.containsSensitiveInfo(cleanText),
    "Clean text with no sensitive info returns false"
  );

  const urlText = "Visit https://example.com for more information";
  Assert.ok(
    !detector.containsSensitiveInfo(urlText),
    "URL without sensitive info returns false"
  );
});

add_task(function test_containsSensitiveInfo_edgeCases() {
  const detector = new SensitiveInfoDetector();

  const almostSSN = "123-45-678 is missing a digit";
  Assert.ok(
    !detector.containsSensitiveInfo(almostSSN),
    "Almost-SSN with wrong format not detected"
  );

  const almostEmail = "user@incomplete";
  Assert.ok(
    !detector.containsSensitiveInfo(almostEmail),
    "Incomplete email not detected"
  );

  const dateFormat = "Date: 12-34-5678";
  Assert.ok(
    !detector.containsSensitiveInfo(dateFormat),
    "Date-like format not flagged as SSN (wrong digit grouping)"
  );
});

add_task(function test_containsSensitiveKeywords_medical() {
  const detector = new SensitiveInfoDetector();

  Assert.ok(
    detector.containsSensitiveKeywords(
      "Searching for cancer treatment options"
    ),
    "Detects medical keyword: cancer"
  );

  Assert.ok(
    detector.containsSensitiveKeywords("Looking for a therapist near me"),
    "Detects medical keyword: therapist"
  );

  Assert.ok(
    detector.containsSensitiveKeywords("Pregnancy test results positive"),
    "Detects medical keyword: pregnancy"
  );

  Assert.ok(
    detector.containsSensitiveKeywords("Depression symptoms and treatment"),
    "Detects medical keyword: depression"
  );

  Assert.ok(
    !detector.containsSensitiveKeywords("Healthy recipes for dinner"),
    "Does not flag non-medical health context"
  );
});

add_task(function test_containsSensitiveKeywords_finance() {
  const detector = new SensitiveInfoDetector();

  Assert.ok(
    detector.containsSensitiveKeywords("How to improve my credit score"),
    "Detects finance keyword: credit score"
  );

  Assert.ok(
    detector.containsSensitiveKeywords("Mortgage refinance rates today"),
    "Detects finance keyword: mortgage"
  );

  Assert.ok(
    detector.containsSensitiveKeywords("Filing bankruptcy in California"),
    "Detects finance keyword: bankruptcy"
  );

  Assert.ok(
    detector.containsSensitiveKeywords("Best investment portfolio strategy"),
    "Detects finance keyword: portfolio"
  );

  Assert.ok(
    detector.containsSensitiveKeywords(
      "Shopping for a new loan calculator app"
    ),
    "Detects finance keyword: loan"
  );
});

add_task(function test_containsSensitiveKeywords_legal() {
  const detector = new SensitiveInfoDetector();

  Assert.ok(
    detector.containsSensitiveKeywords("Filing for divorce in Texas"),
    "Detects legal keyword: divorce"
  );

  Assert.ok(
    detector.containsSensitiveKeywords("Immigration visa application process"),
    "Detects legal keyword: visa"
  );

  Assert.ok(
    detector.containsSensitiveKeywords("Child custody hearing preparation"),
    "Detects legal keyword: custody"
  );

  Assert.ok(
    detector.containsSensitiveKeywords("Criminal defense attorney near me"),
    "Detects legal keyword: criminal"
  );
});

add_task(function test_containsSensitiveKeywords_political() {
  const detector = new SensitiveInfoDetector();

  Assert.ok(
    detector.containsSensitiveKeywords("Democrat vs Republican policies"),
    "Detects political keyword: Democrat"
  );

  Assert.ok(
    detector.containsSensitiveKeywords("How to vote in the next election"),
    "Detects political keyword: election"
  );

  Assert.ok(
    detector.containsSensitiveKeywords("Liberal vs conservative viewpoints"),
    "Detects political keyword: liberal"
  );
});

add_task(function test_containsSensitiveKeywords_religion() {
  const detector = new SensitiveInfoDetector();

  Assert.ok(
    detector.containsSensitiveKeywords("Catholic church near me"),
    "Detects religion keyword: Catholic"
  );

  Assert.ok(
    detector.containsSensitiveKeywords("Islamic prayer times today"),
    "Detects religion keyword: Islamic"
  );

  Assert.ok(
    detector.containsSensitiveKeywords("Jewish holidays calendar"),
    "Detects religion keyword: Jewish"
  );

  Assert.ok(
    detector.containsSensitiveKeywords("Atheism vs agnosticism debate"),
    "Detects religion keyword: atheism"
  );
});

add_task(function test_containsSensitiveKeywords_demographics() {
  const detector = new SensitiveInfoDetector();

  Assert.ok(
    detector.containsSensitiveKeywords("LGBTQ rights and protections"),
    "Detects demographic keyword: LGBTQ"
  );

  Assert.ok(
    detector.containsSensitiveKeywords("Transgender healthcare services"),
    "Detects demographic keyword: transgender"
  );

  Assert.ok(
    detector.containsSensitiveKeywords("Understanding gender identity"),
    "Detects demographic keyword: gender identity"
  );

  Assert.ok(
    detector.containsSensitiveKeywords("Race and ethnicity demographics"),
    "Detects demographic keyword: race"
  );
});

add_task(function test_containsSensitiveKeywords_clean() {
  const detector = new SensitiveInfoDetector();

  Assert.ok(
    !detector.containsSensitiveKeywords("Best restaurants in New York"),
    "Clean text about restaurants"
  );

  Assert.ok(
    !detector.containsSensitiveKeywords("JavaScript tutorial for beginners"),
    "Clean text about programming"
  );

  Assert.ok(
    !detector.containsSensitiveKeywords("Hiking trails near San Francisco"),
    "Clean text about outdoor activities"
  );

  Assert.ok(
    !detector.containsSensitiveKeywords("Movie reviews and ratings"),
    "Clean text about entertainment"
  );
});

add_task(function test_containsSensitiveKeywords_plurals() {
  const detector = new SensitiveInfoDetector();

  Assert.ok(
    detector.containsSensitiveKeywords("Multiple symptoms detected"),
    "Detects plural: symptoms (from symptom)"
  );

  Assert.ok(
    detector.containsSensitiveKeywords("Visiting churches this weekend"),
    "Detects plural: churches (from church)"
  );

  Assert.ok(
    detector.containsSensitiveKeywords("Comparing loan rates"),
    "Detects singular: loan"
  );

  Assert.ok(
    detector.containsSensitiveKeywords("Surgeries scheduled for next week"),
    "Detects y->ies plural: surgeries (from surgery)"
  );

  Assert.ok(
    detector.containsSensitiveKeywords("Filing bankruptcies is complicated"),
    "Detects y->ies plural: bankruptcies (from bankruptcy)"
  );
});

add_task(function test_containsSensitiveKeywords_caseInsensitive() {
  const detector = new SensitiveInfoDetector();

  Assert.ok(
    detector.containsSensitiveKeywords("CANCER treatment options"),
    "Detects uppercase keyword"
  );

  Assert.ok(
    detector.containsSensitiveKeywords("Cancer Treatment Options"),
    "Detects mixed case keyword"
  );

  Assert.ok(
    detector.containsSensitiveKeywords("cancer treatment options"),
    "Detects lowercase keyword"
  );

  Assert.ok(
    detector.containsSensitiveKeywords("Looking for MORTGAGE rates"),
    "Detects uppercase finance keyword"
  );

  Assert.ok(
    detector.containsSensitiveKeywords("Filing for DIVORCE"),
    "Detects uppercase legal keyword"
  );
});

add_task(function test_containsSensitiveKeywords_emptyAndInvalid() {
  const detector = new SensitiveInfoDetector();

  Assert.ok(
    !detector.containsSensitiveKeywords(""),
    "Empty string returns false"
  );

  Assert.ok(!detector.containsSensitiveKeywords(null), "Null returns false");

  Assert.ok(
    !detector.containsSensitiveKeywords(undefined),
    "Undefined returns false"
  );

  Assert.ok(!detector.containsSensitiveKeywords(123), "Number returns false");
});
