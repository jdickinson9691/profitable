using Profitable.Unity.UI;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.SceneManagement;

namespace Profitable.Unity.EditorTools
{
    // Agent 35 -- builds Assets/Scenes/MvpLoop.unity programmatically via
    // Unity's own scene APIs rather than hand-authored YAML, since no
    // Unity MCP tooling is available this session (see agent-35-unity
    // -mvp-presentation.md's Design decisions). Run once via:
    //   Unity.exe -batchmode -quit -executeMethod Profitable.Unity.EditorTools.SceneBuilder.BuildMvpLoopScene
    public static class SceneBuilder
    {
        public static void BuildMvpLoopScene()
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            var cameraGo = new GameObject("Main Camera", typeof(Camera));
            cameraGo.tag = "MainCamera";
            var camera = cameraGo.GetComponent<Camera>();
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = Color.black;
            camera.orthographic = true;

            // The project's Active Input Handling is "Input System
            // Package (New)" only (activeInputHandler: 1 in
            // ProjectSettings.asset) -- the legacy StandaloneInputModule
            // would not receive input under that setting, so uGUI needs
            // InputSystemUIInputModule specifically.
            var eventSystemGo = new GameObject("EventSystem", typeof(EventSystem), typeof(InputSystemUIInputModule));

            var bootstrapGo = new GameObject("MvpLoopBootstrap", typeof(MvpLoopBootstrap));

            EditorSceneManager.MoveGameObjectToScene(cameraGo, scene);
            EditorSceneManager.MoveGameObjectToScene(eventSystemGo, scene);
            EditorSceneManager.MoveGameObjectToScene(bootstrapGo, scene);

            var scenesDir = "Assets/Scenes";
            if (!AssetDatabase.IsValidFolder(scenesDir))
            {
                AssetDatabase.CreateFolder("Assets", "Scenes");
            }

            var path = $"{scenesDir}/MvpLoop.unity";
            var saved = EditorSceneManager.SaveScene(scene, path);
            if (!saved)
            {
                Debug.LogError($"SceneBuilder: failed to save scene to {path}");
                EditorApplication.Exit(1);
                return;
            }

            // Register it as the first Build Settings scene so Play mode
            // and any future build both start here by default.
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(path, true) };

            Debug.Log($"SceneBuilder: saved {path}");
            AssetDatabase.SaveAssets();
        }
    }
}
