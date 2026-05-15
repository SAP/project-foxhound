/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * SSL/TLS error configurations (SSL_ERROR_* codes).
 * These errors relate to TLS handshake and protocol issues.
 */

export const SSL_ERRORS = [
  {
    id: "SSL_ERROR_BAD_CERT_DOMAIN",
    errorCode: "SSL_ERROR_BAD_CERT_DOMAIN",
    category: "cert",
    introContent: {
      dataL10nId: "fp-certerror-intro",
      dataL10nArgs: { hostname: null },
    },
    buttons: {
      showTryAgain: false,
      showGoBack: true,
      showAdvanced: true,
      showAddException: true,
    },
    advanced: {
      whyDangerous: {
        dataL10nId: "fp-certerror-bad-domain-why-dangerous-body",
        dataL10nArgs: { hostname: null, validHosts: null },
      },
      whatCanYouDo: {
        dataL10nId: l10nArgValues =>
          l10nArgValues.cssClass === "badStsCert"
            ? "certerror-what-should-i-do-bad-sts-cert-explanation"
            : "fp-certerror-bad-domain-what-can-you-do-body",
        dataL10nArgs: { hostname: null },
      },
      learnMore: {
        dataL10nId: "fp-learn-more-about-secure-connection-failures",
        supportPage: "connection-not-secure",
      },
      showViewCertificate: true,
      showDateTime: true,
      requiresDomainMismatchNames: true,
    },
    hasNoUserFix: false,
  },
  {
    id: "SSL_ERROR_NO_CYPHER_OVERLAP",
    errorCode: "SSL_ERROR_NO_CYPHER_OVERLAP",
    category: "cert",
    introContent: {
      dataL10nId: "fp-neterror-connection-intro",
      dataL10nArgs: { hostname: null },
    },
    buttons: {
      showTryAgain: false,
      showGoBack: true,
      showAdvanced: true,
      showAddException: false,
      showPrefReset: true,
    },
    advanced: {
      whyDangerous: {
        dataL10nId: "fp-neterror-cypher-overlap-why-dangerous-body",
      },
      whatCanYouDo: {
        dataL10nId: "fp-neterror-cypher-overlap-what-can-you-do-body",
      },
      learnMore: {
        dataL10nId: "fp-learn-more-about-secure-connection-failures",
        supportPage: "connection-not-secure",
      },
    },
    hasNoUserFix: false,
    checkNSSFailure: true,
  },
  {
    id: "SSL_ERROR_RX_MALFORMED_HANDSHAKE",
    errorCode: "SSL_ERROR_RX_MALFORMED_HANDSHAKE",
    category: "cert",
    introContent: [
      {
        dataL10nId: "cert-error-ssl-connection-error",
        dataL10nArgs: { hostname: null, errorMessage: null },
      },
      {
        dataL10nId: "ssl-error-rx-malformed-handshake",
      },
    ],
    buttons: {
      showTryAgain: true,
      showGoBack: true,
      showAdvanced: true,
      showAddException: false,
    },
    advanced: {
      whyDangerous: {
        dataL10nId: "neterror-nss-failure-not-verified",
      },
      whatCanYouDo: {
        dataL10nId: "neterror-nss-failure-contact-website",
      },
      learnMore: {
        dataL10nId: "fp-learn-more-about-secure-connection-failures",
        supportPage: "connection-not-secure",
      },
    },
    hasNoUserFix: true,
  },
  {
    id: "SSL_ERROR_UNSUPPORTED_VERSION",
    errorCode: "SSL_ERROR_UNSUPPORTED_VERSION",
    category: "cert",
    bodyTitleL10nId: "nssFailure2-title",
    introContent: [
      {
        dataL10nId: "cert-error-ssl-connection-error",
        dataL10nArgs: { hostname: null, errorMessage: null },
      },
      {
        dataL10nId: "ssl-error-unsupported-version",
      },
    ],
    buttons: {
      showTryAgain: true,
      showGoBack: true,
      showAdvanced: true,
      showAddException: false,
    },
    advanced: {
      whyDangerous: {
        dataL10nId: "neterror-nss-failure-not-verified",
      },
      whatCanYouDo: {
        dataL10nId: "neterror-nss-failure-contact-website",
      },
      learnMore: {
        dataL10nId: "fp-learn-more-about-secure-connection-failures",
        supportPage: "connection-not-secure",
      },
    },
    hasNoUserFix: true,
  },
  {
    id: "SSL_ERROR_PROTOCOL_VERSION_ALERT",
    errorCode: "SSL_ERROR_PROTOCOL_VERSION_ALERT",
    category: "cert",
    bodyTitleL10nId: "nssFailure2-title",
    introContent: [
      {
        dataL10nId: "cert-error-ssl-connection-error",
        dataL10nArgs: { hostname: null, errorMessage: null },
      },
      {
        dataL10nId: "ssl-error-protocol-version-alert",
      },
    ],
    buttons: {
      showTryAgain: true,
      showGoBack: true,
      showAdvanced: true,
      showAddException: false,
    },
    advanced: {
      whyDangerous: {
        dataL10nId: "neterror-nss-failure-not-verified",
      },
      whatCanYouDo: {
        dataL10nId: "neterror-nss-failure-contact-website",
      },
      learnMore: {
        dataL10nId: "fp-learn-more-about-secure-connection-failures",
        supportPage: "connection-not-secure",
      },
    },
    hasNoUserFix: true,
  },
];
