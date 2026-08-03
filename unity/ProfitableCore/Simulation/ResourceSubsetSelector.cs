using Profitable.Core.Constants;
using Profitable.Core.Schema;

namespace Profitable.Core.Simulation;

// Ports src/galaxy/resourceSubset.ts.
public static class ResourceSubsetSelector
{
    // Reconciles the GDD's broad category vocabulary ("Solid"/"Gas"/
    // "Crystal") against Resource.Category, which stays a free-form string.
    // Matched via case-insensitive substring, same as the TypeScript
    // source -- this correctly includes raw resources like
    // "radioactive crystal" (containing its broad category as a
    // substring).
    //
    // Bug fix, ported verbatim (found auditing the alpha playtest seed's
    // starting planet): the substring match alone is not sufficient to
    // exclude refined/crafted outputs, since a refined/crafted resource's
    // own id-as-category convention can accidentally contain a broad
    // category substring (e.g. "master-crystal-array" contains "crystal").
    // Requiring ItemTier == 1 (missing ItemTier defaults to 1) closes this
    // regardless of what any future resource happens to be named.
    public static List<Resource> GetEligibleResources(PlanetType planetType, IReadOnlyList<Resource> resources)
    {
        var eligibility = PlanetTypeEligibilityTable.All.FirstOrDefault(e => e.PlanetType == planetType);
        if (eligibility is null)
        {
            throw new ArgumentOutOfRangeException(nameof(planetType), planetType, "no eligibility entry for this planet type");
        }
        var categories = eligibility.EligibleCategories.Select(c => c.ToLowerInvariant()).ToList();
        return resources.Where(resource =>
        {
            if ((resource.ItemTier ?? 1) != 1) return false;
            var resourceCategory = resource.Category.ToLowerInvariant();
            return categories.Any(category => resourceCategory.Contains(category));
        }).ToList();
    }

    // count = max(1, ceil(percentage * eligibleCount)).
    public static int ComputeSubsetCount(TierColor tier, int eligibleCount)
    {
        var entry = ResourceSubsetPercentageTable.All.FirstOrDefault(e => e.Tier == tier);
        if (entry is null)
        {
            throw new ArgumentOutOfRangeException(nameof(tier), tier, "no resource subset percentage for this tier");
        }
        return Math.Max(1, (int)Math.Ceiling(entry.Percentage * eligibleCount));
    }

    public sealed class ResourceSubsetSelection
    {
        public List<string> ProducibleResourceIds { get; init; } = new();
        public string? SpecialtyResourceId { get; init; }
    }

    // The reserved-slot rule: for White-tier-or-higher planets, the
    // specialty is selected FIRST and occupies one of the `count` slots
    // (never inflating it); the remaining count-1 slots are filled by a
    // uniform draw from the eligible pool minus the specialty. Grey-tier
    // planets never get a specialty and fill all `count` slots normally.
    public static ResourceSubsetSelection SelectResourceSubset(
        IReadOnlyList<Resource> eligibleResources,
        TierColor tier,
        int count,
        RandomFn random)
    {
        var pool = new List<Resource>(eligibleResources);
        var chosen = new List<Resource>();
        string? specialtyResourceId = null;

        if (tier != TierColor.Grey && pool.Count > 0)
        {
            var specialtyIndex = (int)Math.Floor(random() * pool.Count);
            var specialty = pool[specialtyIndex];
            pool.RemoveAt(specialtyIndex);
            specialtyResourceId = specialty.Id;
            chosen.Add(specialty);
        }

        var remainingSlots = count - chosen.Count;
        for (var i = 0; i < remainingSlots && pool.Count > 0; i++)
        {
            var index = (int)Math.Floor(random() * pool.Count);
            chosen.Add(pool[index]);
            pool.RemoveAt(index);
        }

        return new ResourceSubsetSelection
        {
            ProducibleResourceIds = chosen.Select(r => r.Id).ToList(),
            SpecialtyResourceId = specialtyResourceId,
        };
    }
}
