// netstandard2.1's reference assemblies don't include
// System.Runtime.CompilerServices.IsExternalInit (added alongside C# 9's
// `init` accessors, which target .NET 5+ by default) -- the Roslyn
// compiler only needs the *type to exist*, not any runtime behavior from
// it, so this empty polyfill is the standard, widely-used workaround for
// netstandard-targeting projects that want init-only properties. Unity's
// own scripting runtime (Mono/IL2CPP against .NET Standard 2.1) has the
// same gap, so this polyfill travels with the code into Unity later too.
namespace System.Runtime.CompilerServices;

internal static class IsExternalInit
{
}
