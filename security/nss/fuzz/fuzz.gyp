# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
{
  'includes': [
    '../coreconf/config.gypi',
  ],
  'target_defaults': {
    'variables': {
      'debug_optimization_level': '3',
    },
    'cflags_cc': [
        '-Wno-vla-extension',
    ],
    'target_conditions': [
      [ '_type=="executable"', {
        'libraries!': [
          '<@(nspr_libs)',
        ],
        'libraries': [
          '<(nss_dist_obj_dir)/lib/libplds4.a',
          '<(nss_dist_obj_dir)/lib/libnspr4.a',
          '<(nss_dist_obj_dir)/lib/libplc4.a',
        ],
      }],
    ],
  },
  'targets': [
    {
      'target_name': 'fuzz_base',
      'type': 'static_library',
      'sources': [
        'shared.cc',
      ],
      'dependencies': [
        '<(DEPTH)/exports.gyp:nss_exports',
        '<(DEPTH)/lib/certdb/certdb.gyp:certdb',
        '<(DEPTH)/lib/certhigh/certhigh.gyp:certhi',
        '<(DEPTH)/lib/cryptohi/cryptohi.gyp:cryptohi',
        '<(DEPTH)/lib/ssl/ssl.gyp:ssl',
        '<(DEPTH)/lib/base/base.gyp:nssb',
        '<(DEPTH)/lib/dev/dev.gyp:nssdev',
        '<(DEPTH)/lib/pki/pki.gyp:nsspki',
        '<(DEPTH)/lib/util/util.gyp:nssutil',
        '<(DEPTH)/lib/nss/nss.gyp:nss_static',
        '<(DEPTH)/lib/pkcs7/pkcs7.gyp:pkcs7',
        '<(DEPTH)/lib/pkcs12/pkcs12.gyp:pkcs12',
        # This is a static build of pk11wrap, softoken, and freebl.
        '<(DEPTH)/lib/pk11wrap/pk11wrap.gyp:pk11wrap_static',
        '<(DEPTH)/lib/libpkix/libpkix.gyp:libpkix',
      ],
      'cflags_cc': [
        '-Wno-error=shadow',
      ],
      'conditions': [
        ['fuzz_oss==0', {
          'all_dependent_settings': {
            'libraries': [
              '-fsanitize=fuzzer',
             ],
          }
        }, {
          'all_dependent_settings': {
            'libraries': ['-lFuzzingEngine'],
          }
        }]
      ],
    },
    {
      'target_name': 'nssfuzz-pkcs7',
      'type': 'executable',
      'sources': [
        'asn1_mutators.cc',
        'pkcs7_target.cc',
      ],
      'dependencies': [
        '<(DEPTH)/exports.gyp:nss_exports',
        'fuzz_base',
      ],
    },
    {
      'target_name': 'nssfuzz-pkcs8',
      'type': 'executable',
      'sources': [
        'asn1_mutators.cc',
        'pkcs8_target.cc',
      ],
      'dependencies': [
        '<(DEPTH)/exports.gyp:nss_exports',
        'fuzz_base',
      ],
    },
    {
      'target_name': 'nssfuzz-pkcs12',
      'type': 'executable',
      'sources': [
        'asn1_mutators.cc',
        'pkcs12_target.cc',
      ],
      'dependencies': [
        '<(DEPTH)/cpputil/cpputil.gyp:cpputil',
        '<(DEPTH)/exports.gyp:nss_exports',
        'fuzz_base',
      ],
    },
    {
      'target_name': 'nssfuzz-quickder',
      'type': 'executable',
      'sources': [
        'asn1_mutators.cc',
        'quickder_target.cc',
      ],
      'dependencies': [
        '<(DEPTH)/exports.gyp:nss_exports',
        'fuzz_base',
      ],
    },
    {
      'target_name': 'nssfuzz-certDN',
      'type': 'executable',
      'sources': [
        'certDN_target.cc',
      ],
      'dependencies': [
        '<(DEPTH)/exports.gyp:nss_exports',
        'fuzz_base',
      ],
    },
    {
      'target_name': 'nssfuzz-tls-base',
      'type': 'static_library',
      'sources': [
        'tls_common.cc',
        'tls_mutators.cc',
        'tls_socket.cc',
      ],
      'dependencies': [
        '<(DEPTH)/cpputil/cpputil.gyp:cpputil',
        '<(DEPTH)/exports.gyp:nss_exports',
        'fuzz_base',
      ],
      'include_dirs': [
        '<(DEPTH)/lib/ssl',
      ],
      'direct_dependent_settings': {
        'include_dirs': [
          '<(DEPTH)/lib/freebl',
          '<(DEPTH)/lib/ssl',
        ],
      },
    },
    {
      'target_name': 'nssfuzz-tls-client',
      'type': 'executable',
      'sources': [
        'tls_client_config.cc',
        'tls_client_target.cc',
      ],
      'dependencies': [
        '<(DEPTH)/exports.gyp:nss_exports',
        '<(DEPTH)/cpputil/cpputil.gyp:cpputil',
        'nssfuzz-tls-base',
      ],
    },
    {
      'target_name': 'nssfuzz-tls-server',
      'type': 'executable',
      'sources': [
        'tls_server_certs.cc',
        'tls_server_config.cc',
        'tls_server_target.cc',
      ],
      'dependencies': [
        '<(DEPTH)/exports.gyp:nss_exports',
        '<(DEPTH)/cpputil/cpputil.gyp:cpputil',
        'nssfuzz-tls-base',
      ],
    },
    {
      'target_name': 'nssfuzz-dtls-client',
      'type': 'executable',
      'sources': [
        'tls_client_config.cc',
        'tls_client_target.cc',
      ],
      'defines': [
        'IS_DTLS_FUZZ'
      ],
      'dependencies': [
        '<(DEPTH)/exports.gyp:nss_exports',
        '<(DEPTH)/cpputil/cpputil.gyp:cpputil',
        'nssfuzz-tls-base',
      ],
    },
    {
      'target_name': 'nssfuzz-dtls-server',
      'type': 'executable',
      'sources': [
        'tls_server_certs.cc',
        'tls_server_config.cc',
        'tls_server_target.cc',
      ],
      'defines': [
        'IS_DTLS_FUZZ'
      ],
      'dependencies': [
        '<(DEPTH)/exports.gyp:nss_exports',
        '<(DEPTH)/cpputil/cpputil.gyp:cpputil',
        'nssfuzz-tls-base',
      ],
    },
    {
      'target_name': 'nssfuzz',
      'type': 'none',
      'dependencies': [
        'nssfuzz-certDN',
        'nssfuzz-dtls-client',
        'nssfuzz-dtls-server',
        'nssfuzz-pkcs7',
        'nssfuzz-pkcs8',
        'nssfuzz-pkcs12',
        'nssfuzz-quickder',
        'nssfuzz-tls-client',
        'nssfuzz-tls-server',
      ],
    }
  ],
}
