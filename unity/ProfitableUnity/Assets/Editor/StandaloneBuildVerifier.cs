#nullable enable
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace Profitable.Unity.EditorTools
{
    // Part 5 verification-only tool: produces a real Standalone Windows
    // player build (using the same EditorBuildSettings.scenes
    // SceneBuilder.cs already registers) so DebugGate's "absent by
    // default from a real packaged, non-debug build" claim can be
    // checked against an actual built .exe, not just Editor-only tests
    // (where Application.isEditor is always true and can never exercise
    // the standalone branch). Not part of the shipped game -- an Editor
    // -only script, same folder convention as SceneBuilder.cs. Run via:
    //   Unity.exe -batchmode -quit -executeMethod Profitable.Unity.EditorTools.StandaloneBuildVerifier.BuildWindowsPlayer -buildOutputPath <path>.exe
    public static class StandaloneBuildVerifier
    {
        public static void BuildWindowsPlayer()
        {
            var outputPath = GetArg("-buildOutputPath") ?? "Builds/ProfitableUnityStandaloneVerify/Profitable.exe";

            var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
            {
                scenes = System.Array.ConvertAll(EditorBuildSettings.scenes, s => s.path),
                locationPathName = outputPath,
                target = BuildTarget.StandaloneWindows64,
                options = BuildOptions.None,
            });

            Debug.Log($"StandaloneBuildVerifier: build result={report.summary.result}, totalErrors={report.summary.totalErrors}, output={outputPath}");
            if (report.summary.result != BuildResult.Succeeded)
            {
                EditorApplication.Exit(1);
            }
        }

        private static string? GetArg(string name)
        {
            var args = System.Environment.GetCommandLineArgs();
            for (var i = 0; i < args.Length - 1; i++)
            {
                if (args[i] == name) return args[i + 1];
            }
            return null;
        }
    }
}
