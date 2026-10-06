/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.menu.share

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import androidx.appcompat.content.res.AppCompatResources
import androidx.core.graphics.createBitmap
import com.google.zxing.EncodeHintType
import com.google.zxing.WriterException
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel
import com.google.zxing.qrcode.encoder.ByteMatrix
import com.google.zxing.qrcode.encoder.Encoder
import com.google.zxing.qrcode.encoder.QRCode
import org.mozilla.fenix.R
import kotlin.math.max
import kotlin.math.min

/**
 * Utility class to generate QR codes.
 */
class QRCodeGenerator {

    /**
     * Generates a QR code image as a [Bitmap] based on the provided text and dimensions.
     *
     * @throws [WriterException] if QR encoding fails because of invalid content or configuration.
     */
    fun generateQRCodeImage(
        text: String,
        width: Int,
        height: Int,
        context: Context,
    ): Bitmap {
        val encodingHints: MutableMap<EncodeHintType, Any> = HashMap()
        encodingHints[EncodeHintType.CHARACTER_SET] = "UTF-8"
        val code: QRCode = Encoder.encode(text, ErrorCorrectionLevel.H, encodingHints)
        return renderQRImage(code, width, height, context)
    }

    /** Renders the QR code as a [Bitmap] image with custom styling, including circular modules and a centered logo. */
    private fun renderQRImage(code: QRCode, width: Int, height: Int, context: Context): Bitmap {
        val bitmap = createBitmap(width, height)
        val canvas = Canvas(bitmap)
        val input: ByteMatrix = code.matrix ?: throw IllegalStateException()
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        val inputWidth = input.width
        val inputHeight = input.height

        paint.style = Paint.Style.FILL
        paint.color = Color.BLACK

        drawBackground(canvas, width, height, context)

        val qrWidth = inputWidth + (QUIET_ZONE * 2)
        val qrHeight = inputHeight + (QUIET_ZONE * 2)
        val outputWidth = max(width, qrWidth)
        val outputHeight = max(height, qrHeight)

        // Calculate scaling factors and padding
        val multiple = min(outputWidth / qrWidth, outputHeight / qrHeight)
        val leftPadding = (outputWidth - (inputWidth * multiple)) / 2
        val topPadding = (outputHeight - (inputHeight * multiple)) / 2

        // Iterate through each QR code module
        transformToCircularQRSegments(inputHeight, topPadding, multiple, inputWidth, leftPadding, input, canvas, paint)

        // Draw finder patterns
        drawFinderPatterns(multiple, canvas, paint, leftPadding, topPadding, inputWidth, inputHeight)

        addLogoToCenter(bitmap.width, bitmap.height, canvas, paint, context)

        return bitmap
    }

    private fun drawBackground(
        canvas: Canvas,
        width: Int,
        height: Int,
        context: Context,
    ) {
        canvas.drawRoundRect(
            RectF(0f, 0f, width.toFloat(), height.toFloat()),
            BORDER_RADIUS,
            BORDER_RADIUS,
            Paint().apply {
                color = context.getColor(R.color.fx_mobile_outline_variant)
                style = Paint.Style.FILL
            },
        )
        canvas.drawRoundRect(
            RectF(1f, 1f, width.toFloat() - 1, height.toFloat() - 1),
            BORDER_RADIUS,
            BORDER_RADIUS,
            Paint().apply {
                color = Color.WHITE
                style = Paint.Style.FILL
            },
        )
    }

    private fun addLogoToCenter(
        width: Int,
        height: Int,
        canvas: Canvas,
        paint: Paint,
        context: Context,
    ) {
        val centeredBitmapBackground = createBitmap(BACKGROUND_SIZE, BACKGROUND_SIZE)
        val centeredCanvasBackground = Canvas(centeredBitmapBackground)
        centeredCanvasBackground.drawRoundRect(
            RectF(0f, 0f, BACKGROUND_SIZE.toFloat(), BACKGROUND_SIZE.toFloat()),
            LOGO_BACKGROUND_CORNER_RADIUS,
            LOGO_BACKGROUND_CORNER_RADIUS,
            paint.apply { color = context.getColor(R.color.fx_mobile_primary) },
        )

        val centerXBg: Float = (width - centeredBitmapBackground.width) * 0.5f
        val centerYBg: Float = (height - centeredBitmapBackground.height) * 0.5f
        canvas.drawBitmap(centeredBitmapBackground, centerXBg, centerYBg, paint)

        val firefoxIcon = AppCompatResources.getDrawable(context, R.drawable.expressive_firefox)
        val centeredBitmap = createBitmap(LOGO_SIZE, LOGO_SIZE)
        val centeredCanvas = Canvas(centeredBitmap)
        firefoxIcon?.setBounds(0, 0, LOGO_SIZE, LOGO_SIZE)
        firefoxIcon?.draw(centeredCanvas)
        val centerXLogo: Float = (width - centeredBitmap.width) * 0.5f
        val centerYLogo: Float = centerYBg + centeredBitmapBackground.height - centeredBitmap.height
        canvas.drawBitmap(centeredBitmap, centerXLogo, centerYLogo, paint)
    }

    @Suppress("LongParameterList")
    private fun transformToCircularQRSegments(
        inputHeight: Int,
        topPadding: Int,
        multiple: Int,
        inputWidth: Int,
        leftPadding: Int,
        input: ByteMatrix,
        canvas: Canvas,
        paint: Paint,
    ) {
        val circleSize = (multiple * CIRCLE_SCALE_DOWN_FACTOR).toInt()
        for (inputY in 0 until inputHeight) {
            var outputY = topPadding
            outputY += multiple * inputY
            for (inputX in 0 until inputWidth) {
                var outputX = leftPadding
                outputX += multiple * inputX
                drawIfOutsideCenter(
                    input,
                    inputX,
                    inputY,
                    inputWidth,
                    inputHeight,
                    canvas,
                    outputX,
                    outputY,
                    circleSize,
                    paint,
                )
            }
        }
    }

