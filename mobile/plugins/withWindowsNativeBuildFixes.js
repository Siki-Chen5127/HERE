const { withAppBuildGradle } = require("@expo/config-plugins")

const AUTOLINK_PATH_MARKER = "Shorten the keyboard controller autolink build directory on Windows."
const AUTOLINK_PATH_PATCH = `

// ${AUTOLINK_PATH_MARKER}
tasks.configureEach { task ->
    if (task.name == "generateAutolinkingNewArchitectureFiles") {
        task.outputs.upToDateWhen { false }
        task.doLast {
            def autolinkingCmake = file("$buildDir/generated/autolinking/src/main/jni/Android-autolinking.cmake")
            if (autolinkingCmake.exists()) {
                def original = autolinkingCmake.getText("UTF-8")
                def shortened = original.replace(
                    "reactnativekeyboardcontroller_autolinked_build",
                    "rnkc_build"
                )
                if (shortened != original) {
                    autolinkingCmake.write(shortened, "UTF-8")
                }
            }
        }
    }
}
`

module.exports = function withWindowsNativeBuildFixes(config) {
  return withAppBuildGradle(config, (gradleConfig) => {
    let buildGradle = gradleConfig.modResults.contents

    if (!buildGradle.includes(AUTOLINK_PATH_MARKER)) {
      buildGradle += AUTOLINK_PATH_PATCH
    }

    gradleConfig.modResults.contents = buildGradle
    return gradleConfig
  })
}
