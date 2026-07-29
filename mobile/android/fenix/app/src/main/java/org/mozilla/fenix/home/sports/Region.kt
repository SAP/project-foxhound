/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home.sports

import androidx.annotation.StringRes
import org.mozilla.fenix.R

/**
 * A region grouping of participating teams in a sports tournament.
 *
 * @property nameResId String resource ID for the region's display name.
 * @property teams List of participating teams in this region.
 */
data class Region(
    @param:StringRes val nameResId: Int,
    val teams: List<Team>,
)

/**
 * All teams participating in a sports tournament grouped by region.
 */
val regionGrouping: List<Region> = listOf(
    Region(
        nameResId = R.string.sports_widget_confederation_north_america,
        teams = listOf(
            Team(key = "CAN", flagResId = R.drawable.flag_ca),
            Team(key = "MEX", flagResId = R.drawable.flag_mx),
            Team(key = "USA", flagResId = R.drawable.flag_us),
        ),
    ),
    Region(
        nameResId = R.string.sports_widget_confederation_africa,
        teams = listOf(
            Team(key = "ALG", flagResId = R.drawable.flag_dz),
            Team(key = "CPV", flagResId = R.drawable.flag_cv),
            Team(key = "COD", flagResId = R.drawable.flag_cd),
            Team(key = "EGY", flagResId = R.drawable.flag_eg),
            Team(key = "GHA", flagResId = R.drawable.flag_gh),
            Team(key = "CIV", flagResId = R.drawable.flag_ci),
            Team(key = "MAR", flagResId = R.drawable.flag_ma),
            Team(key = "SEN", flagResId = R.drawable.flag_sn),
            Team(key = "RSA", flagResId = R.drawable.flag_za),
            Team(key = "TUN", flagResId = R.drawable.flag_tn),
        ),
    ),
    Region(
        nameResId = R.string.sports_widget_confederation_asia,
        teams = listOf(
            Team(key = "IRN", flagResId = R.drawable.flag_ir),
            Team(key = "IRQ", flagResId = R.drawable.flag_iq),
            Team(key = "JPN", flagResId = R.drawable.flag_jp),
            Team(key = "JOR", flagResId = R.drawable.flag_jo),
            Team(key = "KOR", flagResId = R.drawable.flag_kr),
            Team(key = "QAT", flagResId = R.drawable.flag_qa),
            Team(key = "KSA", flagResId = R.drawable.flag_sa),
            Team(key = "UZB", flagResId = R.drawable.flag_uz),
        ),
    ),
    Region(
        nameResId = R.string.sports_widget_confederation_concacaf,
        teams = listOf(
            Team(key = "CUW", flagResId = R.drawable.flag_cw),
            Team(key = "HAI", flagResId = R.drawable.flag_ht),
            Team(key = "PAN", flagResId = R.drawable.flag_pa),
        ),
    ),
    Region(
        nameResId = R.string.sports_widget_confederation_europe,
        teams = listOf(
            Team(key = "AUT", flagResId = R.drawable.flag_at),
            Team(key = "BEL", flagResId = R.drawable.flag_be),
            Team(key = "BIH", flagResId = R.drawable.flag_ba),
            Team(key = "CRO", flagResId = R.drawable.flag_hr),
            Team(key = "CZE", flagResId = R.drawable.flag_cz),
            Team(key = "ENG", flagResId = R.drawable.flag_eng),
            Team(key = "FRA", flagResId = R.drawable.flag_fr),
            Team(key = "GER", flagResId = R.drawable.flag_de),
            Team(key = "NED", flagResId = R.drawable.flag_nl),
            Team(key = "NOR", flagResId = R.drawable.flag_no),
            Team(key = "POR", flagResId = R.drawable.flag_pt),
            Team(key = "SCO", flagResId = R.drawable.flag_sct),
            Team(key = "ESP", flagResId = R.drawable.flag_es),
            Team(key = "SWE", flagResId = R.drawable.flag_se),
            Team(key = "SUI", flagResId = R.drawable.flag_ch),
            Team(key = "TUR", flagResId = R.drawable.flag_tr),
        ),
    ),
    Region(
        nameResId = R.string.sports_widget_confederation_oceania,
        teams = listOf(
            Team(key = "AUS", flagResId = R.drawable.flag_au),
            Team(key = "NZL", flagResId = R.drawable.flag_nz),
        ),
    ),
    Region(
        nameResId = R.string.sports_widget_confederation_south_america,
        teams = listOf(
            Team(key = "ARG", flagResId = R.drawable.flag_ar),
            Team(key = "BRA", flagResId = R.drawable.flag_br),
            Team(key = "COL", flagResId = R.drawable.flag_co),
            Team(key = "ECU", flagResId = R.drawable.flag_ec),
            Team(key = "PAR", flagResId = R.drawable.flag_py),
            Team(key = "URU", flagResId = R.drawable.flag_uy),
        ),
    ),
)
