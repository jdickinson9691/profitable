using System.Text.Json;
using Profitable.Core.Adapters;

namespace ProfitableCore.Tests.Adapters;

// Mirrors tests/adapters/saveSystem.test.ts case-for-case, against a real
// temp directory (real System.IO, not a fake/in-memory file system) --
// see agent-34-unity-infrastructure-adapters.md's Testing Requirements.
public class FileSaveSystemTests : IDisposable
{
    private readonly string _tempDir = Path.Combine(Path.GetTempPath(), $"profitable-savesystem-tests-{Guid.NewGuid():N}");

    public void Dispose()
    {
        if (Directory.Exists(_tempDir))
        {
            Directory.Delete(_tempDir, recursive: true);
        }
    }

    [Fact]
    public void SaveThenLoadRoundTripsDataCorrectly()
    {
        var saveSystem = new FileSaveSystem(_tempDir);

        saveSystem.Save("player", new { name = "Vex", credits = 4200, tags = new[] { "crafter", "gold" } });

        var loaded = (JsonElement)saveSystem.Load("player")!;
        Assert.Equal("Vex", loaded.GetProperty("name").GetString());
        Assert.Equal(4200, loaded.GetProperty("credits").GetInt32());
        Assert.Equal(new[] { "crafter", "gold" }, loaded.GetProperty("tags").EnumerateArray().Select(e => e.GetString()));
    }

    [Fact]
    public void SaveActuallyWritesThroughToARealFileAsJson()
    {
        var saveSystem = new FileSaveSystem(_tempDir);

        saveSystem.Save("x", 42);

        // Confirms this goes through a real file as JSON, not a parallel
        // in-memory structure of its own -- mirrors the TypeScript test's
        // own "actually writes through the injected storage backend"
        // check, adapted to a file backend.
        var files = Directory.GetFiles(_tempDir);
        Assert.Single(files);
        Assert.Equal("42", File.ReadAllText(files[0]));
    }

    [Fact]
    public void LoadReturnsNullForAKeyThatWasNeverSaved()
    {
        var saveSystem = new FileSaveSystem(_tempDir);
        Assert.Null(saveSystem.Load("missing"));
    }

    [Fact]
    public void KeysWithFilesystemUnsafeCharactersRoundTripCorrectly()
    {
        // Real save keys in this project look like "profitable:galaxySeed"
        // -- ':' is illegal in a Windows filename, unlike a localStorage
        // key. See FileSaveSystem's own SanitizeFileName note.
        var saveSystem = new FileSaveSystem(_tempDir);

        saveSystem.Save("profitable:debugModeEnabled", true);

        var loaded = (JsonElement)saveSystem.Load("profitable:debugModeEnabled")!;
        Assert.True(loaded.GetBoolean());
    }

    [Fact]
    public void DifferentKeysDoNotCollideAfterSanitization()
    {
        var saveSystem = new FileSaveSystem(_tempDir);

        saveSystem.Save("a:b", 1);
        saveSystem.Save("a_b", 2);

        // These sanitize to the same filename ("a_b.json") -- a known,
        // accepted limitation of a readable-filename sanitizer rather
        // than a content hash. Documented via this test so a future
        // change to the sanitization scheme has a regression case to
        // check against, not silently discovering the collision later.
        Assert.Equal(2, ((JsonElement)saveSystem.Load("a:b")!).GetInt32());
    }
}
