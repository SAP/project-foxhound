/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Mozilla PKIX error configurations (MOZILLA_PKIX_ERROR_* codes).
 * These errors relate to PKI validation issues.
 */

export const PKIX_ERRORS = [
  {
    id: "MOZILLA_PKIX_ERROR_SELF_SIGNED_CERT",
    errorCode: "MOZILLA_PKIX_ERROR_SELF_SIGNED_CERT",
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
        dataL10nId: "fp-certerror-self-signed-why-dangerous-body",
      },
      whatCanYouDo: {
        dataL10nId: "fp-certerror-self-signed-what-can-you-do-body",
      },
      importantNote: "fp-certerror-self-signed-important-note",
      showViewCertificate: true,
      showDateTime: true,
    },
    hasNoUserFix: false,
  },
  {
    id: "MOZILLA_PKIX_ERROR_INSUFFICIENT_CERTIFICATE_TRANSPARENCY",
    errorCode: "MOZILLA_PKIX_ERROR_INSUFFICIENT_CERTIFICATE_TRANSPARENCY",
    category: "cert",
    introContent: {
      dataL10nId: "fp-certerror-transparency-intro",
      dataL10nArgs: { hostname: null },
    },
    buttons: {
      showTryAgain: false,
      showGoBack: true,
      showAdvanced: true,
      showAddException: false,
    },
    advanced: {
      whyDangerous: {
        dataL10nId: "fp-certerror-transparency-why-dangerous-body",
        dataL10nArgs: { hostname: null },
      },
      whatCanYouDo: {
        dataL10nId: "fp-certerror-transparency-what-can-you-do-body",
      },
      learnMore: {
        dataL10nId: "fp-learn-more-about-secure-connection-failures",
        supportPage: "connection-not-secure",
      },
      showViewCertificate: true,
    },
    hasNoUserFix: true,
  },
  {
    id: "MOZILLA_PKIX_ERROR_NOT_YET_VALID_CERTIFICATE",
    errorCode: "MOZILLA_PKIX_ERROR_NOT_YET_VALID_CERTIFICATE",
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
        dataL10nId: "fp-certerror-pkix-not-yet-valid-why-dangerous-body",
        dataL10nArgs: {
          date: l10nArgValues => l10nArgValues.errorInfo.validNotBefore,
        },
      },
      whatCanYouDo: {
        dataL10nId: "fp-certerror-pkix-not-yet-valid-what-can-you-do-body",
        dataL10nArgs: { date: null },
      },
      learnMore: {
        dataL10nId: "fp-learn-more-about-time-related-errors",
        supportPage: "time-errors",
      },
      showViewCertificate: true,
    },
    hasNoUserFix: false,
  },
  // NSS/PKIX errors with no user fix
  {
    id: "MOZILLA_PKIX_ERROR_INVALID_INTEGER_ENCODING",
    errorCode: "MOZILLA_PKIX_ERROR_INVALID_INTEGER_ENCODING",
    category: "cert",
    introContent: {
      dataL10nId: "fp-certerror-intro",
      dataL10nArgs: { hostname: null },
    },
    buttons: {
      showTryAgain: false,
      showGoBack: true,
      showAdvanced: true,
      showAddException: false,
    },
    advanced: {
      titleL10nId: "fp-certerror-body-title",
      whyDangerous: {
        dataL10nId: "mozilla-pkix-error-invalid-integer-encoding",
      },
    },
    hasNoUserFix: true,
  },
  {
    id: "MOZILLA_PKIX_ERROR_ISSUER_NO_LONGER_TRUSTED",
    errorCode: "MOZILLA_PKIX_ERROR_ISSUER_NO_LONGER_TRUSTED",
    category: "cert",
    introContent: {
      dataL10nId: "fp-certerror-intro",
      dataL10nArgs: { hostname: null },
    },
    buttons: {
      showTryAgain: false,
      showGoBack: true,
      showAdvanced: true,
      showAddException: false,
    },
    advanced: {
      titleL10nId: "fp-certerror-body-title",
      whyDangerous: {
        dataL10nId: "mozilla-pkix-error-issuer-no-longer-trusted",
      },
    },
    hasNoUserFix: true,
  },
  {
    id: "MOZILLA_PKIX_ERROR_KEY_PINNING_FAILURE",
    errorCode: "MOZILLA_PKIX_ERROR_KEY_PINNING_FAILURE",
    category: "cert",
    introContent: {
      dataL10nId: "fp-certerror-intro",
      dataL10nArgs: { hostname: null },
    },
    buttons: {
      showTryAgain: false,
      showGoBack: true,
      showAdvanced: true,
      showAddException: false,
    },
    advanced: {
      titleL10nId: "fp-certerror-body-title",
      whyDangerous: {
        dataL10nId: "mozilla-pkix-error-key-pinning-failure",
      },
    },
    hasNoUserFix: true,
  },
  {
    id: "MOZILLA_PKIX_ERROR_SIGNATURE_ALGORITHM_MISMATCH",
    errorCode: "MOZILLA_PKIX_ERROR_SIGNATURE_ALGORITHM_MISMATCH",
    category: "cert",
    introContent: {
      dataL10nId: "fp-certerror-intro",
      dataL10nArgs: { hostname: null },
    },
    buttons: {
      showTryAgain: false,
      showGoBack: true,
      showAdvanced: true,
      showAddException: false,
    },
    advanced: {
      titleL10nId: "fp-certerror-body-title",
      whyDangerous: {
        dataL10nId: "mozilla-pkix-error-signature-algorithm-mismatch",
      },
    },
    hasNoUserFix: true,
  },
];
