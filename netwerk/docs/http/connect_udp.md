# CONNECT-UDP in Firefox

```{mermaid}
flowchart LR
    Client[Client]
    Proxy[Proxy]
    Target[Target]

    subgraph OuterConn["Outer HTTP/3 Connection"]
        subgraph InnerConnClientToProxy["Inner HTTP/3 Connection"]
            InnerConnClientToProxy1["Inner Stream 1"]
            InnerConnClientToProxy2["Inner Stream 2"]
        end
    end

    subgraph UDPTunnel["UDPTunnel"]
        subgraph InnerConnProxyToTarget["Inner HTTP/3 Connection"]
            InnerConnProxyToTarget1["Inner Stream 1"]
            InnerConnProxyToTarget2["Inner Stream 2"]
        end
    end

    Client --> OuterConn
    OuterConn --> Proxy

    Proxy --> UDPTunnel
    UDPTunnel --> Target
```

## Terminology and Concepts

To clearly describe the design, we define two key terms that appear frequently throughout this document:

### Outer Connection

The outer connection refers to the HTTP/3 connection between Firefox and the proxy. This connection is established once and can be reused for multiple HTTP/3 requests.

### Inner Connection

The inner connection refers to the logical UDP tunnel established over an HTTP/3 stream via the CONNECT method.

### Connection Establishment

Note: Firefox only supports CONNECT-UDP over HTTP/3. Support over HTTP/2 or HTTP/1.1 is not implemented.

To establish a UDP tunnel over HTTP/3, Firefox initiates a request using the CONNECT method with the :protocol set to connect-udp. This request negotiates a stream that serves as the logical tunnel for encapsulated UDP datagrams between the client and the proxy.

The tunnel setup process involves sending a HEADERS frame on a new HTTP/3 stream with the following pseudo-header and header fields:
```
:method = CONNECT
:protocol = connect-udp
:scheme = https
:path = /.well-known/masque/udp/example.com/443/
:authority = proxy.org
capsule-protocol = ?1
```

## Http3ConnectUDPStream

Http3ConnectUDPStream is the core implementation of the CONNECT-UDP in Firefox. It behaves like a regular nsIUDPSocket, allowing the inner HTTP/3 connection to send and receive UDP datagrams.

Internally, it encapsulates outgoing UDP datagrams into HTTP datagrams, which are then sent over the outer HTTP/3 connection to the proxy. Incoming HTTP datagrams from the proxy are decoded and delivered as UDP packets to the consumer.


### Data sending flow

```{mermaid}
sequenceDiagram
    participant HttpConnectionUDP (inner)
    participant Http3Session (inner)
    participant Http3Stream (inner)
    participant nsHttpTransaction
    participant Http3Session (outer)
    participant Http3ConnectUDPStream
    participant NeqoHttp3Conn (outer)

    HttpConnectionUDP (inner)->>HttpConnectionUDP (inner): SendData()
    HttpConnectionUDP (inner)->>Http3Session (inner): SendData()
    Http3Session (inner)->>Http3Stream (inner): ReadSegments()
    Http3Stream (inner)->>nsHttpTransaction: ReadSegmentsAgain()
    nsHttpTransaction->>Http3Stream (inner): ReadRequestSegment()
    Http3Stream (inner)->>Http3Session (inner): TryActivating/SendRequestBody()
    Http3Session (inner)->>Http3ConnectUDPStream: SendWithAddress()
    Http3ConnectUDPStream->>Http3ConnectUDPStream: QueueDatagram()
    Http3ConnectUDPStream->>Http3Session (outer): StreamHasDataToWrite()
    Http3Session (outer)->>Http3ConnectUDPStream: ReadSegments()
    Http3ConnectUDPStream->>Http3Session (outer): SendHTTPDatagram()
    Http3Session (outer)->>NeqoHttp3Conn: NeqoProcessOutputAndSend()
```

### Data reading flow

```{mermaid}
sequenceDiagram
    participant NeqoHttp3Conn (outer)
    participant Http3Session (outer)
    participant Http3ConnectUDPStream
    participant Http3Session (inner)
    participant Http3Stream (inner)
    participant HttpConnectionUDP (inner)
    participant nsHttpTransaction

    NeqoHttp3Conn (outer)->>Http3Session (outer): Receive HTTP Datagram
    Http3Session (outer)->>Http3ConnectUDPStream: OnDatagramReceived()
    Http3ConnectUDPStream->>HttpConnectionUDP (inner): OnPacketReceived()
    HttpConnectionUDP (inner)->>Http3Session (inner): RecvData()
    Http3Session (inner)->>Http3ConnectUDPStream: RecvWithAddr()
    Http3Session (inner)->>Http3Session (inner): ProcessTransactionRead()
    Http3Session (inner)->>Http3Stream (inner): WriteSegments()
    Http3Stream (inner)->>nsHttpTransaction: WriteSegmentsAgain()
```

## Fallback Mechanism
This section describes the fallback mechanism for establishing proxy connections when using HTTP/3. The process is divided into two layers: the outer connection (between the browser and the proxy) and the inner connection (between the browser and the target server through the proxy).

### Outer Connection

 - The browser first attempts to establish this connection using HTTP/3.
 - If the HTTP/3 attempt fails, the connection falls back to HTTP/2 or HTTP/1.

Current implementation:
 - The fallback logic is implemented in nsHttpTransaction (subject to future changes under the Happy Eyeballs project).
  - When a transaction is inserted into the pending queue:
    - A HTTP/3 backup timer is started.
    - An attempt to establish an HTTP/3 connection to the proxy is initiated.
 - If the backup timer fires before the HTTP/3 connection succeeds, a TCP connection to the proxy server is created.
 - If the TCP connection succeeds while HTTP/3 is still pending, we fall back to the TCP-based connection.
 - At this point, the connection info of the inner connection is also updated to disable HTTP/3, since the we do not support CONNECT-UDP over HTTP/2 or HTTP/1.

### Inner Connection
Even if the outer connection is established with HTTP/3, the inner connection may still need to fall back.

Current implementation:
- This fallback logic is also implemented in nsHttpTransaction.
- Once the proxy responds with 200 OK to the initial connect-udp setup, a HTTP/3 fallback timer for the inner connection is started.
- If the fallback timer fires:
  - HTTP/3 for the inner connection is disabled.
  - The ongoing HTTP/3 inner connection is closed.
- The inner connection falls back to HTTP/2 or HTTP/1 using a standard HTTP CONNECT tunnel.
