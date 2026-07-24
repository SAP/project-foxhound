/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.tooling.nimbus

import groovy.transform.Immutable
import org.gradle.api.Action
import org.gradle.api.DefaultTask
import org.gradle.api.GradleException
import org.gradle.api.file.ArchiveOperations
import org.gradle.api.file.FileVisitDetails
import org.gradle.api.file.RegularFileProperty
import org.gradle.api.model.ObjectFactory
import org.gradle.api.provider.ListProperty
import org.gradle.api.provider.Property
import org.gradle.api.provider.Provider
import org.gradle.api.provider.ProviderFactory
import org.gradle.api.tasks.CacheableTask
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.Internal
import org.gradle.api.tasks.Nested
import org.gradle.api.tasks.OutputFile
import org.gradle.api.tasks.TaskAction

import javax.inject.Inject
import java.security.MessageDigest

/**
 * A task that fetches a prebuilt `nimbus-fml` binary for the current platform.
 *
 * Prebuilt binaries for all platforms are packaged into ZIP archives, and
 * published to sources like `archive.mozilla.org` (for releases) or
 * TaskCluster (for nightly builds).
 *
 * This task takes a variable number of inputs: a list of archive sources,
 * and a list of glob patterns to find the binary for the current platform
 * in the archive.
 *
 * The unzipped binary is this task's only output. This output is then used as
 * an optional input to the `NimbusFmlCommandTask`s.
 */
@CacheableTask
abstract class NimbusAssembleToolsTask extends DefaultTask {
    @Inject
    abstract ArchiveOperations getArchiveOperations()

    @Inject
    abstract ProviderFactory getProviders()

    @Nested
    abstract FetchSpec getFetchSpec()

    @Nested
    abstract UnzipSpec getUnzipSpec()

    /** The location of the fetched ZIP archive. */
    @Internal
    abstract RegularFileProperty getArchiveFile()

    /**
     * The location of the fetched hash file, which contains the
     * archive's checksum.
     */
    @Internal
    abstract RegularFileProperty getHashFile()

    /** The location of the unzipped binary. */
    @OutputFile
    abstract RegularFileProperty getFmlBinary()

    /** The platform string (e.g. "x86_64-pc-windows-gnu"). */
    @Input
    abstract Property<String> getPlatform()

    /** Connection timeout in milliseconds. */
    @Internal
    abstract Property<Integer> getConnectTimeout()

    /** Read timeout in milliseconds. */
    @Internal
    abstract Property<Integer> getReadTimeout()

    /** The cache root directory */
    @Internal
    abstract Property<File> getCacheRoot()

    NimbusAssembleToolsTask() {
        platform.convention(detectPlatform(providers))
        connectTimeout.convention(30000)
        readTimeout.convention(60000)
    }

    private static Provider<String> detectPlatform(ProviderFactory providers) {
        def osProvider = providers.systemProperty("os.name").map { it.toLowerCase() }
        def archProvider = providers.systemProperty("os.arch").map { it.toLowerCase() }

        return osProvider.zip(archProvider) { os, arch ->
            String osPart
            if (os.contains("win")) {
                osPart = "pc-windows-gnu"
            } else if (os.contains("nix") || os.contains("nux") || os.contains("aix")) {
                osPart = "unknown-linux"
            } else if (os.contains("mac")) {
                osPart = "apple-darwin"
            } else {
                osPart = "unknown"
            }

            String archPart
            if (arch.contains("x86_64")) {
                archPart = "x86_64"
            } else if (arch.contains("amd64")) {
                archPart = "x86_64"
            } else if (arch.contains("aarch")) {
                archPart = "aarch64"
            } else {
                archPart = "unknown"
            }
            return "${archPart}-${osPart}"
        }
    }

    static String getBinaryName(String platform) {
        if (platform.contains("windows")) {
            return "nimbus-fml.exe"
        }
        return "nimbus-fml"
    }

    /**
     * Configures the task to download the archive.
     *
     * @param action The configuration action.
     */
    void fetch(Action<FetchSpec> action) {
        action.execute(fetchSpec)
    }

    /**
     * Configures the task to extract the binary from the archive.
     *
     * @param action The configuration action.
     */
    void unzip(Action<UnzipSpec> action) {
        action.execute(unzipSpec)
    }

    @TaskAction
    void assembleTools() {
        def binaryFile = fmlBinary.get().asFile
        def archiveFileObj = archiveFile.get().asFile
        def hashFileObj = hashFile.get().asFile

        def sources = [fetchSpec, *fetchSpec.fallbackSources.get()].collect {
            new Source(
                new URI(it.archive.get()),
                new URI(it.hash.get()),
                connectTimeout.get(),
                readTimeout.get()
            )
        }

        // Check if we have valid cached files by verifying against source hashes
        def cachedHash = hashFileObj.exists() ? hashFileObj.text.trim() : null
        if (cachedHash) {
            for (source in sources) {
                try {
                    def sourceHash = source.fetchHashString()
                    if (cachedHash.equalsIgnoreCase(sourceHash)) {
                        // Hash matches. Use cached binary if it exists, otherwise extract from archive
                        if (binaryFile.exists()) {
                            logger.info("nimbus-fml binary is up-to-date")
                            return
                        }
                        if (archiveFileObj.exists()) {
                            logger.info("Extracting nimbus-fml binary from cached archive")
                            extractBinary(archiveFileObj)
                            return
                        }
                        // We have a hash file, but neither binary nor archive, so we need to fetch the archive
                        break
                    }
                } catch (IOException ignored) {
                    // Try next source
                }
            }
        }

        logger.info("Fetching nimbus-fml for platform: {}", platform.get())

        // Clear cache before downloading a new archive
        if (cacheRoot.isPresent()) {
            def root = cacheRoot.get()
            if (root.exists()) {
                root.deleteDir()
            }
        }

        // Download the archive and verify with hash from the same source
        Source successfulSource = null
        String sourceHash = null
        for (source in sources) {
            try {
                sourceHash = source.fetchHashString()
            } catch (IOException ignored) {
                continue
            }

            if (source.trySaveArchiveTo(archiveFileObj)) {
                successfulSource = source
                break
            }
        }

        if (successfulSource == null) {
            throw new GradleException("Failed to fetch archive from any of: ${sources*.archiveURI.collect { "`$it`" }.join(', ')}")
        }

        def actualHash = computeSha256(archiveFileObj)
        if (!actualHash.equalsIgnoreCase(sourceHash)) {
            archiveFileObj.delete()
            throw new GradleException("Archive checksum mismatch! Expected: $sourceHash, got: $actualHash")
        }
        hashFileObj.text = sourceHash

        extractBinary(archiveFileObj)
    }

