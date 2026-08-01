using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// A Simulation-internal computation shape, distinct from Profitable.Core
// .Schema.QualityMap (Dictionary<Quality, int?>). See
// agent-32-unity-simulation-core.md's Must-Not-Do section: the
// TypeScript source's ComputeBaseAverages() and Craft()'s preThreshold
// both actually hold FRACTIONAL values at their intermediate stages
// (a straight average; a ceiling-raised-then-variance-rolled value),
// only rounded to an integer at each function's final step -- even
// though TypeScript's own QualityMap/QualityRoll type annotations
// nominally read "integer or null" there too (TypeScript's `number`
// doesn't distinguish integer from fractional). Rounding early here
// would silently change the computed result. This type exists so that
// mistake can't happen by accident in C#, where the type system can
// actually enforce the distinction TypeScript's couldn't.
public class QualityAverageMap : Dictionary<Quality, double?>
{
}
