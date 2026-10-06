"use strict";

/*
To change this file you will have to add a function to download a file in toolkit/components/certviewer/content/certviewer.mjs.
Add the following after this line https://searchfox.org/firefox-main/rev/50a34d25155fd70628ee69c7d68a2509c0e3445d/toolkit/components/certviewer/content/certviewer.mjs#414:

function download(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

// Start file download.
download("out.txt",JSON.stringify({certItems, tabName}));

Build Nightly and then open the test certificate in about:certificate.

You can use the following bash script to get the correct URL:

```
function urlencode() {
  python3 -c 'import urllib.parse, sys; print(urllib.parse.quote(sys.argv[1], safe=sys.argv[2]))' "$1" "$urlencode_safe"
}

function pemurl() {
  echo "about:certificate?cert=$(urlencode $(openssl x509 -in $1 -outform der | base64 -w 0))"
}

pemurl toolkit/components/certviewer/tests/browser/example.com.pem
```

Finally, paste the output here and update the URL in browser_renderCertToUI.js.
*/

const adjustedCerts = [
  {
    certItems: [
      {
        sectionId: "subject-name",
        sectionItems: [
          {
            labelId: "common-name",
            info: "Certviewer Test Subject",
            isHex: false,
          },
        ],
        Critical: false,
      },
      {
        sectionId: "issuer-name",
        sectionItems: [
          {
            labelId: "common-name",
            info: "Certviewer Test Issuer",
            isHex: false,
          },
        ],
        Critical: false,
      },
      {
        sectionId: "validity",
        sectionItems: [
          {
            labelId: "not-before",
            info: {
              local: "12/31/2019, 4:00:00 PM (Pacific Daylight Time)",
              utc: "Wed, 01 Jan 2020 00:00:00 GMT",
            },
            isHex: false,
          },
          {
            labelId: "not-after",
            info: {
              local: "12/31/2048, 4:00:00 PM (Pacific Daylight Time)",
              utc: "Fri, 01 Jan 2049 00:00:00 GMT",
            },
            isHex: false,
          },
        ],
        Critical: false,
      },
      {
        sectionId: "subject-alt-names",
        sectionItems: [
          { labelId: "dns-name", info: "example.com", isHex: false },
        ],
        Critical: false,
      },
      {
        sectionId: "public-key-info",
        sectionItems: [
          { labelId: "algorithm", info: "RSA", isHex: false },
          { labelId: "key-size", info: 2048, isHex: false },
          { labelId: "exponent", info: 65537, isHex: false },
          {
            labelId: "modulus",
            info: "BA:88:51:A8:44:8E:16:D6:41:FD:6E:B6:88:06:36:10:3D:3C:13:D9:EA:E4:35:4A:B4:EC:F5:68:57:6C:24:7B:C1:C7:25:A8:E0:D8:1F:BD:B1:9C:06:9B:6E:1A:86:F2:6B:E2:AF:5A:75:6B:6A:64:71:08:7A:A5:5A:A7:45:87:F7:1C:D5:24:9C:02:7E:CD:43:FC:1E:69:D0:38:20:29:93:AB:20:C3:49:E4:DB:B9:4C:C2:6B:6C:0E:ED:15:82:0F:F1:7E:AD:69:1A:B1:D3:02:3A:8B:2A:41:EE:A7:70:E0:0F:0D:8D:FD:66:0B:2B:B0:24:92:A4:7D:B9:88:61:79:90:B1:57:90:3D:D2:3B:C5:E0:B8:48:1F:A8:37:D3:88:43:EF:27:16:D8:55:B7:66:5A:AA:7E:02:90:2F:3A:7B:10:80:06:24:CC:1C:6C:97:AD:96:61:5B:B7:E2:96:12:C0:75:31:A3:0C:91:DD:B4:CA:F7:FC:AD:1D:25:D3:09:EF:B9:17:0E:A7:68:E1:B3:7B:2F:22:6F:69:E3:B4:8A:95:61:1D:EE:26:D6:25:9D:AB:91:08:4E:36:CB:1C:24:04:2C:BF:16:8B:2F:E5:F1:8F:99:17:31:B8:B3:FE:49:23:FA:72:51:C4:31:D5:03:AC:DA:18:0A:35:ED:8D",
            isHex: true,
          },
        ],
        Critical: false,
      },
      {
        sectionId: "miscellaneous",
        sectionItems: [
          {
            labelId: "serial-number",
            info: "29:7F:CF:B0:CB:3D:C9:C0:10:48:10:9B:31:73:50:26:D0:39:02:6E",
            isHex: true,
          },
          {
            labelId: "signature-algorithm",
            info: "SHA-256 with RSA Encryption",
            isHex: false,
          },
          { labelId: "version", info: "3", isHex: false },
          {
            labelId: "download",
            info: "-----BEGIN%20CERTIFICATE-----%0D%0AMIIEsDCCA5igAwIBAgIUKX/PsMs9ycAQSBCbMXNQJtA5Am4wDQYJKoZIhvcNAQEL%0D%0ABQAwITEfMB0GA1UEAwwWQ2VydHZpZXdlciBUZXN0IElzc3VlcjAiGA8yMDIwMDEw%0D%0AMTAwMDAwMFoYDzIwNDkwMTAxMDAwMDAwWjAiMSAwHgYDVQQDDBdDZXJ0dmlld2Vy%0D%0AIFRlc3QgU3ViamVjdDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALqI%0D%0AUahEjhbWQf1utogGNhA9PBPZ6uQ1SrTs9WhXbCR7wcclqODYH72xnAabbhqG8mvi%0D%0Ar1p1a2pkcQh6pVqnRYf3HNUknAJ+zUP8HmnQOCApk6sgw0nk27lMwmtsDu0Vgg/x%0D%0Afq1pGrHTAjqLKkHup3DgDw2N/WYLK7AkkqR9uYhheZCxV5A90jvF4LhIH6g304hD%0D%0A7ycW2FW3ZlqqfgKQLzp7EIAGJMwcbJetlmFbt+KWEsB1MaMMkd20yvf8rR0l0wnv%0D%0AuRcOp2jhs3svIm9p47SKlWEd7ibWJZ2rkQhONsscJAQsvxaLL+Xxj5kXMbiz/kkj%0D%0A+nJRxDHVA6zaGAo17Y0CAwEAAaOCAdkwggHVMDIGCCsGAQUFBwEBBCYwJDAiBggr%0D%0ABgEFBQcwAYYWaHR0cDovL2xvY2FsaG9zdDo4ODg4LzAPBgNVHRMBAf8EBTADAQH/%0D%0AMCgGA1UdIAQhMB8wBwYFZ4EMAQEwFAYSKwYBBAHrSYUahRqFGgGDdAkBMBMGA1Ud%0D%0AJQQMMAoGCCsGAQUFBwMBMA4GA1UdDwEB/wQEAwIBhjAWBgNVHREEDzANggtleGFt%0D%0AcGxlLmNvbTCCASUGCisGAQQB1nkCBAIEggEVBIIBEQEPAHUAKrgwRDO5FN7S8x5C%0D%0AB/JRwXo3oJJoUtkIAgb4Xlc5FioAAAGUHyl8AAAABAMARjBEAiBcdVGfExFQzV2K%0D%0A3iCjvAYwkf+yc3VfMWTs/ctCgApw5gIgRafynpUWWNFU5IGinUAH9iDXVEOW7Zgm%0D%0AkZtwCwQThQ8AlgDNeRdNGEsWeEl3r8cOu4yKezTP7Z+7GD6Lprh70wkA0gAAAZQf%0D%0AKXwAAAAEAwBnMGUCMQDtBic+oWg6VLTYGkN0hEiWPOY+voEXA+zXPXLwolQGWdTs%0D%0ARUboVudeZVW3k6n3APMCMH8jluFThKPCL0BhJLvmN49NV3jvCO3wSUSUPneJciRV%0D%0Atv0otIlh5ng8PqFrFBHo+DANBgkqhkiG9w0BAQsFAAOCAQEAW8qizE6SMno2irSW%0D%0AQEGznA7xLXqVWFM5rW/6SA9uynXIGaaoKtkkWQy4qa7RI7vgACCwyoBJCr3Y7ypn%0D%0AeKJUB+fTD0QIA5HH3ohz/UqI5SdezUCUQVd8lscdSEIvcyV35Gw5r3EAL+cFRk4U%0D%0AgeFewGwYCW61YPS72NzHGLfLA6/NpiZJongsqaYFb98fvk0DIFnmiyIcWfqO7n/p%0D%0ANAbh1wvkGhQ1qWKH6jZs2XC7RueaZuo88XCJTqIWs87p0LqUrkfrBNizVSGouCn9%0D%0AeuoUC1ngwOKeSzAuPR4k3OGOD3V6bBQ5EI7gAIv1hqyBvHFC1mvCEKv0qJHlycrR%0D%0ARPNIug==%0D%0A-----END%20CERTIFICATE-----%0D%0A",
            isHex: false,
          },
        ],
        Critical: false,
      },
      {
        sectionId: "fingerprints",
        sectionItems: [
          {
            labelId: "sha-256",
            info: "2C:E6:D4:35:4E:7B:89:B6:50:C5:D9:F1:A5:40:99:68:93:3B:4E:9A:4C:70:12:ED:07:E4:B0:C0:40:AE:28:9C",
            isHex: true,
          },
          {
            labelId: "sha-1",
            info: "D6:97:4A:BD:7A:B6:36:31:23:78:B1:66:0F:C5:96:AE:DE:F0:BE:16",
            isHex: true,
          },
        ],
        Critical: false,
      },
      {
        sectionId: "basic-constraints",
        sectionItems: [
          { labelId: "certificate-authority", info: true, isHex: false },
        ],
        Critical: true,
      },
      {
        sectionId: "key-usages",
        sectionItems: [
          {
            labelId: "purposes",
            info: ["Digital Signature", "Certificate Signing", "CRL Signing"],
            isHex: false,
          },
        ],
        Critical: true,
      },
      {
        sectionId: "extended-key-usages",
        sectionItems: [
          {
            labelId: "purposes",
            info: ["Server Authentication"],
            isHex: false,
          },
        ],
        Critical: false,
      },
      {
        sectionId: "authority-info-aia",
        sectionItems: [
          { labelId: "location", info: "http://localhost:8888/", isHex: false },
          {
            labelId: "method",
            info: "Online Certificate Status Protocol (OCSP)",
            isHex: false,
          },
        ],
        Critical: false,
      },
      {
        sectionId: "certificate-policies",
        sectionItems: [
          {
            labelId: "policy",
            info: "Certificate Type ( 2.23.140.1.1 )",
            isHex: false,
          },
          { labelId: "value", info: "Extended Validation", isHex: false },
          {
            labelId: "policy",
            info: "Statement Identifier ( 1.3.6.1.4.1 )",
            isHex: false,
          },
          {
            labelId: "value",
            info: "1.3.6.1.4.1.13769.666.666.666.1.500.9.1",
            isHex: false,
          },
        ],
        Critical: false,
      },
      {
        sectionId: "embedded-scts",
        sectionItems: [
          { labelId: "log-name", info: "Mozilla Test EC Log", isHex: false },
          {
            labelId: "logid",
            info: "2A:B8:30:44:33:B9:14:DE:D2:F3:1E:42:07:F2:51:C1:7A:37:A0:92:68:52:D9:08:02:06:F8:5E:57:39:16:2A",
            isHex: true,
          },
          {
            labelId: "signaturealgorithm",
            info: "SHA-256 ECDSA",
            isHex: false,
          },
          { labelId: "version", info: 1, isHex: false },
          {
            labelId: "timestamp",
            info: {
              local: "12/31/2024, 4:00:00 PM (Pacific Daylight Time)",
              utc: "Wed, 01 Jan 2025 00:00:00 GMT",
            },
            isHex: false,
          },
          {
            labelId: "logid",
            info: "CD:79:17:4D:18:4B:16:78:49:77:AF:C7:0E:BB:8C:8A:7B:34:CF:ED:9F:BB:18:3E:8B:A6:B8:7B:D3:09:00:D2",
            isHex: true,
          },
          {
            labelId: "signaturealgorithm",
            info: "SHA-256 ECDSA",
            isHex: false,
          },
          { labelId: "version", info: 1, isHex: false },
          {
            labelId: "timestamp",
            info: {
              local: "12/31/2024, 4:00:00 PM (Pacific Daylight Time)",
              utc: "Wed, 01 Jan 2025 00:00:00 GMT",
            },
            isHex: false,
          },
        ],
        Critical: false,
      },
    ],
    tabName: "Certviewer Test Subject",
  },
];
