/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.samples.relay

import android.os.Bundle
import android.view.View
import android.widget.TextView
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import mozilla.appservices.fxaclient.FxaConfig
import mozilla.appservices.fxaclient.FxaServer
import mozilla.components.concept.sync.AccountObserver
import mozilla.components.concept.sync.AuthType
import mozilla.components.concept.sync.DeviceConfig
import mozilla.components.concept.sync.DeviceType
import mozilla.components.concept.sync.OAuthAccount
import mozilla.components.concept.sync.Profile
import mozilla.components.lib.fetch.httpurlconnection.HttpURLConnectionClient
import mozilla.components.lib.state.ext.flow
import mozilla.components.service.fxa.FxaAuthData
import mozilla.components.service.fxa.PeriodicSyncConfig
import mozilla.components.service.fxa.SyncConfig
import mozilla.components.service.fxa.SyncEngine
import mozilla.components.service.fxa.manager.FxaAccountManager
import mozilla.components.service.fxa.manager.SCOPE_PROFILE
import mozilla.components.service.fxa.manager.SCOPE_SESSION
import mozilla.components.service.fxa.manager.SCOPE_SYNC
import mozilla.components.service.fxa.sync.SyncReason
import mozilla.components.service.fxa.toAuthType
import mozilla.components.service.fxrelay.eligibility.Eligible
import mozilla.components.service.fxrelay.eligibility.Ineligible
import mozilla.components.service.fxrelay.eligibility.RelayEligibilityStore
import mozilla.components.service.fxrelay.eligibility.RelayFeature
import mozilla.components.support.AppServicesInitializer
import mozilla.components.support.base.log.Log
import mozilla.components.support.base.log.sink.AndroidLogSink
import mozilla.components.support.ktx.android.view.setupPersistentInsets
import mozilla.components.support.rusthttp.RustHttpConfig
import mozilla.components.support.rustlog.RustLog

const val CLIENT_ID = "3c49430b43dfba77"
const val CONFIG_URL = "https://accounts.firefox.com"
const val REDIRECT_URL = "$CONFIG_URL/oauth/success/3c49430b43dfba77"
const val SCOPE_RELAY = "https://identity.mozilla.com/apps/relay"

/**
 * The main activity of the project.
 */
open class MainActivity : AppCompatActivity(), LoginFragment.OnLoginCompleteListener {
    private val accountManager by lazy {
        FxaAccountManager(
            applicationContext,
            FxaConfig(FxaServer.Release, CLIENT_ID, REDIRECT_URL),
            DeviceConfig("A-C Relay Sample", DeviceType.MOBILE, setOf()),
            SyncConfig(setOf(SyncEngine.Passwords), PeriodicSyncConfig()),
            setOf(
                SCOPE_SYNC,
                SCOPE_SESSION,
                SCOPE_RELAY,
                SCOPE_PROFILE,
            ),
        )
    }

    private val relayEligibilityStore by lazy { RelayEligibilityStore() }
    private val relayFeature by lazy {
        RelayFeature(
            accountManager = accountManager,
            store = relayEligibilityStore,
        )
    }
    private val accountObserver = object : AccountObserver {
        override fun onAuthenticated(account: OAuthAccount, authType: AuthType) {
            lifecycleScope.launch {
                accountManager.syncNow(SyncReason.User)
            }
        }

        override fun onProfileUpdated(profile: Profile) {
            lifecycleScope.launch {
                displayProfile(profile = profile)
            }
        }

        override fun onAuthenticationProblems() {
            lifecycleScope.launch {
                Toast.makeText(this@MainActivity, "Account auth problem", Toast.LENGTH_LONG).show()
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        enableEdgeToEdge()
        window.setupPersistentInsets(true)

        // initializing app services
        AppServicesInitializer.init(AppServicesInitializer.Config(null))
        RustHttpConfig.setClient(lazy { HttpURLConnectionClient() })

        // enabling logging
        RustLog.enable()
        Log.addSink(AndroidLogSink())

        // initializing account manager
        accountManager.register(accountObserver, owner = this, autoPause = true)
        lifecycleScope.launch {
            accountManager.start()
        }

        initViews()
        observeRelayEligibility()
    }

    private fun initViews() {
        findViewById<View>(R.id.buttonWebView).setOnClickListener {
            lifecycleScope.launch {
                val authUrl = accountManager.beginAuthentication(entrypoint = SampleFxAEntryPoint.HomeMenu)
                if (authUrl == null) {
                    Toast.makeText(
                        this@MainActivity,
                        "Couldn't get the authUrl. Already logged in?",
                        Toast.LENGTH_LONG,
                    ).show()
                    return@launch
                }
                openWebView(authUrl)
            }
        }

        findViewById<View>(R.id.buttonLogout).setOnClickListener {
            lifecycleScope.launch {
                accountManager.logout()
                val txtView: TextView = findViewById(R.id.txtView)
                txtView.text = getString(R.string.logged_out)
            }
        }

        findViewById<View>(R.id.buttonRelayAddresses).setOnClickListener {
            lifecycleScope.launch {
                val eligibilityState = relayEligibilityStore.state.eligibilityState

                val message = if (eligibilityState is Eligible) {
                    val emailMasks = relayFeature.fetchEmailMasks()
                    if (emailMasks == null) {
                        "Failed to fetch email masks"
                    } else {
                        "Fetched ${emailMasks.size} email masks"
                    }
                } else {
                    "Not eligible for Relay (state=$eligibilityState)"
                }

                Toast.makeText(applicationContext, message, Toast.LENGTH_SHORT).show()
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        accountManager.unregister(accountObserver)
    }

    override fun onLoginComplete(code: String, state: String, action: String, fragment: LoginFragment) {
        lifecycleScope.launch {
            val authType = action.takeIf { it.isNotEmpty() }?.toAuthType() ?: AuthType.Signin
            accountManager.finishAuthentication(
                FxaAuthData(authType, code = code, state = state),
            )
            supportFragmentManager.popBackStack()
        }
    }

    private fun openWebView(url: String) {
        supportFragmentManager.beginTransaction().apply {
            replace(R.id.container, LoginFragment.create(url, REDIRECT_URL))
            addToBackStack(null)
            commit()
        }
    }

    private fun displayProfile(profile: Profile) {
        val txtView: TextView = findViewById(R.id.txtView)
        txtView.text = getString(R.string.signed_in, "${profile.displayName ?: ""} ${profile.email}")
    }

    private fun observeRelayEligibility() {
        lifecycleScope.launch {
            relayEligibilityStore.flow().collectLatest { state ->
                val msg = when (val e = state.eligibilityState) {
                    is Ineligible.FirefoxAccountNotLoggedIn -> "Relay: not logged in"
                    is Ineligible.NoRelay -> "Relay: not eligible / no Relay"
                    is Eligible.Free -> "Relay: eligible (free), remaining=${e.totalMasksUsed}"
                    is Eligible.Premium -> "Relay: eligible (premium)"
                }
                findViewById<TextView>(R.id.txtView).text = msg
            }
        }
    }

    override fun onStart() {
        super.onStart()
        relayFeature.start()
    }

    override fun onStop() {
        relayFeature.stop()
        super.onStop()
    }
}
