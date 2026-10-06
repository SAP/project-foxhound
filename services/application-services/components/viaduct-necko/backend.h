/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef VIADUCT_NECKO_H
#define VIADUCT_NECKO_H

#include <stdint.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

// HTTP Method enumeration (must match Rust side)
enum ViaductMethod : uint8_t {
  VIADUCT_METHOD_GET = 0,
  VIADUCT_METHOD_HEAD = 1,
  VIADUCT_METHOD_POST = 2,
  VIADUCT_METHOD_PUT = 3,
  VIADUCT_METHOD_DELETE = 4,
  VIADUCT_METHOD_CONNECT = 5,
  VIADUCT_METHOD_OPTIONS = 6,
  VIADUCT_METHOD_TRACE = 7,
  VIADUCT_METHOD_PATCH = 8,
};

// Header structure
struct ViaductHeader {
  const char* key;
  const char* value;
};

// Request structure
struct ViaductRequest {
  uint32_t timeout;
  uint32_t redirect_limit;
  ViaductMethod method;
  const char* url;
  const ViaductHeader* headers;
  size_t header_count;
  const uint8_t* body;  // Body remains uint8_t* since it's binary data
  size_t body_len;
};

// Opaque result pointer (points to Rust FfiResult)
struct ViaductResult;

// Functions that C++ must implement
void viaduct_necko_backend_init();
void viaduct_necko_backend_send_request(const ViaductRequest* request,
                                        ViaductResult* result);

// Functions that Rust provides for C++ to call
void viaduct_necko_result_set_url(ViaductResult* result, const char* url,
                                  size_t length);
void viaduct_necko_result_set_status_code(ViaductResult* result, uint16_t code);
void viaduct_necko_result_add_header(ViaductResult* result, const char* key,
                                     size_t key_length, const char* value,
                                     size_t value_length);
void viaduct_necko_result_extend_body(ViaductResult* result,
                                      const uint8_t* data, size_t length);
void viaduct_necko_result_complete(ViaductResult* result);
void viaduct_necko_result_complete_error(ViaductResult* result,
                                         uint32_t error_code,
                                         const char* message);

#ifdef __cplusplus
}
#endif

#endif  // VIADUCT_NECKO_H