    protected void extractBinary(File archiveFileObj) {
        def binaryFile = fmlBinary.get().asFile
        def zipTree = archiveOperations.zipTree(archiveFileObj)
        def visitedFilePaths = []
        zipTree.matching {
            include unzipSpec.includePatterns.get()
        }.visit { FileVisitDetails details ->
            if (!details.directory) {
                if (visitedFilePaths.empty) {
                    binaryFile.parentFile?.mkdirs()
                    details.copyTo(binaryFile)
                    binaryFile.setExecutable(true)
                }
                visitedFilePaths.add(details.relativePath)
            }
        }

        if (visitedFilePaths.empty) {
            throw new GradleException("Couldn't find any files in archive matching unzip spec: (${unzipSpec.includePatterns.get().collect { "`$it`" }.join(' | ')})")
        }

        if (visitedFilePaths.size() > 1) {
            throw new GradleException("Ambiguous unzip spec matched ${visitedFilePaths.size()} files in archive: ${visitedFilePaths.collect { "`$it`" }.join(', ')}")
        }
    }

    private static String computeSha256(File file) {
        def digest = MessageDigest.getInstance("SHA-256")
        file.withInputStream { is ->
            byte[] buffer = new byte[8192]
            int read
            while ((read = is.read(buffer)) != -1) {
                digest.update(buffer, 0, read)
            }
        }
        return digest.digest().encodeHex().toString()
    }

    /**
     * Specifies the source from which to fetch the archive and
     * its hash file.
     */
    static abstract class FetchSpec extends SourceSpec {
        @Inject
        abstract ObjectFactory getObjectFactory()

        @Nested
        abstract ListProperty<SourceSpec> getFallbackSources()

        /**
         * Configures a fallback to try if the archive can't be fetched
         * from this source.
         *
         * The task will try fallbacks in the order in which they're
         * configured.
         *
         * @param action The configuration action.
         */
        void fallback(Action<SourceSpec> action) {
            def spec = objectFactory.newInstance(SourceSpec)
            action(spec)
            fallbackSources.add(spec)
        }
    }

    /** Specifies the URL of an archive and its hash file. */
    static abstract class SourceSpec {
        @Input
        abstract Property<String> getArchive()

        @Input
        abstract Property<String> getHash()
    }

    /**
     * Specifies which binary to extract from the fetched archive.
     *
     * The spec should only match one file in the archive. If the spec
     * matches multiple files in the archive, the task will fail.
     */
    static abstract class UnzipSpec {
        @Input
        abstract ListProperty<String> getIncludePatterns()

        /**
         * Includes all files whose paths match the pattern.
         *
         * @param pattern An Ant-style glob pattern.
         * @see org.gradle.api.tasks.util.PatternFilterable#include
         */
        void include(String pattern) {
            includePatterns.add(pattern)
        }
    }

    /** A helper to fetch an archive and its hash file. */
    @Immutable
    static class Source {
        URI archiveURI
        URI hashURI
        int connectTimeout
        int readTimeout

        boolean trySaveArchiveTo(File destination) {
            try {
                saveURITo(archiveURI, destination)
                true
            } catch (IOException ignored) {
                false
            }
        }

        void saveHashTo(File destination) {
            saveURITo(hashURI, destination)
        }

        String fetchHashString() {
            def connection = hashURI.toURL().openConnection() as HttpURLConnection
            connection.connectTimeout = connectTimeout
            connection.readTimeout = readTimeout
            connection.instanceFollowRedirects = true
            connection.requestMethod = 'GET'

            try {
                if (connection.responseCode != 200) {
                    throw new IOException("HTTP ${connection.responseCode}: ${connection.responseMessage}")
                }
                return connection.inputStream.withStream { is ->
                    is.text.trim().split(/\s+/)[0]
                }
            } finally {
                connection.disconnect()
            }
        }

        private void saveURITo(URI source, File destination) {
            def connection = source.toURL().openConnection() as HttpURLConnection
            connection.connectTimeout = connectTimeout
            connection.readTimeout = readTimeout
            connection.instanceFollowRedirects = true
            connection.requestMethod = 'GET'

            try {
                if (connection.responseCode != 200) {
                    throw new IOException("HTTP ${connection.responseCode}: ${connection.responseMessage}")
                }
                destination.parentFile?.mkdirs()
                connection.inputStream.withStream { from ->
                    destination.withOutputStream { out ->
                        out << from
                    }
                }
            } finally {
                connection.disconnect()
            }
        }
    }
}
