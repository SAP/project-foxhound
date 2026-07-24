/* -*- Mode: Java; c-basic-offset: 4; tab-width: 20; indent-tabs-mode: nil; -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.geckoview;

import androidx.annotation.NonNull;
import org.mozilla.gecko.util.ThreadUtils;

/** Manges the page content extraction */
@ExperimentalGeckoViewApi
public class PageExtractionController {

  /**
   * Session page extractor coordinates session messaging between the page extractor actor and
   * GeckoView.
   *
   * <p>Performs page extraction actions that are dependent on the page.
   */
  @ExperimentalGeckoViewApi
  public static class SessionPageExtractor {

    // Events dispatched to GeckoViewPageExtractor
    private static final String GET_TEXT_CONTENT_EVENT = "GeckoView:PageExtractor:GetTextContent";

    private static final String GET_TEXT_CONTENT_RESULT_KEY = "text";

    private final GeckoSession mSession;

    /**
     * Construct a new page extractor session.
     *
     * @param session that will be dispatching and receiving events.
     */
    public SessionPageExtractor(final GeckoSession session) {
      mSession = session;
    }

    /**
     * Gets the page content for the current page.
     *
     * @return the content of the current page as a {@link String} or a {@link
     *     PageExtractionException} if an error occurs while extracting the page content
     */
    @HandlerThread
    public @NonNull GeckoResult<String> getPageContent() {
      ThreadUtils.assertOnHandlerThread();
      return mSession
          .getEventDispatcher()
          .queryBundle(GET_TEXT_CONTENT_EVENT)
          .then(
              result -> {
                if (result == null)
                  return GeckoResult.fromException(
                      new PageExtractionException(PageExtractionException.ERROR_NULL_RESULT));

                final String textContent = result.getString(GET_TEXT_CONTENT_RESULT_KEY);
                if (textContent == null)
                  return GeckoResult.fromException(
                      new PageExtractionException(PageExtractionException.ERROR_MALFORMED_RESULT));

                return GeckoResult.fromValue(textContent);
              },
              exception ->
                  GeckoResult.fromException(
                      new PageExtractionException(
                          PageExtractionException.ERROR_UNKNOWN, exception)));
    }
  }

  /** The exception thrown when a page extraction fails */
  public static class PageExtractionException extends Exception {

    /** An error identifier for when the result is unexpectedly null */
    public static final String ERROR_NULL_RESULT = "NULL_RESULT";

    /** An error identifier for when the result is malformed e.g. the `text` key is missing */
    public static final String ERROR_MALFORMED_RESULT = "MALFORMED_RESULT";

    /**
     * An error identifier for when an unknown error occurs. This is likely to happen if an error
     * occurs in the toolkit layer that we don't know already know of.
     */
    public static final String ERROR_UNKNOWN = "UNKNOWN_ERROR";

    /**
     * The type of the error. One of {@link #ERROR_NULL_RESULT}, {@link #ERROR_MALFORMED_RESULT} or
     * {@link #ERROR_UNKNOWN}
     */
    @NonNull public final String errorType;

    /**
     * Construct a new page extraction exception.
     *
     * @param errorType the type of the error. One of {@link #ERROR_NULL_RESULT}, {@link
     *     #ERROR_MALFORMED_RESULT} or {@link #ERROR_UNKNOWN}
     */
    public PageExtractionException(@NonNull final String errorType) {
      super("Unable to extract page content: " + errorType);
      this.errorType = errorType;
    }

    /**
     * Construct a new page extraction exception.
     *
     * @param errorType the type of error. One of {@link #ERROR_NULL_RESULT}, {@link
     *     #ERROR_MALFORMED_RESULT} or {@link #ERROR_UNKNOWN}
     * @param cause the cause of the error
     */
    public PageExtractionException(@NonNull final String errorType, final Throwable cause) {
      super("Unable to extract page content: " + errorType, cause);
      this.errorType = errorType;
    }
  }
}
