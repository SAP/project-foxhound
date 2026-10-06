/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.gecko.media;

// See https://developer.android.com/media/media3/exoplayer/network-stacks#other-network
// for custom ExoPlayer network stack.
// This implementation is a wrapper mapping WebRequest, GeckoResult, WebResponse, and
// GeckoInputStream to HttpDataSource API.
// Also, unlike androidx.media3.datasource.DefaultHttpDataSource, it relies on Necko
// for behaviors such as proxy, redirect, and time-outs.

import static androidx.media3.datasource.HttpUtil.buildRangeRequestHeader;

import android.net.Uri;
import androidx.annotation.Nullable;
import androidx.media3.common.C;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.datasource.BaseDataSource;
import androidx.media3.datasource.DataSpec;
import androidx.media3.datasource.HttpDataSource;
import androidx.media3.datasource.HttpUtil;
import androidx.media3.datasource.TransferListener;
import com.google.common.base.Predicate;
import com.google.common.net.HttpHeaders;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InterruptedIOException;
import java.net.UnknownHostException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import org.mozilla.geckoview.GeckoResult;
import org.mozilla.geckoview.WebRequest;
import org.mozilla.geckoview.WebRequestError;
import org.mozilla.geckoview.WebResponse;

@UnstableApi
public final class HttpChannelDataSource extends BaseDataSource implements HttpDataSource {

  public interface ChannelProvider {
    GeckoResult<WebResponse> openChannel(WebRequest request);
  }

  public static final class Factory implements HttpDataSource.Factory {

    private final ChannelProvider mChannelProvider;
    private final RequestProperties mDefaultRequestProperties;

    @Nullable private TransferListener mTransferListener;
    @Nullable private String mUserAgent;
    @Nullable private Predicate<String> mContentTypePredicate;

    public Factory(final ChannelProvider channelProvider) {
      mChannelProvider = channelProvider;
      mDefaultRequestProperties = new RequestProperties();
    }

    @Override
    public Factory setDefaultRequestProperties(final Map<String, String> defaultRequestProperties) {
      mDefaultRequestProperties.clearAndSet(defaultRequestProperties);
      return this;
    }

    public Factory setUserAgent(final String userAgent) {
      mUserAgent = userAgent;
      return this;
    }

    public Factory setContentTypePredicate(@Nullable final Predicate<String> contentTypePredicate) {
      mContentTypePredicate = contentTypePredicate;
      return this;
    }

    public Factory setTransferListener(@Nullable final TransferListener transferListener) {
      mTransferListener = transferListener;
      return this;
    }

    @Override
    public HttpDataSource createDataSource() {
      final HttpChannelDataSource dataSource =
          new HttpChannelDataSource(
              mChannelProvider, mUserAgent, mDefaultRequestProperties, mContentTypePredicate);
      if (mTransferListener != null) {
        dataSource.addTransferListener(mTransferListener);
      }
      return dataSource;
    }
  }

  private final ChannelProvider mChannelProvider;
  @Nullable private final String mUserAgent;
  @Nullable private final RequestProperties mDefaultRequestProperties;
  private final RequestProperties mRequestProperties;
  @Nullable private final Predicate<String> mContentTypePredicate;

  private boolean mTransferStarted = false;
  private long mBytesRemaining = C.LENGTH_UNSET;
  @Nullable private DataSpec mCurrentDataSpec = null;
  @Nullable private InputStream mBodyStream = null;
  private int mResponseCode = -1;
  private Map<String, List<String>> mResponseHeaders = Collections.emptyMap();
  @Nullable private String mFinalUri = null;

  private HttpChannelDataSource(
      final ChannelProvider channelProvider,
      @Nullable final String userAgent,
      @Nullable final RequestProperties defaultRequestProperties,
      @Nullable final Predicate<String> contentTypePredicate) {
    super(/* isNetwork= */ true);
    mChannelProvider = channelProvider;
    mUserAgent = userAgent;
    mDefaultRequestProperties = defaultRequestProperties;
    mContentTypePredicate = contentTypePredicate;
    mRequestProperties = new RequestProperties();
  }

