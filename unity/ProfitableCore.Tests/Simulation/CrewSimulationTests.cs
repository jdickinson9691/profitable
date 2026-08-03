using Profitable.Core.Constants;
using Profitable.Core.Schema;
using Profitable.Core.Simulation;

namespace ProfitableCore.Tests.Simulation;

// Direct unit tests for Migration Phase 2 Sub-Phase C's ported logic --
// agent-49-unity-crew-simulation-core.md. Complements Parity/CrewParityTests.cs
// (the stronger, real-content proof); these cover boundary cases
// constructed by hand, mirroring the TypeScript suite's own targeted
// cases rather than relying solely on whatever the parity corpus
// generated.
public class CrewSimulationTests
{
    private static CrewMember CrewMemberFixture(
        TierColor tier = TierColor.White,
        long lastPaidAt = 0,
        long lastCheckedAt = 0,
        double wageAmount = 10,
        string hiredByPlayerId = "player-1") => new()
    {
        Id = "crew-1",
        HiredByPlayerId = hiredByPlayerId,
        Tier = tier,
        Profession = null,
        Status = CrewStatus.Idle,
        AssignedCraftId = null,
        HiredAt = 0,
        LastCheckedAt = lastCheckedAt,
        WageAmount = wageAmount,
        LastPaidAt = lastPaidAt,
    };

    [Fact]
    public void PayUpkeep_IsDueAtExactlyTheIntervalBoundary()
    {
        var member = CrewMemberFixture(lastPaidAt: 0, wageAmount: 10);
        var wallet = new Wallet { PlayerId = "player-1", Credits = 100 };
        var exactlyOneIntervalMs = (long)(CrewConfig.WagePaymentIntervalHours * 60 * 60 * 1000);

        var result = PayUpkeepSimulation.PayUpkeep(member, wallet, exactlyOneIntervalMs);

        Assert.IsType<PaymentPaid>(result);
    }

    [Fact]
    public void PayUpkeep_IsNotDueJustBeforeTheIntervalBoundary()
    {
        var member = CrewMemberFixture(lastPaidAt: 0, wageAmount: 10);
        var wallet = new Wallet { PlayerId = "player-1", Credits = 100 };
        var justBeforeOneIntervalMs = (long)(CrewConfig.WagePaymentIntervalHours * 60 * 60 * 1000) - 1;

        var result = PayUpkeepSimulation.PayUpkeep(member, wallet, justBeforeOneIntervalMs);

        Assert.IsType<PaymentNotDue>(result);
    }

    [Fact]
    public void CheckAttrition_NotDepartedExactlyAtTheGracePeriodBoundary()
    {
        var member = CrewMemberFixture(lastPaidAt: 0);
        var exactlyGracePeriodMs = (long)(CrewConfig.UpkeepGracePeriodHours * 60 * 60 * 1000);

        var result = CheckAttritionSimulation.CheckAttrition(member, exactlyGracePeriodMs);

        Assert.False(result.Departed);
    }

    [Fact]
    public void CheckAttrition_DepartedJustPastTheGracePeriodBoundary()
    {
        var member = CrewMemberFixture(lastPaidAt: 0);
        var justPastGracePeriodMs = (long)(CrewConfig.UpkeepGracePeriodHours * 60 * 60 * 1000) + 1;

        var result = CheckAttritionSimulation.CheckAttrition(member, justPastGracePeriodMs);

        Assert.True(result.Departed);
    }

    [Fact]
    public void PurchaseCapacity_CostDoublesPerPurchasedSlot()
    {
        var wallet = new Wallet { PlayerId = "player-1", Credits = 1_000_000 };

        var slot0 = PurchaseCapacitySimulation.PurchaseCapacity(new CrewCapacity { PlayerId = "player-1", BaseCapacity = 2, PurchasedSlots = 0 }, wallet);
        var slot1 = PurchaseCapacitySimulation.PurchaseCapacity(new CrewCapacity { PlayerId = "player-1", BaseCapacity = 2, PurchasedSlots = 1 }, wallet);

        var slot0Cost = wallet.Credits - ((PurchaseCapacitySucceeded)slot0).UpdatedWallet.Credits;
        var slot1Cost = wallet.Credits - ((PurchaseCapacitySucceeded)slot1).UpdatedWallet.Credits;

        Assert.Equal(CrewConfig.CrewCapacityExpansionBaseCost, slot0Cost, precision: 6);
        Assert.Equal(CrewConfig.CrewCapacityExpansionBaseCost * CrewConfig.CrewCapacityExpansionCostMultiplier, slot1Cost, precision: 6);
    }

