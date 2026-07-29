/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.concept.engine.ai

/**
 * Errors that can occur when interacting with AI features.
 *
 * @param cause The original throwable before it was converted into this error state.
 */
sealed class AIFeaturesError(override val cause: Throwable?) : Exception(cause) {

    /** Default error for unexpected issues. */
    class UnknownError(override val cause: Throwable) : AIFeaturesError(cause)

    /** A null value was received where one was not expected. */
    class UnexpectedNull : AIFeaturesError(null)

    /** AI features are not supported by the engine. */
    class UnsupportedError(override val cause: Throwable) : AIFeaturesError(cause)

    /** The AI feature response could not be parsed. */
    class CouldNotParseError(override val cause: Throwable?) : AIFeaturesError(cause)

    /** The requested AI feature ID is not recognized. */
    class UnknownFeatureError(override val cause: Throwable?) : AIFeaturesError(cause)

    /** The AI feature could not be enabled or blocked. */
    class CouldNotSetError(override val cause: Throwable?) : AIFeaturesError(cause)

    /** The AI feature could not be made available. */
    class CouldNotMakeAvailableError(override val cause: Throwable?) : AIFeaturesError(cause)
}
