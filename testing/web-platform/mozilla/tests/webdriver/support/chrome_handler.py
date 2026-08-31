import contextlib

from support.context import using_context


def register_chrome_handler(session, manifest_path, entries):
    with using_context(session, "chrome"):
        return session.execute_script(
            """
                const { FileUtils } = ChromeUtils.importESModule(
                    "resource://gre/modules/FileUtils.sys.mjs"
                  );

                const [manifestPath, entries] = arguments;

                const manifest = new FileUtils.File(manifestPath);
                const rootURI = Services.io.newFileURI(manifest.parent);
                const manifestURI = Services.io.newURI(manifest.leafName, null, rootURI);

                const handle = Cc["@mozilla.org/addons/addon-manager-startup;1"]
                    .getService(Ci.amIAddonManagerStartup)
                    .registerChrome(manifestURI, entries);
                const id = Services.uuid.generateUUID().toString().slice(1, -1);

                if (globalThis.chromeProtocolHandles) {
                    globalThis.chromeProtocolHandles.set(id, handle);
                }

                return id;

            """,
            args=[manifest_path, entries],
        )


def unregister_chrome_handler(session, id):
    with using_context(session, "chrome"):
        return session.execute_script(
            """
                const [id] = arguments;

                if (globalThis.chromeProtocolHandles) {
                    if (!globalThis.chromeProtocolHandles.has(id)) {
                        throw new Error(
                            `Id ${id} is not a known chrome protocol handler`
                        );
                    }

                    const handle = globalThis.chromeProtocolHandles.get(id);
                    globalThis.chromeProtocolHandles.delete(id);
                    handle.destruct();
                }
            """,
            args=[id],
        )


@contextlib.contextmanager
def using_chrome_handler(session, manifest_path, entries):
    id = register_chrome_handler(session, manifest_path, entries)

    try:
        yield
    finally:
        unregister_chrome_handler(session, id)
