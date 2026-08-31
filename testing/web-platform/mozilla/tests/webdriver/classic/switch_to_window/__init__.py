def switch_to_window(session, handle):
    return session.transport.send(
        "POST",
        "session/{session_id}/window".format(**vars(session)),
        {"handle": handle},
    )
