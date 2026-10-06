package test

// References shadowed_name which is active in fenix but deprecated in AC.
// This must NOT be flagged because fenix's own active string shadows it.
val x = context.getString(R.string.shadowed_name)
