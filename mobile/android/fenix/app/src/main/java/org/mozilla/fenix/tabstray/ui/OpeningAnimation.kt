/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

@file:OptIn(ExperimentalSharedTransitionApi::class)

package org.mozilla.fenix.tabstray.ui

import android.graphics.Path
import android.view.animation.PathInterpolator
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.BoundsTransform
import androidx.compose.animation.ContentTransform
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.SharedTransitionLayout
import androidx.compose.animation.SizeTransform
import androidx.compose.animation.core.Easing
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.keyframes
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.unit.dp
import androidx.compose.ui.util.trace
import mozilla.components.browser.state.state.TabSessionState
import org.mozilla.fenix.compose.TabThumbnail
import org.mozilla.fenix.tabstray.TabsTrayTraceTag.TRACE_NAME_ANIMATION_TAB_MANAGER_TO_THUMBNAIL
import org.mozilla.fenix.tabstray.TabsTrayTraceTag.TRACE_NAME_ANIMATION_THUMBNAIL_TO_TAB_MANAGER
import kotlin.math.min

private const val SHARED_ELEMENT_DURATION = 200
private const val SHARED_ELEMENT_DELAY = 25
private const val DURATION_ENTER = 200
private const val DURATION_EXIT = 50

// These were largely inspired by the M3 animation docs
// https://m3.material.io/styles/motion/easing-and-duration/tokens-specs#cbea5c6e-7b0d-47a0-98c3-767080a38d95
private val EmphasizedDecelerateEasing =
    Easing { fraction -> emphasizedDecelerate.getInterpolation(fraction) }
private val EmphasizedAccelerateEasing =
    Easing { fraction -> emphasizedAccelerate.getInterpolation(fraction) }
private val emphasizedDecelerate = PathInterpolator(0.05f, 0.7f, 0.1f, 1f)
private val emphasizedAccelerate = PathInterpolator(0.3f, 0f, 0.8f, 0.15f)
private val emphasizedPath = Path().apply {
    moveTo(0f, 0f)
    cubicTo(0.05f, 0f, 0.133333f, 0.06f, 0.166666f, 0.4f)
    cubicTo(0.208333f, 0.82f, 0.25f, 1f, 1f, 1f)
}
private val emphasized = PathInterpolator(emphasizedPath)
private val EmphasizedEasing: Easing = Easing { fraction -> emphasized.getInterpolation(fraction) }

/**
 * The animation spec for the Tab Manager transitioning from the fullscreen tab thumbnail -> Tab Manager UI
 * and the Tab Manager UI -> fullscreen tab thumbnail.
 *
 * Fullscreen tab thumbnail -> Tab Manager UI [TabManagerAnimationState.ThumbnailToTabManager]
 * The thumbnail shrinks down and locks into its place in the tab grid/list.
 * The Tab Manager UI is rendered behind the thumbnail and is revealed as the thumbnail shrinks down.
 *
 *
 * Tab Manager UI -> Fullscreen tab thumbnail [TabManagerAnimationState.TabManagerToThumbnail]
 * The thumbnail is enlarged to fit the screen (minus chrome padding).
 * The Tab Manager UI fades out.
 *
 */
private typealias TabManagerAnimationTransitionScope = AnimatedContentTransitionScope<TabManagerAnimationState>
private val TabManagerTransitionSpec: TabManagerAnimationTransitionScope.() -> ContentTransform = {
    when (targetState) {
        is TabManagerAnimationState.TabManagerToThumbnail -> scaleIn( // Thumbnail bounds enter spec
            tween(
                durationMillis = DURATION_ENTER,
                easing = EmphasizedDecelerateEasing,
            ),
        ) togetherWith fadeOut( // Tab manager exit spec
            tween(
                durationMillis = DURATION_EXIT,
                easing = EmphasizedAccelerateEasing,
            ),
        ) using SizeTransform { _, _ ->
            tween(
                durationMillis = SHARED_ELEMENT_DURATION,
                easing = EmphasizedEasing,
            )
        }
        TabManagerAnimationState.ThumbnailToTabManager -> fadeIn( // Tab manager enter spec
            tween(
                durationMillis = DURATION_ENTER,
                easing = EmphasizedDecelerateEasing,
                delayMillis = SHARED_ELEMENT_DELAY,
            ),
        ) togetherWith scaleOut( // Thumbnail exit spec
            tween(
                durationMillis = DURATION_EXIT,
                easing = EmphasizedAccelerateEasing,
            ),
        ) using SizeTransform { _, _ ->
            tween(
                durationMillis = SHARED_ELEMENT_DURATION,
                easing = EmphasizedEasing,
            )
        }
    }
}

/**
 * Wrapper layout which handles the opening animation for the Tab Manager.
 *
 * When first opened, the Tab Manager will perform a shared element transition to animate the tab
 * thumbnail locking into place into the Tab Manager.
 *
 * @param tabManagerAnimationHelper The [TabManagerAnimationHelper] used to determine whether to perform
 * the transition and what specs to use.
 * @param onExitTransitionCompleted Callback invoked when the exit animation has completed.
 * @param content The Tab Manager content, typically [org.mozilla.fenix.tabstray.ui.tabstray.TabsTray].
 */
