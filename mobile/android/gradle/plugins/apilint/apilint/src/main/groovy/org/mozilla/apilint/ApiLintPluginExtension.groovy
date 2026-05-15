/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

class ApiLintPluginExtension {
    String packageFilter = '.' // By default all packages are part of the api
    String apiOutputFileName = 'api.txt'
    String currentApiRelativeFilePath = 'api.txt'
    String jsonResultFileName = 'apilint-result.json'
    List<String> skipClassesRegex = []

    String changelogFileName
    List<String> lintFilters
    List<String> allowedPackages
    String deprecationAnnotation
    Integer libraryVersion

    // When API differences exist, print this command.  Takes a single
    // `variantName` argument.  Running this command manually should invoke the
    // `apiUpdateFile...` command to update the API file so that the API
    // differences are incorporated into the expected API.
    Closure<String> helpCommand = { variantName -> "\$ ./gradlew apiUpdateFile${variantName}" }
}
