/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

// This file defines dictionaries used by about:networking page.

dictionary SocketElement {
  DOMString host = "";
  unsigned long port = 0;
  boolean active = false;
  DOMString type = "";
  double sent = 0;
  double received = 0;
  DOMString originAttributesSuffix = "";
};

[GenerateConversionToJS]
dictionary SocketsDict {
  sequence<SocketElement> sockets;
  double sent = 0;
  double received = 0;
};

dictionary HttpConnInfo {
  unsigned long rtt = 0;
  unsigned long ttl = 0;
  DOMString protocolVersion = "";
};

dictionary DnsAndSockInfoDict {
  boolean speculative = false;
};

dictionary HttpConnectionElement {
  DOMString host = "";
  unsigned long port = 0;
  DOMString httpVersion = "";
  boolean ssl = false;
  sequence<HttpConnInfo> active;
  sequence<HttpConnInfo> idle;
  sequence<DnsAndSockInfoDict> dnsAndSocks;
  DOMString originAttributesSuffix = "";
};

[GenerateConversionToJS]
dictionary HttpConnDict {
  sequence<HttpConnectionElement> connections;
};

dictionary WebSocketElement {
  DOMString hostport = "";
  unsigned long msgsent = 0;
  unsigned long msgreceived = 0;
  double sentsize = 0;
  double receivedsize = 0;
  boolean encrypted = false;
};

[GenerateConversionToJS]
dictionary WebSocketDict {
  sequence<WebSocketElement> websockets;
};

dictionary DnsCacheEntry {
  DOMString hostname = "";
  sequence<DOMString> hostaddr;
  DOMString family = "";
  double expiration = 0;
  boolean trr = false;
  DOMString originAttributesSuffix = "";
  DOMString flags = "";
  unsigned short type = 0;
};

[GenerateConversionToJS]
dictionary DNSCacheDict {
  sequence<DnsCacheEntry> entries;
};

[GenerateConversionToJS]
dictionary DNSLookupDict {
  sequence<DOMString> address;
  DOMString error = "";
  boolean answer = false;
};

dictionary SVCParam {
  unsigned short type = 0;
};

dictionary SVCParamAlpn : SVCParam {
  DOMString alpn = "";
};

dictionary SVCParamNoDefaultAlpn : SVCParam {
};

dictionary SVCParamPort : SVCParam {
  unsigned short port = 0;
};

dictionary SVCParamIPv4Hint : SVCParam {
  sequence<DOMString> address;
};

dictionary SVCParamIPv6Hint : SVCParam {
  sequence<DOMString> address;
};

dictionary SVCParamEchConfig : SVCParam {
  DOMString echConfig = "";
};

dictionary SVCParamODoHConfig : SVCParam {
  DOMString ODoHConfig = "";
};

dictionary HTTPSRecord {
  unsigned short priority = 0;
  DOMString targetName = "";
  SVCParamAlpn alpn;
  SVCParamNoDefaultAlpn noDefaultAlpn;
  SVCParamPort port;
  SVCParamIPv4Hint ipv4Hint;
  SVCParamIPv6Hint ipv6Hint;
  SVCParamEchConfig echConfig;
  SVCParamODoHConfig ODoHConfig;
};

[GenerateConversionToJS]
dictionary HTTPSRRLookupDict {
  DOMString error = "";
  boolean answer = false;
  sequence<HTTPSRecord> records;
};

[GenerateConversionToJS]
dictionary ConnStatusDict {
  DOMString status = "";
};

[GenerateConversionToJS]
dictionary AltSvcMappingElement {
  DOMString originHost = "";
  unsigned long originPort = 0;
  DOMString alternateHost = "";
  unsigned long alternatePort = 0;
  DOMString alpn = "";
  boolean https = false;
  boolean validated = false;
  long ttl = 0;
  DOMString originAttributesSuffix = "";
};

[GenerateConversionToJS]
dictionary AltSvcCacheDict {
  sequence<AltSvcMappingElement> entries;
};

dictionary Http3ConnStats {
  unsigned long long packetsRx = 0;
  unsigned long long dupsRx = 0;
  unsigned long long droppedRx = 0;
  unsigned long long savedDatagrams = 0;
  unsigned long long packetsTx = 0;
  unsigned long long lost = 0;
  unsigned long long lateAck = 0;
  unsigned long long ptoAck = 0;
  unsigned long long wouldBlockRx = 0;
  unsigned long long wouldBlockTx = 0;
  sequence<unsigned long long> ptoCounts;
};

dictionary Http3ConnectionStatsElement {
  DOMString host = "";
  unsigned long port = 0;
  sequence<Http3ConnStats> stats;
};

[GenerateConversionToJS]
dictionary Http3ConnStatsDict {
  sequence<Http3ConnectionStatsElement> connections;
};
