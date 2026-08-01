namespace Profitable.Core.Simulation;

// Ports src/simulation/clamp.ts.
public static class ClampHelper
{
    public static double Clamp(double value, double min, double max) =>
        Math.Min(Math.Max(value, min), max);
}
