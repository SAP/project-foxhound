/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

package org.mozilla.fenix.longfox

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Shows the player's current score in the top end corner.
 */
@Composable
fun ScoreContainer(score: Int) {
    Box(
        modifier = Modifier
            .background(LongFoxColors.backgroundColor)
            .padding(8.dp)
        ,
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = stringResource(R.string.score, score),
            fontFamily = LongFoxText.zx,
            color = Color.White,
            fontWeight = FontWeight.Bold,
            fontSize = 24.sp,
        )
    }
}

@Preview
@Composable
fun ScoreContainerPreview() {
    ScoreContainer(score = 100)
}
