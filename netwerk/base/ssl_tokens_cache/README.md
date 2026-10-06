# ssl_tokens_cache

Rust crate that persists the in-memory TLS session resumption token cache
(`SSLTokensCache`) to a single flat binary file in the Firefox profile
directory (`ssl_tokens_cache.bin`), enabling 0-RTT on first connections
after a browser restart.

## On-disk format

```
[Header — 5 bytes total]
  magic:    4 bytes  "STCF"
  version:  u8       (currently 2)

[Body]
  zlib-compressed bincode-serialized Vec<PersistedRecord>
  (Adler-32 integrity check embedded in the zlib stream)
```

Each `PersistedRecord` contains:

| Field                                    | Type      | Description                                         |
|------------------------------------------|-----------|-----------------------------------------------------|
| `id`                                     | u64       | Session-internal ID; re-assigned on load            |
| `key`                                    | Vec\<u8\>   | Peer ID string (host:port + OA suffix)            |
| `expiration_time`                        | i64       | PRTime (µs since epoch)                             |
| `token`                                  | Vec\<u8\>   | Opaque NSS session resumption ticket              |
| `ev_status`                              | u8        | Extended-validation status                          |
| `ct_status`                              | u16       | Certificate Transparency status                     |
| `overridable_error`                      | u8        | Cert-error override category                        |
| `server_cert`                            | Vec\<u8\>              | DER-encoded server certificate           |
| `succeeded_cert_chain`                   | Option\<Vec\<Vec\<u8\>\>\> | Verified cert chain; `None` = absent |
| `handshake_certs`                        | Option\<Vec\<Vec\<u8\>\>\> | TLS handshake certs; `None` = absent |
| `is_built_cert_chain_root_built_in_root` | Option\<bool\>         | Chain root is built-in; `None` = absent  |

Cert chain data is persisted so that TLS 1.3 PSK-resumed connections after
restart — which receive no Certificate message from the server — can
reconstruct full security info via `RebuildCertificateInfoFromSSLTokenCache()`.
This enables correct security UI and HTTP/2 connection coalescing.

## Eviction policy

The in-memory cache is bounded by `network.ssl_tokens_cache_capacity`.
When a new record would exceed this budget, the cache evicts the record
with the **soonest expiration time** until the budget is met. This matches
the semantics of session ticket expiry: tokens that will expire first are
least useful, so they are discarded first.

At most `network.ssl_tokens_cache_records_per_entry` tokens are kept per
host; when the per-host limit is hit, the oldest-inserted record for that
host is dropped to make room for the new one.

Expired records are discarded lazily on `Get()`, not proactively, so the
on-disk snapshot may contain tokens that have already expired. These are
filtered out during loading.

## Decoder

A Python script for inspecting `ssl_tokens_cache.bin` files from a Firefox
profile is available at `tools/netwerk/decode_ssl_tokens_cache.py`:

```
python3 tools/netwerk/decode_ssl_tokens_cache.py ~/path/to/ssl_tokens_cache.bin
python3 tools/netwerk/decode_ssl_tokens_cache.py -v ...   # show cert chain subjects
python3 tools/netwerk/decode_ssl_tokens_cache.py -vv ...  # also hexdump token bytes
```

## Typical sizes

- Token: ~200 bytes
- Key: ~30 bytes
- Server cert + chain: ~3–8 KB
- Record total: ~3–8 KB
- Typical file size for a normal browsing session: 100 KB–1 MB

## File lifecycle

- Cache written: asynchronously on `application-background` (e.g. when the
  user switches away from Firefox on Android, before any OOM kill); on
  `idle-daily`; and via an `nsIAsyncShutdownBlocker` on `ProfileBeforeChange`
  (off the main thread). The blocker is registered on `profile-after-change`
  (sent by `nsXREDirProvider::DoStartup()` once the profile is loaded)
  because the AsyncShutdown service is not yet registered when
  `SSLTokensCache::Init()` runs. `SSLTokensCache::Shutdown()` (called by
  `nsIOService` on `profile-change-net-teardown`) provides a synchronous
  fallback for test environments where the async shutdown service is
  unavailable.
- Cache written atomically: data → `ssl_tokens_cache.tmp` → rename to
  `ssl_tokens_cache.bin`.
- Cache deleted: when `SSLTokensCache::Clear()` is called (e.g. "Clear All
  History", site data clearing for a partition).