  @Override
  public void setRequestProperty(final String name, final String value) {
    mRequestProperties.set(name, value);
  }

  @Override
  public void clearRequestProperty(final String name) {
    mRequestProperties.remove(name);
  }

  @Override
  public void clearAllRequestProperties() {
    mRequestProperties.clear();
  }

  @Override
  public int getResponseCode() {
    return mResponseCode;
  }

  @Override
  public Map<String, List<String>> getResponseHeaders() {
    return mResponseHeaders;
  }

  @Override
  @Nullable
  public Uri getUri() {
    if (mFinalUri != null) {
      return Uri.parse(mFinalUri);
    }
    return mCurrentDataSpec != null ? mCurrentDataSpec.uri : null;
  }

  @Override
  public long open(final DataSpec dataSpec) throws HttpDataSourceException {
    if (mTransferStarted) {
      throw new IllegalStateException("DataSource is already open");
    }
    mCurrentDataSpec = dataSpec;
    mBytesRemaining = C.LENGTH_UNSET;
    mResponseCode = -1;
    mResponseHeaders = Collections.emptyMap();
    mFinalUri = null;

    final WebRequest.Builder builder = new WebRequest.Builder(dataSpec.uri.toString());
    if (mDefaultRequestProperties != null) {
      for (final Map.Entry<String, String> entry :
          mDefaultRequestProperties.getSnapshot().entrySet()) {
        builder.header(entry.getKey(), entry.getValue());
      }
    }
    for (final Map.Entry<String, String> entry : mRequestProperties.getSnapshot().entrySet()) {
      builder.header(entry.getKey(), entry.getValue());
    }
    for (final Map.Entry<String, String> entry : dataSpec.httpRequestHeaders.entrySet()) {
      builder.header(entry.getKey(), entry.getValue());
    }
    final String rangeHeader = buildRangeRequestHeader(dataSpec.position, dataSpec.length);
    if (rangeHeader != null) {
      builder.header(HttpHeaders.RANGE, rangeHeader);
    }
    if (mUserAgent != null) {
      builder.header(HttpHeaders.USER_AGENT, mUserAgent);
    }
    // Suppress gzip when the caller hasn't opted in. This overrides Necko's
    // default Accept-Encoding so the server returns identity-encoded bytes and
    // Content-Length remains reliable.
    if (!dataSpec.isFlagSet(DataSpec.FLAG_ALLOW_GZIP)) {
      builder.header(HttpHeaders.ACCEPT_ENCODING, "identity");
    }

    transferInitializing(dataSpec);

    final WebResponse response;
    try {
      response = mChannelProvider.openChannel(builder.build()).poll();
    } catch (final InterruptedException e) {
      Thread.currentThread().interrupt();
      throw HttpDataSourceException.createForIOException(
          new InterruptedIOException(), dataSpec, HttpDataSourceException.TYPE_OPEN);
    } catch (final Throwable e) {
      throw HttpDataSourceException.createForIOException(
          toIOException(e), dataSpec, HttpDataSourceException.TYPE_OPEN);
    }

    if (response == null) {
      throw new HttpDataSourceException(
          "No response received",
          dataSpec,
          PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_FAILED,
          HttpDataSourceException.TYPE_OPEN);
    }

    mResponseCode = response.statusCode;
    // HTTP header names are case-insensitive (RFC 7230 §3.2). Use a case-insensitive TreeMap so
    // callers can look up headers regardless of the casing Necko delivers.
    final Map<String, List<String>> headers = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
    for (final Map.Entry<String, String> entry : response.headers.entrySet()) {
      headers.computeIfAbsent(entry.getKey(), k -> new ArrayList<>()).add(entry.getValue());
    }
    mResponseHeaders = Collections.unmodifiableMap(headers);
    mFinalUri = response.uri;
    mBodyStream = response.body;

    if (mResponseCode < 200 || mResponseCode > 299) {
      if (mResponseCode == 416) {
        final long documentSize =
            HttpUtil.getDocumentSize(getFirstHeader(mResponseHeaders, HttpHeaders.CONTENT_RANGE));
        if (dataSpec.position == documentSize) {
          mBytesRemaining = 0;
          mTransferStarted = true;
          transferStarted(dataSpec);
          return 0;
        }
      }
      final byte[] responseBody = readResponseBody(dataSpec);
      throw new InvalidResponseCodeException(
          mResponseCode,
          /* responseMessage= */ null,
          mResponseCode == 416
              ? new HttpDataSourceException(
                  dataSpec,
                  PlaybackException.ERROR_CODE_IO_READ_POSITION_OUT_OF_RANGE,
                  HttpDataSourceException.TYPE_OPEN)
              : null,
          mResponseHeaders,
          dataSpec,
          responseBody);
    }

    if (mContentTypePredicate != null) {
      final String contentType = getFirstHeader(mResponseHeaders, HttpHeaders.CONTENT_TYPE);
      if (contentType != null && !mContentTypePredicate.apply(contentType)) {
        throw new InvalidContentTypeException(contentType, dataSpec);
      }
    }

    final long bytesToSkip = mResponseCode == 200 && dataSpec.position != 0 ? dataSpec.position : 0;
    final boolean compressed = isCompressed(mResponseHeaders);
    if (!compressed) {
      if (dataSpec.length != C.LENGTH_UNSET) {
        mBytesRemaining = dataSpec.length;
      } else {
        final long contentLength =
            HttpUtil.getContentLength(
                getFirstHeader(mResponseHeaders, HttpHeaders.CONTENT_LENGTH),
                getFirstHeader(mResponseHeaders, HttpHeaders.CONTENT_RANGE));
        mBytesRemaining =
            contentLength != C.LENGTH_UNSET ? contentLength - bytesToSkip : C.LENGTH_UNSET;
      }
    } else {
      // Compressed: Content-Length is the wire size, not the decoded size.
      mBytesRemaining = dataSpec.length;
    }

    mTransferStarted = true;
    transferStarted(dataSpec);

    if (bytesToSkip > 0) {
      skipFully(bytesToSkip, dataSpec);
    }
    return mBytesRemaining;
  }

