/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package mozilla.components.compose.base.theme

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp

internal val AcornShapes = Shapes(
    extraSmall = RoundedCornerShape(AcornCorners.extraSmall),
    small = RoundedCornerShape(AcornCorners.small),
    medium = RoundedCornerShape(AcornCorners.medium),
    large = RoundedCornerShape(AcornCorners.large),
    extraLarge = RoundedCornerShape(AcornCorners.extraLarge),
)

@Composable
@Preview
private fun AcornShapesPreview() {
    AcornTheme {
        Surface {
            Column(modifier = Modifier.padding(16.dp)) {
                ShapeItem("None (0dp)", RoundedCornerShape(AcornCorners.none))

                ShapeItem("Extra Small (4dp)", RoundedCornerShape(AcornCorners.extraSmall))
                ShapeItem("Extra Small (4dp)", MaterialTheme.shapes.extraSmall)

                ShapeItem("Small (8dp)", RoundedCornerShape(AcornCorners.small))
                ShapeItem("Small (8dp)", MaterialTheme.shapes.small)

                ShapeItem("Medium (12dp)", RoundedCornerShape(AcornCorners.medium))
                ShapeItem("Medium (12dp)", MaterialTheme.shapes.medium)

                ShapeItem("Large (16dp)", RoundedCornerShape(AcornCorners.large))
                ShapeItem("Large (16dp)", MaterialTheme.shapes.large)

                ShapeItem("Extra Large (28dp)", RoundedCornerShape(AcornCorners.extraLarge))
                ShapeItem("Extra Large (28dp)", MaterialTheme.shapes.extraLarge)

                ShapeItem("Full (1000dp)", RoundedCornerShape(AcornCorners.full))
            }
        }
    }
}

@Composable
private fun ShapeItem(label: String, shape: Shape) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.padding(vertical = 8.dp),
    ) {
        Box(
            modifier = Modifier
                .size(64.dp)
                .background(color = MaterialTheme.colorScheme.primary, shape = shape),
        )

        Spacer(Modifier.width(16.dp))

        Text(text = label, style = AcornTheme.typography.body2)
    }
}
