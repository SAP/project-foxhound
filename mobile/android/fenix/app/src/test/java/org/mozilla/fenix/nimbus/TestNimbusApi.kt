package org.mozilla.fenix.nimbus

import android.content.Context
import android.view.View
import androidx.lifecycle.LifecycleOwner
import kotlinx.coroutines.Job
import mozilla.components.service.nimbus.NimbusApi
import org.mozilla.experiments.nimbus.NimbusInterface

/**
 * Test variant of [mozilla.components.service.nimbus.NimbusApi]. This class exists so that
 * we can easily create fake implementations of [NimbusApi] for tests without having to override or
 * so many functions
 */
abstract class TestNimbusApi(
    val testContext: Context,
) : NimbusApi {

    override fun register(observer: NimbusInterface.Observer) = Unit

    override fun register(
        observer: NimbusInterface.Observer,
        owner: LifecycleOwner,
        autoPause: Boolean,
    ) = Unit

    override fun register(observer: NimbusInterface.Observer, view: View) = Unit

    override fun unregister(observer: NimbusInterface.Observer) = Unit

    override fun unregisterObservers() = Unit

    override fun notifyObservers(block: NimbusInterface.Observer.() -> Unit) = Unit

    override fun notifyAtLeastOneObserver(block: NimbusInterface.Observer.() -> Unit) = Unit

    override fun pauseObserver(observer: NimbusInterface.Observer) = Unit

    override fun resumeObserver(observer: NimbusInterface.Observer) = Unit

    override fun <R> wrapConsumers(block: NimbusInterface.Observer.(R) -> Boolean): List<(R) -> Boolean> {
        return listOf()
    }

    override fun isObserved(): Boolean {
        return false
    }

    override fun applyPendingExperiments(): Job {
        return Job()
    }

    override val context: Context
        get() = testContext

        override var experimentParticipation: Boolean = true
        override var rolloutParticipation: Boolean = true
}