  @Override
  public int read(final byte[] buffer, final int offset, final int length)
      throws HttpDataSourceException {
    if (!mTransferStarted) {
      throw new IllegalStateException("read() called before open()");
    }
    if (length == 0) {
      return 0;
    }
    if (mBytesRemaining != C.LENGTH_UNSET && mBytesRemaining <= 0) {
      return C.RESULT_END_OF_INPUT;
    }

    final int toRead =
        mBytesRemaining != C.LENGTH_UNSET ? (int) Math.min(length, mBytesRemaining) : length;
    final int bytesRead = readFromStream(buffer, offset, toRead);
    if (bytesRead == C.RESULT_END_OF_INPUT) {
      return C.RESULT_END_OF_INPUT;
    }

    if (mBytesRemaining != C.LENGTH_UNSET) {
      mBytesRemaining -= bytesRead;
    }
    bytesTransferred(bytesRead);
    return bytesRead;
  }

  @Override
  public void close() {
    if (mBodyStream != null) {
      try {
        mBodyStream.close();
      } catch (final IOException ignored) {
      }
      mBodyStream = null;
    }
    mCurrentDataSpec = null;
    mBytesRemaining = C.LENGTH_UNSET;
    mResponseCode = -1;
    mResponseHeaders = Collections.emptyMap();
    mFinalUri = null;
    if (mTransferStarted) {
      mTransferStarted = false;
      transferEnded();
    }
  }

