# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
#
# nrappkit.gyp
#
#
{
  'targets' : [
      {
          'target_name' : 'nrappkit',
          'type' : 'static_library',

          'include_dirs' : [
              # EXTERNAL
              # INTERNAL
              'src/event',
              'src/log',
              'src/port/generic/include',
              'src/registry',
              'src/share',
              'src/stats',
              'src/util',
              'src/util/libekr',
          ],

          'sources' : [
              # Shared
               './src/port/generic/include'

              # libekr
              './src/util/libekr/assoc.h',
              './src/util/libekr/r_assoc.c',
              './src/util/libekr/r_assoc.h',
              './src/util/libekr/r_common.h',
              './src/util/libekr/r_crc32.c',
              './src/util/libekr/r_crc32.h',
              './src/util/libekr/r_data.c',
              './src/util/libekr/r_data.h',
              './src/util/libekr/r_defaults.h',
              './src/util/libekr/r_errors.c',
              './src/util/libekr/r_errors.h',
              './src/util/libekr/r_includes.h',
              './src/util/libekr/r_macros.h',
              './src/util/libekr/r_memory.c',
              './src/util/libekr/r_memory.h',
              './src/util/libekr/r_time.c',
              './src/util/libekr/r_time.h',
              './src/util/libekr/r_types.h',

              # Utilities
              './src/util/byteorder.c',
              './src/util/byteorder.h',
              './src/util/hex.c',
              './src/util/hex.h',
              './src/util/p_buf.c',
              './src/util/p_buf.h',
              './src/util/util.c',
              './src/util/util.h',

              # Events
              './src/event/async_timer.h',
              './src/event/async_wait.h',

              # Logging
              './src/log/r_log.c',
              './src/log/r_log.h',

              # Registry
              './src/registry/registry.c',
              './src/registry/registry.h',
              './src/registry/registry_int.h',
              './src/registry/registry_local.c',
              './src/registry/registrycb.c',
          ],

          'defines' : [
              'SANITY_CHECKS',
              'R_PLATFORM_INT_TYPES=<stdint.h>',
              'R_DEFINED_INT2=int16_t',
              'R_DEFINED_UINT2=uint16_t',
              'R_DEFINED_INT4=int32_t',
              'R_DEFINED_UINT4=uint32_t',
              'R_DEFINED_INT8=int64_t',
              'R_DEFINED_UINT8=uint64_t',
          ],

          'conditions' : [
              ## Mac and BSDs
              [ 'OS == "mac"', {
                'defines' : [
                    'DARWIN',
                ],
              }],
              [ 'os_bsd == 1', {
                'defines' : [
                    'BSD',
                ],
              }],
              [ 'OS == "mac" or OS == "ios" or os_bsd == 1', {
                'cflags_mozilla': [
                    '-Wall',
                    '-Wno-parentheses',
                    '-Wno-strict-prototypes',
                    '-Wmissing-prototypes',
                    '-Wno-format',
                    '-Wno-format-security',
                 ],
                 'defines' : [
                     'HAVE_LIBM=1',
                     'HAVE_STRDUP=1',
                     'HAVE_STRLCPY=1',
                     'HAVE_SYS_TIME_H=1',
                     'HAVE_VFPRINTF=1',
                     'NEW_STDIO'
                     'RETSIGTYPE=void',
                     'TIME_WITH_SYS_TIME_H=1',
                     '__UNUSED__=__attribute__((unused))',
                 ],

                 'include_dirs': [
                     'src/port/darwin/include'
                 ],

                 'sources': [
                      './src/port/darwin/include/csi_platform.h',
                 ],
              }],

              ## Win
              [ 'OS == "win"', {
                 'defines' : [
                     'WIN',
                     '__UNUSED__=',
                     'HAVE_STRDUP=1',
                     'NO_REG_RPC'
                 ],

                 'include_dirs': [
                     'src/port/win32/include'
                 ],

                 'sources': [
                      './src/port/win32/include/csi_platform.h',
                 ],
              }],

              # Windows, clang-cl build
              [ 'clang_cl == 1', {
                'cflags_mozilla': [
                    '-Xclang',
                    '-Wall',
                    '-Xclang',
                    '-Wno-parentheses',
                    '-Wno-strict-prototypes',
                    '-Wmissing-prototypes',
                    '-Wno-format',
                    '-Wno-format-security',
                 ],
              }],

              ## Linux/Android
              [ '(OS == "linux") or (OS == "android")', {
                 'cflags_mozilla': [
                     '-Wall',
                     '-Wno-parentheses',
                     '-Wno-strict-prototypes',
                     '-Wmissing-prototypes',
                     '-Wno-format',
                     '-Wno-format-security',
                 ],
                 'defines' : [
                     'LINUX',
                     'HAVE_LIBM=1',
                     'HAVE_STRDUP=1',
                     'HAVE_STRLCPY=1',
                     'HAVE_SYS_TIME_H=1',
                     'HAVE_VFPRINTF=1',
                     'NEW_STDIO'
                     'RETSIGTYPE=void',
                     'TIME_WITH_SYS_TIME_H=1',
                     'NO_REG_RPC=1',
                     '__UNUSED__=__attribute__((unused))',
                 ],

                 'include_dirs': [
                     'src/port/linux/include'
                 ],
                 'sources': [
                      './src/port/linux/include/csi_platform.h',
                 ],
              }]
          ]
      }]
}