    @Suppress("LongParameterList")
    private fun drawIfOutsideCenter(
        input: ByteMatrix,
        inputX: Int,
        inputY: Int,
        inputWidth: Int,
        inputHeight: Int,
        canvas: Canvas,
        outputX: Int,
        outputY: Int,
        circleSize: Int,
        paint: Paint,
    ) {
        if (input.get(inputX, inputY).toInt() == 1 &&
            !isInFinderPatternRegion(inputX, inputY, inputWidth, inputHeight)
        ) {
            val overlapsCenter = doesOverlapCenter(canvas, outputX, outputY, circleSize)
            if (!overlapsCenter) {
                canvas.drawOval(
                    RectF(
                        outputX.toFloat(),
                        outputY.toFloat(),
                        (outputX + circleSize).toFloat(),
                        (outputY + circleSize).toFloat(),
                    ),
                    paint,
                )
            }
        }
    }

    private fun isInFinderPatternRegion(inputX: Int, inputY: Int, inputWidth: Int, inputHeight: Int): Boolean =
        (inputX <= FINDER_PATTERN_SIZE && inputY <= FINDER_PATTERN_SIZE) ||
            (inputX >= inputWidth - FINDER_PATTERN_SIZE && inputY <= FINDER_PATTERN_SIZE) ||
            (inputX <= FINDER_PATTERN_SIZE && inputY >= inputHeight - FINDER_PATTERN_SIZE)

    private fun doesOverlapCenter(
        canvas: Canvas,
        outputX: Int,
        outputY: Int,
        circleSize: Int,
    ): Boolean {
        val centerLeft = (canvas.width - CENTRE_QUIET_ZONE) / 2
        val centerTop = (canvas.height - CENTRE_QUIET_ZONE) / 2
        val centerRight = centerLeft + CENTRE_QUIET_ZONE
        val centerBottom = centerTop + CENTRE_QUIET_ZONE
        val ovalRight = outputX + circleSize
        val ovalBottom = outputY + circleSize
        return ovalRight > centerLeft && outputX < centerRight && ovalBottom > centerTop && outputY < centerBottom
    }

    private fun drawFinderPatterns(
        multiple: Int,
        canvas: Canvas,
        paint: Paint,
        leftPadding: Int,
        topPadding: Int,
        inputWidth: Int,
        inputHeight: Int,
    ) {
        val circleDiameter = multiple * FINDER_PATTERN_SIZE
        drawFinderPatternCircleStyle(canvas, paint, leftPadding, topPadding, circleDiameter)
        drawFinderPatternCircleStyle(
            canvas,
            paint,
            leftPadding + (inputWidth - FINDER_PATTERN_SIZE) * multiple,
            topPadding,
            circleDiameter,
        )
        drawFinderPatternCircleStyle(
            canvas,
            paint,
            leftPadding,
            topPadding + (inputHeight - FINDER_PATTERN_SIZE) * multiple,
            circleDiameter,
        )
    }

    private fun drawFinderPatternCircleStyle(
        canvas: Canvas,
        paint: Paint,
        x: Int,
        y: Int,
        circleDiameter: Int,
    ) {
        val whiteCircleDiameter = circleDiameter * 5 / 7
        val whiteCircleOffset = circleDiameter / 7
        val middleDotDiameter = circleDiameter * 3 / 7
        val middleDotOffset = circleDiameter * 2 / 7

        paint.color = Color.BLACK
        canvas.drawOval(
            RectF(
                x.toFloat(),
                y.toFloat(),
                (x + circleDiameter).toFloat(),
                (y + circleDiameter).toFloat(),
            ),
            paint,
        )

        paint.color = Color.WHITE
        canvas.drawOval(
            RectF(
                (x + whiteCircleOffset).toFloat(),
                (y + whiteCircleOffset).toFloat(),
                (x + whiteCircleOffset + whiteCircleDiameter).toFloat(),
                (y + whiteCircleOffset + whiteCircleDiameter).toFloat(),
            ),
            paint,
        )

        paint.color = Color.BLACK
        val diamondPath = android.graphics.Path().apply {
            moveTo(
                (x + middleDotOffset + middleDotDiameter / 2).toFloat(),
                (y + middleDotOffset).toFloat(),
            )
            lineTo(
                (x + middleDotOffset + middleDotDiameter).toFloat(),
                (y + middleDotOffset + middleDotDiameter / 2).toFloat(),
            )
            lineTo(
                (x + middleDotOffset + middleDotDiameter / 2).toFloat(),
                (y + middleDotOffset + middleDotDiameter).toFloat(),
            )
            lineTo(
                (x + middleDotOffset).toFloat(),
                (y + middleDotOffset + middleDotDiameter / 2).toFloat(),
            )
            close()
        }
        canvas.drawPath(diamondPath, paint)
    }

    companion object {
        const val FINDER_PATTERN_SIZE = 7
        const val CIRCLE_SCALE_DOWN_FACTOR = 21f / 30f
        const val QUIET_ZONE = 4
        const val CENTRE_QUIET_ZONE = 70
        const val BORDER_RADIUS = 16f
        const val LOGO_SIZE = 48
        const val BACKGROUND_SIZE = 56
        const val LOGO_BACKGROUND_CORNER_RADIUS = 8f
    }
}