    [Fact]
    public void HireCrew_SucceedsWhenExactlyOneSlotBelowCapacity()
    {
        var candidate = new CrewCandidate { Id = "candidate-1", Tier = TierColor.White, Profession = null };
        var pool = new PlanetCrewPool { PlanetId = "planet-1", AvailableHires = new List<CrewCandidate> { candidate } };
        var capacity = new CrewCapacity { PlayerId = "player-1", BaseCapacity = 2, PurchasedSlots = 0 };
        var existingCrew = new List<CrewMember> { CrewMemberFixture() };
        var wallet = new Wallet { PlayerId = "player-1", Credits = 1000 };

        var result = HireCrewSimulation.HireCrew(candidate, pool, capacity, existingCrew, wallet, "player-1", 0);

        Assert.IsType<HireSucceeded>(result);
    }

    [Fact]
    public void ResolveBackgroundCrafting_NegativeElapsedTimeClampsToZeroUnits()
    {
        var member = CrewMemberFixture(lastCheckedAt: 1_000_000);
        var craftAction = new CraftAction
        {
            Id = "action-1",
            Inputs = new List<ResourceInstance>(),
            Recipe = new Recipe { Id = "r", Name = "r", OutputResourceId = "r", OutputQuantity = 1, Inputs = new List<RecipeInput> { new() { Category = "any", Quantity = 1 } } },
            SchematicTier = TierColor.White,
        };

        // currentTime before lastCheckedAt -- shouldn't happen in real
        // use, but the TypeScript source clamps rawElapsedHours to a
        // floor of 0 rather than going negative; this proves the C# port
        // does too.
        var result = ResolveBackgroundCraftingSimulation.ResolveBackgroundCrafting(member, craftAction, currentTimeMs: 0, backgroundRate: 0.5, random: null, maxUnits: double.PositiveInfinity);

        var resolved = Assert.IsType<BackgroundResolved>(result);
        Assert.Equal(0, resolved.UnitsCompleted);
    }

    [Fact]
    public void RefreshCrewPool_SameSeedProducesIdenticalPool()
    {
        var poolA = RefreshCrewPoolSimulation.RefreshCrewPool("planet-1", "determinism-check", 0);
        var poolB = RefreshCrewPoolSimulation.RefreshCrewPool("planet-1", "determinism-check", 0);

        Assert.Equal(poolA.AvailableHires.Count, poolB.AvailableHires.Count);
        for (var i = 0; i < poolA.AvailableHires.Count; i++)
        {
            Assert.Equal(poolA.AvailableHires[i].Id, poolB.AvailableHires[i].Id);
            Assert.Equal(poolA.AvailableHires[i].Tier, poolB.AvailableHires[i].Tier);
            Assert.Equal(poolA.AvailableHires[i].Profession, poolB.AvailableHires[i].Profession);
        }
    }

    [Fact]
    public void RefreshCrewPool_OnlyOrangeAndGoldCandidatesGetAProfession()
    {
        var pool = RefreshCrewPoolSimulation.RefreshCrewPool("planet-1", "profession-check-seed", 0);

        foreach (var candidate in pool.AvailableHires)
        {
            if (candidate.Tier is TierColor.Orange or TierColor.Gold)
            {
                Assert.NotNull(candidate.Profession);
                Assert.Contains(candidate.Profession, CrewConfig.Tier67Professions);
            }
            else
            {
                Assert.Null(candidate.Profession);
            }
        }
    }
}