@Composable
internal fun TabManagerTransitionLayout(
    tabManagerAnimationHelper: TabManagerAnimationHelper,
    onExitTransitionCompleted: () -> Unit,
    content: @Composable () -> Unit,
) {
    LaunchedEffect(Unit) {
        // On first run, kick-off the transition from the fullscreen thumbnail to the Tab Manager UI
        tabManagerAnimationHelper.transitionToTabManager()
    }

    SharedTransitionLayout(modifier = Modifier.fillMaxSize()) {
        AnimatedContent(
            targetState = tabManagerAnimationHelper.state,
            transitionSpec = TabManagerTransitionSpec,
            label = "TabManagerSharedElement",
        ) { targetState ->
            CompositionLocalProvider(
                LocalTabManagerAnimationScope provides TabManagerAnimationScopeImpl(
                    sharedTransitionScope = this@SharedTransitionLayout,
                    animatedContentScope = this@AnimatedContent,
                ),
            ) {
                when (targetState) {
                    is TabManagerAnimationState.TabManagerToThumbnail -> {
                        trace(TRACE_NAME_ANIMATION_TAB_MANAGER_TO_THUMBNAIL) {
                            TabManagerSharedElementThumbnail(
                                transitionTab = targetState.tab,
                                transitionPaddingValues = tabManagerAnimationHelper.transitionPaddingValues,
                            )
                        }
                    }
                    TabManagerAnimationState.ThumbnailToTabManager -> {
                        trace(TRACE_NAME_ANIMATION_THUMBNAIL_TO_TAB_MANAGER) {
                            DisposableEffect(Unit) {
                                onDispose {
                                    onExitTransitionCompleted.invoke()
                                }
                            }

                            content()
                        }
                    }
                }
            }
        }
    }
}

/**
 * The fullscreen tab thumbnail UI used for the shared element transition.
 *
 * @param transitionTab The [TabSessionState] of the tab being animated.
 * @param transitionPaddingValues The [PaddingValues] to block the animated content and account for
 * any app chrome, such as the Toolbar.
 */
@Composable
private fun TabManagerSharedElementThumbnail(
    transitionTab: TabSessionState,
    transitionPaddingValues: PaddingValues,
) {
    BoxWithConstraints(
        modifier = Modifier
            .windowInsetsPadding(insets = WindowInsets.safeDrawing)
            .padding(transitionPaddingValues)
            .fillMaxSize(),
    ) {
        val thumbnailWidth = constraints.maxWidth
        val thumbnailHeight = constraints.maxHeight
        val thumbnailSize = min(thumbnailWidth, thumbnailHeight)

        TabThumbnail(
            tab = transitionTab,
            thumbnailSizePx = thumbnailSize,
            modifier = Modifier
                .sharedTabTransition(
                    tab = transitionTab,
                    boundsTransform = TabManagerToThumbnailTransform,
                )
                .fillMaxSize(),
            shape = RoundedCornerShape(size = 0.dp),
        )
    }
}

/**
 * [Modifier] for linking the shared element transition UI between the fullscreen thumbnail and the
 * thumbnails in the tab grid/list.
 */
@Composable
internal fun Modifier.sharedTabTransition(
    tab: TabSessionState,
    boundsTransform: BoundsTransform = ThumbnailToTabManagerTransform,
) = composed {
    with(LocalTabManagerAnimationScope.current ?: return@composed Modifier) {
        this@sharedTabTransition.then(
            Modifier.sharedElement(
                boundsTransform = boundsTransform,
                sharedContentState = rememberSharedContentState(key = tab.id),
                animatedVisibilityScope = this@with,
            ),
        )
    }
}

/**
 * [BoundsTransform] when transitioning from the Tab Manager to the fullscreen thumbnail.
 *
 * This will perform a simple size [tween] animation between the start and end bounds.
 */
private val TabManagerToThumbnailTransform = BoundsTransform { _, _ ->
    tween(
        durationMillis = SHARED_ELEMENT_DURATION,
        easing = FastOutSlowInEasing,
    )
}

/**
 * [BoundsTransform] when transitioning from the fullscreen thumbnail to the Tab Manager.
 *
 * This will perform a shrink and translation so the thumbnail is roughly centered over its spot in
 * the Tab Manager.
 */
private val ThumbnailToTabManagerTransform = BoundsTransform { initialBounds, targetBounds ->
    keyframes {
        fun flerp(a: Float, b: Float, t: Float) = a + (b - a) * t

        fun rectWithCenterAndSize(center: Offset, size: Size): Rect {
            val tl = Offset(center.x - size.width / 2f, center.y - size.height / 2f)
            return Rect(tl, size)
        }

        durationMillis = SHARED_ELEMENT_DURATION
//        durationMillis = 3000
        // Initial state
        initialBounds at 0 using FastOutSlowInEasing
        initialBounds at SHARED_ELEMENT_DELAY // render but delay 50ms
//        initialBounds at 0 using EmphasizedAccelerateEasing
//        initialBounds at 0 using FastOutSlowInEasing

        // Shrink to 70% of the initial size and move 80% of the way to the center of the target bounds
        // by 60% of the animation time
        val phase2Size = Size(
            width = flerp(initialBounds.width, targetBounds.width, 0.7f),
            height = flerp(initialBounds.height, targetBounds.height, 0.7f),
        )
        val midCenter2 = Offset(
            x = flerp(initialBounds.center.x, targetBounds.center.x, 0.8f),
            y = flerp(initialBounds.center.y, targetBounds.center.y, 0.8f),
        )
        val phase2Rect = rectWithCenterAndSize(midCenter2, phase2Size)
        phase2Rect atFraction 0.6f

        // Finish shrinking the thumbnail to the target bounds
        targetBounds atFraction 1.0f
    }
}