  // Reads from mBodyStream, translating -1 (EOF) to C.RESULT_END_OF_INPUT and
  // wrapping any IOException in HttpDataSourceException.
  private int readFromStream(final byte[] buffer, final int offset, final int length)
      throws HttpDataSourceException {
    if (mBodyStream == null) {
      if (mBytesRemaining != C.LENGTH_UNSET && mBytesRemaining > 0) {
        throw HttpDataSourceException.createForIOException(
            new IOException("Response body unavailable"),
            mCurrentDataSpec,
            HttpDataSourceException.TYPE_READ);
      }
      return C.RESULT_END_OF_INPUT;
    }
    try {
      final int bytesRead = mBodyStream.read(buffer, offset, length);
      return bytesRead == -1 ? C.RESULT_END_OF_INPUT : bytesRead;
    } catch (final IOException e) {
      throw HttpDataSourceException.createForIOException(
          e, mCurrentDataSpec, HttpDataSourceException.TYPE_READ);
    }
  }

  private void skipFully(final long bytesToSkip, final DataSpec dataSpec)
      throws HttpDataSourceException {
    long remaining = bytesToSkip;
    final byte[] discard = new byte[4096];
    while (remaining > 0) {
      final int toRead = (int) Math.min(remaining, discard.length);
      final int read = readFromStream(discard, 0, toRead);
      if (read == C.RESULT_END_OF_INPUT) {
        throw new HttpDataSourceException(
            dataSpec,
            PlaybackException.ERROR_CODE_IO_READ_POSITION_OUT_OF_RANGE,
            HttpDataSourceException.TYPE_OPEN);
      }
      bytesTransferred(read);
      remaining -= read;
    }
  }

  private byte[] readResponseBody(final DataSpec dataSpec) {
    if (mBodyStream == null) {
      return new byte[0];
    }
    final ByteArrayOutputStream out = new ByteArrayOutputStream();
    final byte[] buf = new byte[4096];
    try {
      int n;
      while ((n = mBodyStream.read(buf)) != -1) {
        out.write(buf, 0, n);
      }
    } catch (final IOException ignored) {
      // Best-effort; caller will throw the status-code error.
    }
    return out.toByteArray();
  }

  @Nullable
  private static String getFirstHeader(final Map<String, List<String>> headers, final String name) {
    final List<String> values = headers.get(name);
    return values != null && !values.isEmpty() ? values.get(0) : null;
  }

  private static boolean isCompressed(final Map<String, List<String>> headers) {
    final String encoding = getFirstHeader(headers, HttpHeaders.CONTENT_ENCODING);
    return encoding != null && !encoding.equalsIgnoreCase("identity");
  }

  // Maps a Throwable from GeckoResult.poll() to a typed IOException so that
  // createForIOException() can assign the right PlaybackException error code.
  // WebRequestError carries a Gecko error code that we translate to the
  // appropriate IOException subtype (e.g. UnknownHostException for DNS failures).
  private static IOException toIOException(final Throwable cause) {
    if (cause instanceof WebRequestError) {
      final int code = ((WebRequestError) cause).code;
      if (code == WebRequestError.ERROR_UNKNOWN_HOST
          || code == WebRequestError.ERROR_UNKNOWN_PROXY_HOST) {
        return new UnknownHostException(cause.getMessage());
      }
      if (code == WebRequestError.ERROR_NET_TIMEOUT) {
        return new java.net.SocketTimeoutException(cause.getMessage());
      }
      if (code == WebRequestError.ERROR_NET_RESET
          || code == WebRequestError.ERROR_CONNECTION_REFUSED
          || code == WebRequestError.ERROR_NET_INTERRUPT) {
        return new java.net.ConnectException(cause.getMessage());
      }
    }
    return cause instanceof IOException ? (IOException) cause : new IOException(cause.getMessage());
  }
}
