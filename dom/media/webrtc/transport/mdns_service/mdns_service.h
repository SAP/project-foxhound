/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef DOM_MEDIA_WEBRTC_TRANSPORT_MDNS_SERVICE_MDNS_SERVICE_H_
#define DOM_MEDIA_WEBRTC_TRANSPORT_MDNS_SERVICE_MDNS_SERVICE_H_

#include <new>

struct MDNSService;

extern "C" {

void mdns_service_register_hostname(MDNSService* serv, const char* hostname,
                                    const char* addr);

MDNSService* mdns_service_start(const char* ifaddr);

void mdns_service_stop(MDNSService* serv);

void mdns_service_query_hostname(
    MDNSService* serv, void* data,
    void (*resolved)(void* data, const char* hostname, const char* address),
    void (*timedout)(void* data, const char* hostname), const char* hostname);

void mdns_service_unregister_hostname(MDNSService* serv, const char* hostname);

}  // extern "C"

#endif  // DOM_MEDIA_WEBRTC_TRANSPORT_MDNS_SERVICE_MDNS_SERVICE_H_
