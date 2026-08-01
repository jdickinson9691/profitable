using System.Text.Json;

namespace Profitable.Core.Adapters;

// Real, working ISaveSystem backend using System.IO -- not a stub. Ports
// the "file I/O" half of the migration GDD's "file I/O or PlayerPrefs"
// SaveSystem parenthetical (agent-34-unity-infrastructure-adapters.md
// Responsibility). The base directory is constructor-injected, the same
// seam src/adapters/electronSaveSystem.ts already proved out once for
// this project's own "swap implementation, keep interface" precedent --
// a test passes a temp directory here; Agent 35 will pass Unity's
// Application.persistentDataPath, with zero changes to this class.
public class FileSaveSystem : ISaveSystem
{
    private readonly string _baseDirectory;
    private static readonly JsonSerializerOptions SerializerOptions = new() { WriteIndented = false };

    public FileSaveSystem(string baseDirectory)
    {
        _baseDirectory = baseDirectory;
        Directory.CreateDirectory(_baseDirectory);
    }

    public void Save(string key, object? data)
    {
        var json = JsonSerializer.Serialize(data, SerializerOptions);
        File.WriteAllText(PathFor(key), json);
    }

    public object? Load(string key)
    {
        var path = PathFor(key);
        if (!File.Exists(path)) return null;
        var json = File.ReadAllText(path);
        return JsonSerializer.Deserialize<object?>(json, SerializerOptions);
    }

    private string PathFor(string key) => Path.Combine(_baseDirectory, SanitizeFileName(key) + ".json");

    // Necessary completion: TypeScript Storage keys (e.g.
    // "profitable:debugModeEnabled") can contain characters invalid in a
    // filename on some platforms -- ':' is illegal in a Windows filename
    // in particular. localStorage/Electron's IPC-based store both accept
    // arbitrary string keys with no filesystem translation, so the
    // TypeScript interface never had to think about this. Safe
    // characters pass through unchanged; everything else becomes '_'.
    private static string SanitizeFileName(string key)
    {
        var chars = key.Select(c => char.IsLetterOrDigit(c) || c is '.' or '-' or '_' ? c : '_').ToArray();
        return new string(chars);
    }
}
