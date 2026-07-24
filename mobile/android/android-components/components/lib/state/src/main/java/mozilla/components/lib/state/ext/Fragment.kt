/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.lib.state.ext

import android.view.View
import androidx.annotation.MainThread
import androidx.fragment.app.Fragment
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.flowWithLifecycle
import kotlinx.coroutines.channels.consumeEach
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.launch
import kotlinx.coroutines.yield
import mozilla.components.lib.state.Action
import mozilla.components.lib.state.State
import mozilla.components.lib.state.Store
import mozilla.components.support.ktx.android.view.toScope

/**
 * Helper extension method for consuming [State] from a [Store] sequentially in order inside a
 * [Fragment]. The [block] function will get invoked for every [State] update.
 *
 * This helper will automatically stop observing the [Store] once the [View] of the [Fragment] gets
 * detached. The fragment's lifecycle will be used to determine when to resume/pause observing the
 * [Store].
 */
@MainThread
fun <S : State, A : Action> Fragment.consumeFrom(store: Store<S, A>, block: (S) -> Unit) {
    val fragment = this
    val view = checkNotNull(view) { "Fragment has no view yet. Call from onViewCreated()." }

    val scope = view.toScope()
    val channel = store.channel(owner = this)

    scope.launch {
        channel.consumeEach { state ->
            // We are using a scope that is bound to the view being attached here. It can happen
            // that the "view detached" callback gets executed *after* the fragment was detached. If
            // a `consumeFrom` runs in exactly this moment then we run inside a detached fragment
            // without a `Context` and this can cause a variety of issues/crashes.
            // See: https://github.com/mozilla-mobile/android-components/issues/4125
            //
            // To avoid this, we check whether the fragment still has an activity and a view
            // attached. If not then we run in exactly that moment between fragment detach and view
            // detach. It would be better if we could use `viewLifecycleOwner` which is bound to
            // onCreateView() and onDestroyView() of the fragment. But:
            // - `viewLifecycleOwner` is only available in alpha versions of AndroidX currently.
            // - We found a bug where `viewLifecycleOwner.lifecycleScope` is not getting cancelled
            //   causing this coroutine to run forever.
            //   See: https://github.com/mozilla-mobile/android-components/issues/3828
            // Once those two issues get resolved we can remove the `isAdded` check and use
            // `viewLifecycleOwner.lifecycleScope` instead of the view scope.
            //
            // In a previous version we tried using `isAdded` and `isDetached` here. But in certain
            // situations they reported true/false in situations where no activity was attached to
            // the fragment. Therefore we switched to explicitly check for the activity and view here.
            if (fragment.activity != null && fragment.view != null) {
                block(state)
            }
        }
    }
}

/**
 * Helper extension method for consuming [State] from a [Store] as a reactive [Flow],
 * specifically designed for use within a [Fragment]. This function ensures that state
 * observation and processing are lifecycle-aware with respect to the Fragment's view.
 *
 * This function **must be called** when the Fragment's view has been created (e.g., in
 * `onViewCreated()` or later methods like `onStart()`), as it requires the Fragment's `view`
 * to be non-null and uses `viewLifecycleOwner`.
 *
 * @param from The [Store] instance from which to consume states.
 * @param owner The [LifecycleOwner] whose lifecycle dictates the activity of the base
 *   subscription to the `store`. Defaults to `this` Fragment instance.
 * @param block A `suspend` lambda that receives the fully prepared, lifecycle-aware,
 *   and filtered [Flow] of states. You are responsible for `collect`ing this [Flow]
 *   within the `block` to react to state updates (e.g., updating UI).
 */
@MainThread
fun <S : State, A : Action> Fragment.consumeFlow(
    from: Store<S, A>,
    owner: LifecycleOwner? = this,
    block: suspend (Flow<S>) -> Unit,
) {
    val fragment = this
    val view = checkNotNull(view) { "Fragment has no view yet. Call from onViewCreated()." }
    val currentViewLifecycleOwner = this.viewLifecycleOwner

    val storeFlow = from.flow(owner)

    val viewLifecycleAwareFlow = storeFlow.flowWithLifecycle(
        lifecycle = currentViewLifecycleOwner.lifecycle,
        minActiveState = Lifecycle.State.STARTED,
    )

    val viewBoundScope = view.toScope()

    viewBoundScope.launch {
        val filteredFlow = viewLifecycleAwareFlow.filter {
            fragment.activity != null && fragment.view != null
        }

        // Yield to ensure a possible scope cancellation is processed before executing the block.
        yield()

        block(filteredFlow)
    }
}
