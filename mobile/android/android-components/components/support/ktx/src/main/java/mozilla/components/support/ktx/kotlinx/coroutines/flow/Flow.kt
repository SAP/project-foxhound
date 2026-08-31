/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.support.ktx.kotlinx.coroutines.flow

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.asFlow
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.flatMapConcat
import kotlinx.coroutines.flow.flow

/**
 * Returns a [Flow] containing only changed elements of the lists of the original [Flow].
 *
 * ```
 * Example: Identity function
 * Transform: x -> x (transformed values are the same as original)
 * Original Flow: list(0), list(0, 1), list(0, 1, 2, 3), list(4), list(5, 6, 7, 8)
 * Transformed:
 * (0)          -> (0 emitted because it is a new value)
 *
 * (0, 1)       -> (0 not emitted because same as previous value,
 *                  1 emitted because it is a new value),
 *
 * (0, 1, 2, 3) -> (0 and 1 not emitted because same as previous values,
 *                  2 and 3 emitted because they are new values),
 *
 * (4)          -> (4 emitted because because it is a new value)
 *
 * (5, 6, 7, 8) -> (5, 6, 7, 8 emitted because they are all new values)
 * Returned Flow: 0, 1, 2, 3, 4, 5, 6, 7, 8
 * ---
 *
 * Example: Modulo 2
 * Transform: x -> x % 2 (emit changed values if the result of modulo 2 changed)
 * Original Flow: listOf(1), listOf(1, 2), listOf(3, 4, 5), listOf(3, 4)
 * Transformed:
 * (1)          -> (1 emitted because it is a new value)
 *
 * (1, 0)       -> (1 not emitted because same as previous value with the same transformed value,
 *                  2 emitted because it is a new value),
 *
 * (1, 0, 1)    -> (3, 4, 5 emitted because they are all new values)
 *
 * (1, 0)       -> (3, 4 not emitted because same as previous values with same transformed values)
 *
 * Returned Flow: 1, 2, 3, 4, 5
 * ---
 * ```
 */
@OptIn(ExperimentalCoroutinesApi::class) // flatMapConcat
fun <T, R> Flow<List<T>>.filterChanged(transform: (T) -> R): Flow<T> {
    var lastMappedValues: Map<T, R>? = null
    return flatMapConcat { values ->
        val lastMapped = lastMappedValues
        val changed = if (lastMapped == null) {
            values
        } else {
            values.filter {
                !lastMapped.containsKey(it) || lastMapped[it] != transform(it)
            }
        }
        lastMappedValues = values.associateWith { transform(it) }
        changed.asFlow()
    }
}

/**
 * Returns a [Flow] containing only values of the original [Flow] where the result array
 * of calling [transform] contains at least one different value.
 *
 * Example:
 * ```
 * Block: x -> [x[0], x[1]]  // Map to first two characters of input
 * Original Flow: "banana", "bandanna", "bus", "apple", "big", "coconut", "circle", "home"
 * Mapped: [b, a], [b, a], [b, u], [a, p], [b, i], [c, o], [c, i], [h, o]
 * Returned Flow: "banana", "bus, "apple", "big", "coconut", "circle", "home"
 * ``
 */
fun <T> Flow<T>.ifAnyChanged(transform: (T) -> Array<Any?>): Flow<T> {
    var observedValueOnce = false
    var lastMappedValues: Array<Any?>? = null

    return filter { value ->
        val mapped = transform(value)
        val hasChanges = lastMappedValues
            ?.asSequence()
            ?.filterIndexed { i, r -> mapped[i] != r }
            ?.any()

        if (!observedValueOnce || hasChanges == true) {
            lastMappedValues = mapped
            observedValueOnce = true
            true
        } else {
            false
        }
    }
}

/**
 * Partition the elements emitted by the original flow in groups of [size] elements, with each new emission
 * being advanced by [step] elements.
 *
 * @param size the number of elements to take in each window.
 * @param step the number of elements to move forward between windows.
 * @param partialWindows if `true`, windows at the end of the flow that are smaller than [size]
 * will also be emitted.
 */
fun <T> Flow<T>.windowed(size: Int, step: Int, partialWindows: Boolean = false): Flow<List<T>> = flow {
    require(size > 0 && step > 0) { "size and step must be positive, was size=$size, step=$step" }

    val window = ArrayDeque<T>(size)

    /**
     * Helper function to emit the current window and slide it forward by the step size.
     */
    suspend fun emitAndSlide() {
        emit(window.toList())
        repeat(step) {
            if (window.isEmpty()) return@repeat
            window.removeFirst()
        }
    }

    collect { element ->
        window.addLast(element)

        // Emit whenever a full window is ready.
        if (window.size == size) {
            emitAndSlide()
        }
    }

    // Handle any remaining partial windows after the main collection is done.
    if (partialWindows) {
        while (window.isNotEmpty()) {
            emitAndSlide()
        }
    }
}
