using System.Text.Json.Serialization;

namespace ProfitableCore.Tests.Parity;

// Deserialization shape for unity/parity/ts-parity-results.json, written
// by scripts/parityHarness.ts. Field names use [JsonPropertyName] to
// match the TS-side camelCase JSON exactly rather than relying on
// System.Text.Json's case-insensitive matching -- this file is read-only
// input from another language's toolchain, so being explicit here is
// worth the verbosity.
public class ParityCorpus
{
    [JsonPropertyName("generatedAt")]
    public string GeneratedAt { get; set; } = string.Empty;

    [JsonPropertyName("tierColorCases")]
    public List<TierColorCase> TierColorCases { get; set; } = new();

    [JsonPropertyName("rollQualityCases")]
    public List<RollQualityCase> RollQualityCases { get; set; } = new();

    [JsonPropertyName("refineCases")]
    public List<RefineCase> RefineCases { get; set; } = new();

    [JsonPropertyName("craftCases")]
    public List<CraftCase> CraftCases { get; set; } = new();

    [JsonPropertyName("galaxyCases")]
    public List<GalaxyCase> GalaxyCases { get; set; } = new();

    [JsonPropertyName("planetResourceCycleCases")]
    public List<PlanetResourceCycleCase> PlanetResourceCycleCases { get; set; } = new();

    [JsonPropertyName("gcprCases")]
    public List<GcprCase> GcprCases { get; set; } = new();

    [JsonPropertyName("createListingCases")]
    public List<CreateListingCase> CreateListingCases { get; set; } = new();

    [JsonPropertyName("applyDriftCases")]
    public List<ApplyDriftCase> ApplyDriftCases { get; set; } = new();

    [JsonPropertyName("applyRecoveryCases")]
    public List<ApplyRecoveryCase> ApplyRecoveryCases { get; set; } = new();

    [JsonPropertyName("seasonCases")]
    public List<SeasonCase> SeasonCases { get; set; } = new();

    [JsonPropertyName("emergencyCases")]
    public List<EmergencyCase> EmergencyCases { get; set; } = new();

    [JsonPropertyName("globalPriceCases")]
    public List<GlobalPriceCase> GlobalPriceCases { get; set; } = new();

    [JsonPropertyName("purchaseListingCases")]
    public List<PurchaseListingCase> PurchaseListingCases { get; set; } = new();

    [JsonPropertyName("sellToMarketCases")]
    public List<SellToMarketCase> SellToMarketCases { get; set; } = new();

    [JsonPropertyName("sellToGlobalMarketCases")]
    public List<SellToGlobalMarketCase> SellToGlobalMarketCases { get; set; } = new();

    [JsonPropertyName("expireListingsCases")]
    public List<ExpireListingsCase> ExpireListingsCases { get; set; } = new();

    [JsonPropertyName("hireCrewCases")]
    public List<HireCrewCase> HireCrewCases { get; set; } = new();

    [JsonPropertyName("dismissCrewCases")]
    public List<DismissCrewCase> DismissCrewCases { get; set; } = new();

    [JsonPropertyName("payUpkeepCases")]
    public List<PayUpkeepCase> PayUpkeepCases { get; set; } = new();

    [JsonPropertyName("checkAttritionCases")]
    public List<CheckAttritionCase> CheckAttritionCases { get; set; } = new();

    [JsonPropertyName("purchaseCapacityCases")]
    public List<PurchaseCapacityCase> PurchaseCapacityCases { get; set; } = new();

    [JsonPropertyName("refreshCrewPoolCases")]
    public List<RefreshCrewPoolCase> RefreshCrewPoolCases { get; set; } = new();

    [JsonPropertyName("assignToCraftCases")]
    public List<AssignToCraftCase> AssignToCraftCases { get; set; } = new();

    [JsonPropertyName("resolveBackgroundCraftingCases")]
    public List<ResolveBackgroundCraftingCase> ResolveBackgroundCraftingCases { get; set; } = new();

    [JsonPropertyName("calculateDistanceCases")]
    public List<CalculateDistanceCase> CalculateDistanceCases { get; set; } = new();

    [JsonPropertyName("calculateTravelTimeCases")]
    public List<CalculateTravelTimeCase> CalculateTravelTimeCases { get; set; } = new();

    [JsonPropertyName("calculateFuelCostCases")]
    public List<CalculateFuelCostCase> CalculateFuelCostCases { get; set; } = new();

    [JsonPropertyName("deriveFuelCapacityCases")]
    public List<DeriveFuelCapacityCase> DeriveFuelCapacityCases { get; set; } = new();

    [JsonPropertyName("deriveShipTierCases")]
    public List<DeriveShipTierCase> DeriveShipTierCases { get; set; } = new();

    [JsonPropertyName("tierMidpointCases")]
    public List<TierMidpointCase> TierMidpointCases { get; set; } = new();

    [JsonPropertyName("assembleShipCases")]
    public List<AssembleShipCase> AssembleShipCases { get; set; } = new();

    [JsonPropertyName("initiateVoyageCases")]
    public List<InitiateVoyageCase> InitiateVoyageCases { get; set; } = new();

    [JsonPropertyName("resolveArrivalCases")]
    public List<ResolveArrivalCase> ResolveArrivalCases { get; set; } = new();

    [JsonPropertyName("purchaseShipCases")]
    public List<PurchaseShipCase> PurchaseShipCases { get; set; } = new();

    [JsonPropertyName("purchaseScannerCases")]
    public List<PurchaseScannerCase> PurchaseScannerCases { get; set; } = new();

    [JsonPropertyName("refreshShipyardPoolCases")]
    public List<RefreshShipyardPoolCase> RefreshShipyardPoolCases { get; set; } = new();

    [JsonPropertyName("refreshScannerPoolCases")]
    public List<RefreshScannerPoolCase> RefreshScannerPoolCases { get; set; } = new();

    [JsonPropertyName("refuelShipCases")]
    public List<RefuelShipCase> RefuelShipCases { get; set; } = new();

    [JsonPropertyName("getCrewSlotsForShipCases")]
    public List<GetCrewSlotsForShipCase> GetCrewSlotsForShipCases { get; set; } = new();

    [JsonPropertyName("assignToShipRoleCases")]
    public List<AssignToShipRoleCase> AssignToShipRoleCases { get; set; } = new();

    [JsonPropertyName("unassignFromShipRoleCases")]
    public List<UnassignFromShipRoleCase> UnassignFromShipRoleCases { get; set; } = new();

    [JsonPropertyName("resolveComponentRepairCases")]
    public List<ResolveComponentRepairCase> ResolveComponentRepairCases { get; set; } = new();

    [JsonPropertyName("performScanCases")]
    public List<PerformScanCase> PerformScanCases { get; set; } = new();

    [JsonPropertyName("initiateCombatCases")]
    public List<InitiateCombatCase> InitiateCombatCases { get; set; } = new();

    [JsonPropertyName("resolveEncountersCases")]
    public List<ResolveEncountersCase> ResolveEncountersCases { get; set; } = new();

    [JsonPropertyName("resolveCombatChoiceCases")]
    public List<ResolveCombatChoiceCase> ResolveCombatChoiceCases { get; set; } = new();

    [JsonPropertyName("transportColonistsCases")]
    public List<TransportColonistsCase> TransportColonistsCases { get; set; } = new();

    [JsonPropertyName("mergePlanetOwnershipCases")]
    public List<MergePlanetOwnershipCase> MergePlanetOwnershipCases { get; set; } = new();
}

public class TierColorCase
{
    [JsonPropertyName("value")]
    public double Value { get; set; }

    [JsonPropertyName("expectedTier")]
    public string ExpectedTier { get; set; } = string.Empty;
}

public class RollQualityCase
{
    [JsonPropertyName("resourceId")]
    public string ResourceId { get; set; } = string.Empty;

    [JsonPropertyName("randomSequence")]
    public List<double> RandomSequence { get; set; } = new();

    [JsonPropertyName("expectedRoll")]
    public Dictionary<string, int?> ExpectedRoll { get; set; } = new();
}

public class SerializedInstance
{
    [JsonPropertyName("resourceId")]
    public string ResourceId { get; set; } = string.Empty;

    [JsonPropertyName("quantity")]
    public int Quantity { get; set; }

    [JsonPropertyName("qualities")]
    public Dictionary<string, int?> Qualities { get; set; } = new();
}

public class RefineCase
{
    [JsonPropertyName("inputs")]
    public List<SerializedInstance> Inputs { get; set; } = new();

    [JsonPropertyName("refinerTier")]
    public string RefinerTier { get; set; } = string.Empty;

    [JsonPropertyName("randomSequence")]
    public List<double> RandomSequence { get; set; } = new();

    [JsonPropertyName("expectedResult")]
    public ExpectedRefineResult ExpectedResult { get; set; } = new();
}

public class ExpectedRefineResult
{
    [JsonPropertyName("qualities")]
    public Dictionary<string, int?> Qualities { get; set; } = new();

    [JsonPropertyName("outputTier")]
    public string OutputTier { get; set; } = string.Empty;

    [JsonPropertyName("refundUnits")]
    public int RefundUnits { get; set; }
}

public class CraftCase
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("recipeId")]
    public string RecipeId { get; set; } = string.Empty;

    [JsonPropertyName("inputs")]
    public List<SerializedInstance> Inputs { get; set; } = new();

    [JsonPropertyName("schematicTier")]
    public string SchematicTier { get; set; } = string.Empty;

    [JsonPropertyName("crafterTier")]
    public string CrafterTier { get; set; } = string.Empty;

    [JsonPropertyName("randomSequence")]
    public List<double> RandomSequence { get; set; } = new();

    [JsonPropertyName("expectedResult")]
    public ExpectedCraftResult ExpectedResult { get; set; } = new();
}

public class ExpectedCraftResult
{
    [JsonPropertyName("accepted")]
    public bool Accepted { get; set; }

    [JsonPropertyName("qualities")]
    public Dictionary<string, int?>? Qualities { get; set; }

    [JsonPropertyName("reason")]
    public string? Reason { get; set; }
}

public class SerializedPosition
{
    [JsonPropertyName("x")]
    public int X { get; set; }

    [JsonPropertyName("y")]
    public int Y { get; set; }
}

public class SerializedPlanet
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("planetType")]
    public string? PlanetType { get; set; }

    [JsonPropertyName("tier")]
    public string? Tier { get; set; }

    [JsonPropertyName("position")]
    public SerializedPosition? Position { get; set; }

    [JsonPropertyName("producibleResourceIds")]
    public List<string> ProducibleResourceIds { get; set; } = new();

    [JsonPropertyName("specialtyResourceId")]
    public string? SpecialtyResourceId { get; set; }

    [JsonPropertyName("resourceQualities")]
    public Dictionary<string, Dictionary<string, int?>> ResourceQualities { get; set; } = new();

    [JsonPropertyName("discovered")]
    public bool? Discovered { get; set; }

    [JsonPropertyName("colonistCount")]
    public int? ColonistCount { get; set; }
}

public class ExpectedGalaxy
{
    [JsonPropertyName("seed")]
    public string Seed { get; set; } = string.Empty;

    [JsonPropertyName("planets")]
    public List<SerializedPlanet> Planets { get; set; } = new();
}

public class GalaxyCase
{
    [JsonPropertyName("seed")]
    public string Seed { get; set; } = string.Empty;

    [JsonPropertyName("planetCount")]
    public int PlanetCount { get; set; }

    [JsonPropertyName("expectedGalaxy")]
    public ExpectedGalaxy ExpectedGalaxy { get; set; } = new();
}

public class ExpectedResourcesForCycle
{
    [JsonPropertyName("producibleResourceIds")]
    public List<string> ProducibleResourceIds { get; set; } = new();

    [JsonPropertyName("specialtyResourceId")]
    public string? SpecialtyResourceId { get; set; }

    [JsonPropertyName("resourceQualities")]
    public Dictionary<string, Dictionary<string, int?>> ResourceQualities { get; set; } = new();
}

public class PlanetResourceCycleCase
{
    [JsonPropertyName("seed")]
    public string Seed { get; set; } = string.Empty;

    [JsonPropertyName("tier")]
    public string Tier { get; set; } = string.Empty;

    [JsonPropertyName("planetType")]
    public string PlanetType { get; set; } = string.Empty;

    [JsonPropertyName("cycleIndex")]
    public int CycleIndex { get; set; }

    [JsonPropertyName("expectedResult")]
    public ExpectedResourcesForCycle ExpectedResult { get; set; } = new();
}

public class GcprCase
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("planet")]
    public SerializedPlanet Planet { get; set; } = new();

    [JsonPropertyName("nowMs")]
    public long NowMs { get; set; }

    [JsonPropertyName("isStartingPlanet")]
    public bool IsStartingPlanet { get; set; }

    [JsonPropertyName("expectedResult")]
    public ExpectedResourcesForCycle ExpectedResult { get; set; } = new();
}

// ---- Sub-Phase B (Trading) parity DTOs (agent-45-unity-trading-parity
// -validation.md). Location is a raw JsonElement rather than a strongly
// typed field: the TypeScript MarketLocation union serializes as either
// the string "global" or the object { planetId }, which has no single
// natural System.Text.Json shape -- TradingParityTests.ParseLocation
// converts it to a real Profitable.Core.Schema.MarketLocation at the
// point of use instead of forcing a custom converter here. ----

public class SerializedListing
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("itemId")]
    public string ItemId { get; set; } = string.Empty;

    [JsonPropertyName("quantity")]
    public int Quantity { get; set; }

    [JsonPropertyName("pricePerUnit")]
    public double PricePerUnit { get; set; }

    [JsonPropertyName("marketTier")]
    public string MarketTier { get; set; } = string.Empty;

    [JsonPropertyName("location")]
    public System.Text.Json.JsonElement Location { get; set; }

    [JsonPropertyName("createdByPlayerId")]
    public string CreatedByPlayerId { get; set; } = string.Empty;

    [JsonPropertyName("createdAt")]
    public long CreatedAt { get; set; }

    [JsonPropertyName("expiresAt")]
    public long ExpiresAt { get; set; }
}

public class SerializedMarketState
{
    [JsonPropertyName("planetId")]
    public string PlanetId { get; set; } = string.Empty;

    [JsonPropertyName("itemId")]
    public string ItemId { get; set; } = string.Empty;

    [JsonPropertyName("currentPrice")]
    public double CurrentPrice { get; set; }

    [JsonPropertyName("basePrice")]
    public double BasePrice { get; set; }
}

public class SerializedWallet
{
    [JsonPropertyName("playerId")]
    public string PlayerId { get; set; } = string.Empty;

    [JsonPropertyName("credits")]
    public double Credits { get; set; }
}

public class CreateListingCase
{
    [JsonPropertyName("itemInstance")]
    public SerializedInstance ItemInstance { get; set; } = new();

    [JsonPropertyName("quantity")]
    public int Quantity { get; set; }

    [JsonPropertyName("pricePerUnit")]
    public double PricePerUnit { get; set; }

    [JsonPropertyName("location")]
    public System.Text.Json.JsonElement Location { get; set; }

    [JsonPropertyName("playerId")]
    public string PlayerId { get; set; } = string.Empty;

    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("nowMs")]
    public long NowMs { get; set; }

    [JsonPropertyName("expectedListing")]
    public SerializedListing ExpectedListing { get; set; } = new();
}

public class ApplyDriftCase
{
    [JsonPropertyName("marketState")]
    public SerializedMarketState MarketState { get; set; } = new();

    [JsonPropertyName("unitsTraded")]
    public int UnitsTraded { get; set; }

    [JsonPropertyName("direction")]
    public string Direction { get; set; } = string.Empty;

    [JsonPropertyName("expectedMarketState")]
    public SerializedMarketState ExpectedMarketState { get; set; } = new();
}

public class ApplyRecoveryCase
{
    [JsonPropertyName("marketState")]
    public SerializedMarketState MarketState { get; set; } = new();

    [JsonPropertyName("elapsedHours")]
    public double ElapsedHours { get; set; }

    [JsonPropertyName("expectedMarketState")]
    public SerializedMarketState ExpectedMarketState { get; set; } = new();
}

public class SerializedSeasonalEffect
{
    [JsonPropertyName("season")]
    public string Season { get; set; } = string.Empty;

    [JsonPropertyName("cheapCategory")]
    public string CheapCategory { get; set; } = string.Empty;

    [JsonPropertyName("premiumCategory")]
    public string PremiumCategory { get; set; } = string.Empty;
}

public class SeasonCase
{
    [JsonPropertyName("planetId")]
    public string PlanetId { get; set; } = string.Empty;

    [JsonPropertyName("nowMs")]
    public long NowMs { get; set; }

    [JsonPropertyName("categories")]
    public List<string> Categories { get; set; } = new();

    [JsonPropertyName("expectedSeason")]
    public string ExpectedSeason { get; set; } = string.Empty;

    [JsonPropertyName("expectedEffect")]
    public SerializedSeasonalEffect? ExpectedEffect { get; set; }

    [JsonPropertyName("expectedMultiplierForFirstCategory")]
    public double? ExpectedMultiplierForFirstCategory { get; set; }
}

public class SerializedEmergency
{
    [JsonPropertyName("category")]
    public string Category { get; set; } = string.Empty;

    [JsonPropertyName("endsAt")]
    public long EndsAt { get; set; }
}

public class EmergencyCase
{
    [JsonPropertyName("planetId")]
    public string PlanetId { get; set; } = string.Empty;

    [JsonPropertyName("nowMs")]
    public long NowMs { get; set; }

    [JsonPropertyName("categories")]
    public List<string> Categories { get; set; } = new();

    [JsonPropertyName("expectedEmergency")]
    public SerializedEmergency? ExpectedEmergency { get; set; }

    [JsonPropertyName("expectedMultiplierForFirstCategory")]
    public double? ExpectedMultiplierForFirstCategory { get; set; }
}

public class GlobalPriceCase
{
    [JsonPropertyName("itemId")]
    public string ItemId { get; set; } = string.Empty;

    [JsonPropertyName("direction")]
    public string Direction { get; set; } = string.Empty;

    [JsonPropertyName("marketStates")]
    public List<SerializedMarketState> MarketStates { get; set; } = new();

    [JsonPropertyName("expectedPrice")]
    public double ExpectedPrice { get; set; }
}

public class SerializedPurchaseResult
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("reason")]
    public string? Reason { get; set; }

    [JsonPropertyName("updatedListing")]
    public SerializedListing? UpdatedListing { get; set; }

    [JsonPropertyName("closed")]
    public bool? Closed { get; set; }

    [JsonPropertyName("quantityPurchased")]
    public int? QuantityPurchased { get; set; }

    [JsonPropertyName("totalPaid")]
    public double? TotalPaid { get; set; }

    [JsonPropertyName("feeDeducted")]
    public double? FeeDeducted { get; set; }

    [JsonPropertyName("proceedsToSeller")]
    public double? ProceedsToSeller { get; set; }

    [JsonPropertyName("updatedMarketState")]
    public SerializedMarketState? UpdatedMarketState { get; set; }
}

public class PurchaseListingCase
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("listing")]
    public SerializedListing Listing { get; set; } = new();

    [JsonPropertyName("quantityToBuy")]
    public int QuantityToBuy { get; set; }

    [JsonPropertyName("buyerPlayerId")]
    public string BuyerPlayerId { get; set; } = string.Empty;

    [JsonPropertyName("marketState")]
    public SerializedMarketState? MarketState { get; set; }

    [JsonPropertyName("expectedResult")]
    public SerializedPurchaseResult ExpectedResult { get; set; } = new();
}

public class SerializedSellToMarketResult
{
    [JsonPropertyName("quantitySold")]
    public int QuantitySold { get; set; }

    [JsonPropertyName("totalValue")]
    public double TotalValue { get; set; }

    [JsonPropertyName("feeDeducted")]
    public double FeeDeducted { get; set; }

    [JsonPropertyName("proceedsToSeller")]
    public double ProceedsToSeller { get; set; }

    [JsonPropertyName("updatedWallet")]
    public SerializedWallet UpdatedWallet { get; set; } = new();

    [JsonPropertyName("updatedMarketState")]
    public SerializedMarketState UpdatedMarketState { get; set; } = new();
}

public class SellToMarketCase
{
    [JsonPropertyName("itemInstance")]
    public SerializedInstance ItemInstance { get; set; } = new();

    [JsonPropertyName("quantity")]
    public int Quantity { get; set; }

    [JsonPropertyName("marketState")]
    public SerializedMarketState MarketState { get; set; } = new();

    [JsonPropertyName("wallet")]
    public SerializedWallet Wallet { get; set; } = new();

    [JsonPropertyName("sellerPlayerId")]
    public string SellerPlayerId { get; set; } = string.Empty;

    [JsonPropertyName("expectedResult")]
    public SerializedSellToMarketResult ExpectedResult { get; set; } = new();
}

public class SerializedSellToGlobalMarketResult
{
    [JsonPropertyName("quantitySold")]
    public int QuantitySold { get; set; }

    [JsonPropertyName("totalValue")]
    public double TotalValue { get; set; }

    [JsonPropertyName("feeDeducted")]
    public double FeeDeducted { get; set; }

    [JsonPropertyName("proceedsToSeller")]
    public double ProceedsToSeller { get; set; }

    [JsonPropertyName("updatedWallet")]
    public SerializedWallet UpdatedWallet { get; set; } = new();
}

public class SellToGlobalMarketCase
{
    [JsonPropertyName("itemInstance")]
    public SerializedInstance ItemInstance { get; set; } = new();

    [JsonPropertyName("quantity")]
    public int Quantity { get; set; }

    [JsonPropertyName("marketStates")]
    public List<SerializedMarketState> MarketStates { get; set; } = new();

    [JsonPropertyName("wallet")]
    public SerializedWallet Wallet { get; set; } = new();

    [JsonPropertyName("sellerPlayerId")]
    public string SellerPlayerId { get; set; } = string.Empty;

    [JsonPropertyName("expectedResult")]
    public SerializedSellToGlobalMarketResult ExpectedResult { get; set; } = new();
}

public class SerializedReturnAction
{
    [JsonPropertyName("itemId")]
    public string ItemId { get; set; } = string.Empty;

    [JsonPropertyName("quantity")]
    public int Quantity { get; set; }

    [JsonPropertyName("playerId")]
    public string PlayerId { get; set; } = string.Empty;

    [JsonPropertyName("destination")]
    public string Destination { get; set; } = string.Empty;

    [JsonPropertyName("planetId")]
    public string? PlanetId { get; set; }
}

public class SerializedListingExpiryResult
{
    [JsonPropertyName("expired")]
    public List<SerializedListing> Expired { get; set; } = new();

    [JsonPropertyName("returned")]
    public List<SerializedReturnAction> Returned { get; set; } = new();
}

public class ExpireListingsCase
{
    [JsonPropertyName("listings")]
    public List<SerializedListing> Listings { get; set; } = new();

    [JsonPropertyName("currentTimeMs")]
    public long CurrentTimeMs { get; set; }

    [JsonPropertyName("expectedResult")]
    public SerializedListingExpiryResult ExpectedResult { get; set; } = new();
}

// ---- Sub-Phase C (Crew) parity DTOs (agent-50-unity-crew-parity
// -validation.md). ----

public class SerializedCrewCandidate
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("tier")]
    public string Tier { get; set; } = string.Empty;

    [JsonPropertyName("profession")]
    public string? Profession { get; set; }
}

public class SerializedCrewCapacity
{
    [JsonPropertyName("playerId")]
    public string PlayerId { get; set; } = string.Empty;

    [JsonPropertyName("baseCapacity")]
    public int BaseCapacity { get; set; }

    [JsonPropertyName("purchasedSlots")]
    public int PurchasedSlots { get; set; }
}

public class SerializedPlanetCrewPool
{
    [JsonPropertyName("planetId")]
    public string PlanetId { get; set; } = string.Empty;

    [JsonPropertyName("availableHires")]
    public List<SerializedCrewCandidate> AvailableHires { get; set; } = new();

    [JsonPropertyName("lastRefreshedAt")]
    public long LastRefreshedAt { get; set; }
}

public class SerializedCrewMember
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("hiredByPlayerId")]
    public string HiredByPlayerId { get; set; } = string.Empty;

    [JsonPropertyName("tier")]
    public string Tier { get; set; } = string.Empty;

    [JsonPropertyName("profession")]
    public string? Profession { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("assignedCraftId")]
    public string? AssignedCraftId { get; set; }

    [JsonPropertyName("hiredAt")]
    public long HiredAt { get; set; }

    [JsonPropertyName("lastCheckedAt")]
    public long LastCheckedAt { get; set; }

    [JsonPropertyName("wageAmount")]
    public double WageAmount { get; set; }

    [JsonPropertyName("lastPaidAt")]
    public long LastPaidAt { get; set; }

    [JsonPropertyName("unavailableUntil")]
    public long? UnavailableUntil { get; set; }

    [JsonPropertyName("shipRole")]
    public string? ShipRole { get; set; }

    [JsonPropertyName("assignedShipId")]
    public string? AssignedShipId { get; set; }
}

public class HireCrewCase
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("candidate")]
    public SerializedCrewCandidate Candidate { get; set; } = new();

    [JsonPropertyName("pool")]
    public SerializedPlanetCrewPool Pool { get; set; } = new();

    [JsonPropertyName("capacity")]
    public SerializedCrewCapacity Capacity { get; set; } = new();

    [JsonPropertyName("existingCrew")]
    public List<SerializedCrewMember> ExistingCrew { get; set; } = new();

    [JsonPropertyName("wallet")]
    public SerializedWallet Wallet { get; set; } = new();

    [JsonPropertyName("playerId")]
    public string PlayerId { get; set; } = string.Empty;

    [JsonPropertyName("nowMs")]
    public long NowMs { get; set; }

    [JsonPropertyName("expectedResult")]
    public SerializedHireResult ExpectedResult { get; set; } = new();
}

public class SerializedHireResult
{
    [JsonPropertyName("hired")]
    public bool Hired { get; set; }

    [JsonPropertyName("reason")]
    public string? Reason { get; set; }

    [JsonPropertyName("crewMember")]
    public SerializedCrewMember? CrewMember { get; set; }

    [JsonPropertyName("updatedPool")]
    public SerializedPlanetCrewPool? UpdatedPool { get; set; }

    [JsonPropertyName("updatedWallet")]
    public SerializedWallet? UpdatedWallet { get; set; }
}

public class DismissCrewCase
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("crewMember")]
    public SerializedCrewMember CrewMember { get; set; } = new();

    [JsonPropertyName("playerId")]
    public string PlayerId { get; set; } = string.Empty;

    [JsonPropertyName("expectedResult")]
    public SerializedDismissResult ExpectedResult { get; set; } = new();
}

public class SerializedDismissResult
{
    [JsonPropertyName("dismissed")]
    public bool Dismissed { get; set; }

    [JsonPropertyName("reason")]
    public string? Reason { get; set; }
}

public class PayUpkeepCase
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("crewMember")]
    public SerializedCrewMember CrewMember { get; set; } = new();

    [JsonPropertyName("wallet")]
    public SerializedWallet Wallet { get; set; } = new();

    [JsonPropertyName("nowMs")]
    public long NowMs { get; set; }

    [JsonPropertyName("expectedResult")]
    public SerializedPaymentResult ExpectedResult { get; set; } = new();
}

public class SerializedPaymentResult
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("updatedCrewMember")]
    public SerializedCrewMember? UpdatedCrewMember { get; set; }

    [JsonPropertyName("updatedWallet")]
    public SerializedWallet? UpdatedWallet { get; set; }
}

public class CheckAttritionCase
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("crewMember")]
    public SerializedCrewMember CrewMember { get; set; } = new();

    [JsonPropertyName("nowMs")]
    public long NowMs { get; set; }

    [JsonPropertyName("expectedResult")]
    public SerializedAttritionResult ExpectedResult { get; set; } = new();
}

public class SerializedAttritionResult
{
    [JsonPropertyName("departed")]
    public bool Departed { get; set; }

    [JsonPropertyName("reason")]
    public string? Reason { get; set; }
}

public class PurchaseCapacityCase
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("capacity")]
    public SerializedCrewCapacity Capacity { get; set; } = new();

    [JsonPropertyName("wallet")]
    public SerializedWallet Wallet { get; set; } = new();

    [JsonPropertyName("expectedResult")]
    public SerializedPurchaseCapacityResult ExpectedResult { get; set; } = new();
}

public class SerializedPurchaseCapacityResult
{
    [JsonPropertyName("purchased")]
    public bool Purchased { get; set; }

    [JsonPropertyName("reason")]
    public string? Reason { get; set; }

    [JsonPropertyName("updatedCapacity")]
    public SerializedCrewCapacity? UpdatedCapacity { get; set; }

    [JsonPropertyName("updatedWallet")]
    public SerializedWallet? UpdatedWallet { get; set; }
}

public class RefreshCrewPoolCase
{
    [JsonPropertyName("planetId")]
    public string PlanetId { get; set; } = string.Empty;

    [JsonPropertyName("seed")]
    public string Seed { get; set; } = string.Empty;

    [JsonPropertyName("nowMs")]
    public long NowMs { get; set; }

    [JsonPropertyName("expectedResult")]
    public SerializedPlanetCrewPool ExpectedResult { get; set; } = new();
}

public class SerializedCraftAction
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("inputs")]
    public List<SerializedInstance> Inputs { get; set; } = new();

    [JsonPropertyName("recipeId")]
    public string RecipeId { get; set; } = string.Empty;

    [JsonPropertyName("schematicTier")]
    public string SchematicTier { get; set; } = string.Empty;
}

public class AssignToCraftCase
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("crewMember")]
    public SerializedCrewMember CrewMember { get; set; } = new();

    [JsonPropertyName("craftAction")]
    public SerializedCraftAction CraftAction { get; set; } = new();

    [JsonPropertyName("randomSequence")]
    public List<double> RandomSequence { get; set; } = new();

    [JsonPropertyName("expectedResult")]
    public SerializedAssignResult ExpectedResult { get; set; } = new();
}

public class SerializedAssignResult
{
    [JsonPropertyName("assigned")]
    public bool Assigned { get; set; }

    [JsonPropertyName("reason")]
    public string? Reason { get; set; }

    [JsonPropertyName("updatedCrewMember")]
    public SerializedCrewMember? UpdatedCrewMember { get; set; }

    [JsonPropertyName("craftResult")]
    public ExpectedCraftResult? CraftResult { get; set; }
}

public class ResolveBackgroundCraftingCase
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("crewMember")]
    public SerializedCrewMember CrewMember { get; set; } = new();

    [JsonPropertyName("nowMs")]
    public long NowMs { get; set; }

    [JsonPropertyName("backgroundRateOmitted")]
    public bool BackgroundRateOmitted { get; set; }

    [JsonPropertyName("backgroundRate")]
    public double? BackgroundRate { get; set; }

    [JsonPropertyName("maxUnits")]
    public double? MaxUnits { get; set; }

    [JsonPropertyName("randomSequence")]
    public List<double> RandomSequence { get; set; } = new();

    [JsonPropertyName("expectedResult")]
    public SerializedBackgroundResult ExpectedResult { get; set; } = new();
}

public class SerializedBackgroundResult
{
    [JsonPropertyName("resolved")]
    public bool Resolved { get; set; }

    [JsonPropertyName("reason")]
    public string? Reason { get; set; }

    [JsonPropertyName("unitsCompleted")]
    public int? UnitsCompleted { get; set; }

    [JsonPropertyName("results")]
    public List<ExpectedCraftResult>? Results { get; set; }

    [JsonPropertyName("updatedCrewMember")]
    public SerializedCrewMember UpdatedCrewMember { get; set; } = new();
}

// ---- Sub-Phase D (Ships & Travel, incl. Scanner/Combat/Encounters)
// parity DTOs (agent-55-unity-ships-travel-parity-validation.md). ----

public class SerializedShipComponent
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("category")]
    public string Category { get; set; } = string.Empty;

    [JsonPropertyName("qualities")]
    public Dictionary<string, int?> Qualities { get; set; } = new();

    [JsonPropertyName("tier")]
    public string Tier { get; set; } = string.Empty;
}

public class SerializedShipComponentSlots
{
    [JsonPropertyName("weapon")]
    public SerializedShipComponent? Weapon { get; set; }

    [JsonPropertyName("engine")]
    public SerializedShipComponent? Engine { get; set; }

    [JsonPropertyName("shield")]
    public SerializedShipComponent? Shield { get; set; }

    [JsonPropertyName("cargoHold")]
    public SerializedShipComponent? CargoHold { get; set; }
}

public class SerializedShip
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("ownerId")]
    public string OwnerId { get; set; } = string.Empty;

    [JsonPropertyName("tier")]
    public string Tier { get; set; } = string.Empty;

    [JsonPropertyName("currentPlanetId")]
    public string CurrentPlanetId { get; set; } = string.Empty;

    [JsonPropertyName("fuelCapacity")]
    public double FuelCapacity { get; set; }

    [JsonPropertyName("currentFuel")]
    public double CurrentFuel { get; set; }

    [JsonPropertyName("components")]
    public SerializedShipComponentSlots Components { get; set; } = new();

    [JsonPropertyName("lastRepairedAt")]
    public long? LastRepairedAt { get; set; }
}

public class SerializedShipCandidate
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("tier")]
    public string Tier { get; set; } = string.Empty;

    [JsonPropertyName("components")]
    public SerializedShipComponentSlots Components { get; set; } = new();
}

public class SerializedShipyardPool
{
    [JsonPropertyName("planetId")]
    public string PlanetId { get; set; } = string.Empty;

    [JsonPropertyName("availableShips")]
    public List<SerializedShipCandidate> AvailableShips { get; set; } = new();

    [JsonPropertyName("lastRefreshedAt")]
    public long LastRefreshedAt { get; set; }
}

public class SerializedScanner
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("tier")]
    public string Tier { get; set; } = string.Empty;

    [JsonPropertyName("ownerId")]
    public string OwnerId { get; set; } = string.Empty;
}

public class SerializedScannerCandidate
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("tier")]
    public string Tier { get; set; } = string.Empty;
}

public class SerializedScannerPool
{
    [JsonPropertyName("planetId")]
    public string PlanetId { get; set; } = string.Empty;

    [JsonPropertyName("availableScanners")]
    public List<SerializedScannerCandidate> AvailableScanners { get; set; } = new();

    [JsonPropertyName("lastRefreshedAt")]
    public long LastRefreshedAt { get; set; }
}

public class SerializedVoyageCargoItem
{
    [JsonPropertyName("itemId")]
    public string ItemId { get; set; } = string.Empty;

    [JsonPropertyName("quantity")]
    public int Quantity { get; set; }
}

public class SerializedVoyage
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("shipId")]
    public string ShipId { get; set; } = string.Empty;

    [JsonPropertyName("originPlanetId")]
    public string OriginPlanetId { get; set; } = string.Empty;

    [JsonPropertyName("destinationPlanetId")]
    public string DestinationPlanetId { get; set; } = string.Empty;

    [JsonPropertyName("departedAt")]
    public long DepartedAt { get; set; }

    [JsonPropertyName("arrivesAt")]
    public double ArrivesAt { get; set; }

    [JsonPropertyName("cargo")]
    public List<SerializedVoyageCargoItem> Cargo { get; set; } = new();

    [JsonPropertyName("isRetreat")]
    public bool? IsRetreat { get; set; }
}

public class SerializedCombatEncounter
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("voyageId")]
    public string VoyageId { get; set; } = string.Empty;

    [JsonPropertyName("triggerContext")]
    public string TriggerContext { get; set; } = string.Empty;

    [JsonPropertyName("opponentThreatTier")]
    public string OpponentThreatTier { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("outcome")]
    public string? Outcome { get; set; }

    [JsonPropertyName("windowIndex")]
    public int? WindowIndex { get; set; }
}

public class SerializedEncounterResult
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("windowIndex")]
    public int WindowIndex { get; set; }

    [JsonPropertyName("outcome")]
    public SerializedEncounterOutcome Outcome { get; set; } = new();
}

public class SerializedEncounterOutcome
{
    [JsonPropertyName("creditsGranted")]
    public double? CreditsGranted { get; set; }

    [JsonPropertyName("resourceId")]
    public string? ResourceId { get; set; }

    [JsonPropertyName("qualities")]
    public Dictionary<string, int?>? Qualities { get; set; }

    [JsonPropertyName("passed")]
    public bool? Passed { get; set; }

    [JsonPropertyName("creditsLost")]
    public double? CreditsLost { get; set; }
}

public class SerializedEncounterResolution
{
    [JsonPropertyName("encounters")]
    public List<SerializedEncounterResult> Encounters { get; set; } = new();

    [JsonPropertyName("pendingCombats")]
    public List<SerializedCombatEncounter> PendingCombats { get; set; } = new();
}

public class SerializedArrivalResult
{
    [JsonPropertyName("resolved")]
    public bool Resolved { get; set; }

    [JsonPropertyName("reason")]
    public string? Reason { get; set; }

    [JsonPropertyName("updatedShip")]
    public SerializedShip? UpdatedShip { get; set; }

    [JsonPropertyName("destinationPlanetId")]
    public string? DestinationPlanetId { get; set; }

    [JsonPropertyName("cargo")]
    public List<SerializedVoyageCargoItem>? Cargo { get; set; }

    [JsonPropertyName("encounters")]
    public List<SerializedEncounterResult>? Encounters { get; set; }

    [JsonPropertyName("pendingCombats")]
    public List<SerializedCombatEncounter>? PendingCombats { get; set; }
}

public class SerializedInitiateVoyageResult
{
    [JsonPropertyName("voyage")]
    public SerializedVoyage Voyage { get; set; } = new();

    [JsonPropertyName("updatedShip")]
    public SerializedShip UpdatedShip { get; set; } = new();
}

public class SerializedPurchaseShipResult
{
    [JsonPropertyName("purchased")]
    public bool Purchased { get; set; }

    [JsonPropertyName("reason")]
    public string? Reason { get; set; }

    [JsonPropertyName("ship")]
    public SerializedShip? Ship { get; set; }

    [JsonPropertyName("updatedPool")]
    public SerializedShipyardPool? UpdatedPool { get; set; }

    [JsonPropertyName("updatedWallet")]
    public SerializedWallet? UpdatedWallet { get; set; }
}

public class SerializedPurchaseScannerResult
{
    [JsonPropertyName("purchased")]
    public bool Purchased { get; set; }

    [JsonPropertyName("reason")]
    public string? Reason { get; set; }

    [JsonPropertyName("scanner")]
    public SerializedScanner? Scanner { get; set; }

    [JsonPropertyName("updatedPool")]
    public SerializedScannerPool? UpdatedPool { get; set; }

    [JsonPropertyName("updatedWallet")]
    public SerializedWallet? UpdatedWallet { get; set; }
}

public class SerializedRefuelShipResult
{
    [JsonPropertyName("refueled")]
    public bool Refueled { get; set; }

    [JsonPropertyName("reason")]
    public string? Reason { get; set; }

    [JsonPropertyName("updatedShip")]
    public SerializedShip? UpdatedShip { get; set; }

    [JsonPropertyName("updatedWallet")]
    public SerializedWallet? UpdatedWallet { get; set; }
}

public class SerializedCrewSlotsByTierEntry
{
    [JsonPropertyName("tier")]
    public string Tier { get; set; } = string.Empty;

    [JsonPropertyName("pilot")]
    public int Pilot { get; set; }

    [JsonPropertyName("combatEngineerOrScienceOfficer")]
    public int CombatEngineerOrScienceOfficer { get; set; }

    [JsonPropertyName("systemsEngineer")]
    public int SystemsEngineer { get; set; }

    [JsonPropertyName("crafter")]
    public int Crafter { get; set; }
}

public class SerializedAssignShipRoleResult
{
    [JsonPropertyName("assigned")]
    public bool Assigned { get; set; }

    [JsonPropertyName("reason")]
    public string? Reason { get; set; }

    [JsonPropertyName("updatedCrewMember")]
    public SerializedCrewMember? UpdatedCrewMember { get; set; }
}

public class SerializedUnassignShipRoleResult
{
    [JsonPropertyName("unassigned")]
    public bool Unassigned { get; set; }

    [JsonPropertyName("reason")]
    public string? Reason { get; set; }

    [JsonPropertyName("updatedCrewMember")]
    public SerializedCrewMember? UpdatedCrewMember { get; set; }
}

public class SerializedCombatResolution
{
    [JsonPropertyName("combatEncounter")]
    public SerializedCombatEncounter CombatEncounter { get; set; } = new();

    [JsonPropertyName("updatedShip")]
    public SerializedShip UpdatedShip { get; set; } = new();

    [JsonPropertyName("updatedCrewMember")]
    public SerializedCrewMember? UpdatedCrewMember { get; set; }

    [JsonPropertyName("retreatVoyage")]
    public SerializedVoyage? RetreatVoyage { get; set; }
}

public class SerializedPerformScanResult
{
    [JsonPropertyName("scanned")]
    public bool Scanned { get; set; }

    [JsonPropertyName("reason")]
    public string? Reason { get; set; }

    [JsonPropertyName("newlyDiscovered")]
    public List<SerializedPlanet>? NewlyDiscovered { get; set; }
}

// A minimal planet reference (id + position only) -- several Sub-Phase D
// cases only need these two fields to reconstruct a real Planet input,
// unlike the fuller SerializedPlanet (galaxy/planet cases) which carries
// every field. Kept separate rather than reusing SerializedPlanet with
// its other fields left at JSON-missing defaults, since a reader
// shouldn't have to guess which fields on SerializedPlanet a given case
// actually populated.
public class SerializedPlanetRef
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("position")]
    public SerializedPosition? Position { get; set; }

    // Only populated (and only meaningful) for PerformScanCase's
    // AllPlanets list -- left null for every other use of this DTO
    // (travel-time/fuel-cost cases, which don't need it).
    [JsonPropertyName("discovered")]
    public bool? Discovered { get; set; }
}

public class CalculateDistanceCase
{
    [JsonPropertyName("a")]
    public SerializedPosition A { get; set; } = new();

    [JsonPropertyName("b")]
    public SerializedPosition B { get; set; } = new();

    [JsonPropertyName("expectedDistance")]
    public double ExpectedDistance { get; set; }
}

public class CalculateTravelTimeCase
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("origin")]
    public SerializedPlanetRef Origin { get; set; } = new();

    [JsonPropertyName("destination")]
    public SerializedPlanetRef Destination { get; set; } = new();

    [JsonPropertyName("ship")]
    public SerializedShip Ship { get; set; } = new();

    [JsonPropertyName("pilot")]
    public SerializedCrewMember? Pilot { get; set; }

    [JsonPropertyName("expectedTravelTimeMs")]
    public double ExpectedTravelTimeMs { get; set; }
}

public class CalculateFuelCostCase
{
    [JsonPropertyName("origin")]
    public SerializedPlanetRef Origin { get; set; } = new();

    [JsonPropertyName("destination")]
    public SerializedPlanetRef Destination { get; set; } = new();

    [JsonPropertyName("expectedFuelCost")]
    public double ExpectedFuelCost { get; set; }
}

public class DeriveFuelCapacityCase
{
    [JsonPropertyName("tier")]
    public string Tier { get; set; } = string.Empty;

    [JsonPropertyName("expectedCapacity")]
    public double ExpectedCapacity { get; set; }
}

public class DeriveShipTierCase
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("ship")]
    public SerializedShip Ship { get; set; } = new();

    [JsonPropertyName("expectedTier")]
    public string ExpectedTier { get; set; } = string.Empty;
}

public class TierMidpointCase
{
    [JsonPropertyName("tier")]
    public string Tier { get; set; } = string.Empty;

    [JsonPropertyName("expectedMidpoint")]
    public double ExpectedMidpoint { get; set; }
}

public class AssembleShipCase
{
    [JsonPropertyName("ship")]
    public SerializedShip Ship { get; set; } = new();

    [JsonPropertyName("component")]
    public SerializedShipComponent Component { get; set; } = new();

    [JsonPropertyName("slot")]
    public string Slot { get; set; } = string.Empty;

    [JsonPropertyName("expectedShip")]
    public SerializedShip ExpectedShip { get; set; } = new();
}

public class InitiateVoyageCase
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("ship")]
    public SerializedShip Ship { get; set; } = new();

    [JsonPropertyName("origin")]
    public SerializedPlanetRef Origin { get; set; } = new();

    [JsonPropertyName("destination")]
    public SerializedPlanetRef Destination { get; set; } = new();

    [JsonPropertyName("cargo")]
    public List<SerializedVoyageCargoItem> Cargo { get; set; } = new();

    [JsonPropertyName("nowMs")]
    public long NowMs { get; set; }

    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("isRetreat")]
    public bool IsRetreat { get; set; }

    [JsonPropertyName("pilot")]
    public SerializedCrewMember? Pilot { get; set; }

    [JsonPropertyName("expectedResult")]
    public SerializedInitiateVoyageResult ExpectedResult { get; set; } = new();
}

public class ResolveArrivalCase
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("voyage")]
    public SerializedVoyage Voyage { get; set; } = new();

    [JsonPropertyName("ship")]
    public SerializedShip Ship { get; set; } = new();

    [JsonPropertyName("nowMs")]
    public long NowMs { get; set; }

    [JsonPropertyName("destinationPlanet")]
    public SerializedPlanetRefWithResources? DestinationPlanet { get; set; }

    [JsonPropertyName("hasResources")]
    public bool HasResources { get; set; }

    [JsonPropertyName("randomSequence")]
    public List<double> RandomSequence { get; set; } = new();

    [JsonPropertyName("expectedResult")]
    public SerializedArrivalResult ExpectedResult { get; set; } = new();
}

public class SerializedPlanetRefWithResources
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("producibleResourceIds")]
    public List<string> ProducibleResourceIds { get; set; } = new();
}

public class PurchaseShipCase
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("candidate")]
    public SerializedShipCandidate Candidate { get; set; } = new();

    [JsonPropertyName("pool")]
    public SerializedShipyardPool Pool { get; set; } = new();

    [JsonPropertyName("wallet")]
    public SerializedWallet Wallet { get; set; } = new();

    [JsonPropertyName("expectedResult")]
    public SerializedPurchaseShipResult ExpectedResult { get; set; } = new();
}

public class PurchaseScannerCase
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("candidate")]
    public SerializedScannerCandidate Candidate { get; set; } = new();

    [JsonPropertyName("pool")]
    public SerializedScannerPool Pool { get; set; } = new();

    [JsonPropertyName("wallet")]
    public SerializedWallet Wallet { get; set; } = new();

    [JsonPropertyName("expectedResult")]
    public SerializedPurchaseScannerResult ExpectedResult { get; set; } = new();
}

public class RefreshShipyardPoolCase
{
    [JsonPropertyName("planetId")]
    public string PlanetId { get; set; } = string.Empty;

    [JsonPropertyName("seed")]
    public string Seed { get; set; } = string.Empty;

    [JsonPropertyName("nowMs")]
    public long NowMs { get; set; }

    [JsonPropertyName("expectedResult")]
    public SerializedShipyardPool ExpectedResult { get; set; } = new();
}

public class RefreshScannerPoolCase
{
    [JsonPropertyName("planetId")]
    public string PlanetId { get; set; } = string.Empty;

    [JsonPropertyName("seed")]
    public string Seed { get; set; } = string.Empty;

    [JsonPropertyName("nowMs")]
    public long NowMs { get; set; }

    [JsonPropertyName("expectedResult")]
    public SerializedScannerPool ExpectedResult { get; set; } = new();
}

public class RefuelShipCase
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("ship")]
    public SerializedShip Ship { get; set; } = new();

    [JsonPropertyName("wallet")]
    public SerializedWallet Wallet { get; set; } = new();

    [JsonPropertyName("amount")]
    public double Amount { get; set; }

    [JsonPropertyName("expectedResult")]
    public SerializedRefuelShipResult ExpectedResult { get; set; } = new();
}

public class GetCrewSlotsForShipCase
{
    [JsonPropertyName("tier")]
    public string Tier { get; set; } = string.Empty;

    [JsonPropertyName("ship")]
    public SerializedShip Ship { get; set; } = new();

    [JsonPropertyName("expectedResult")]
    public SerializedCrewSlotsByTierEntry ExpectedResult { get; set; } = new();
}

public class AssignToShipRoleCase
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("crewMember")]
    public SerializedCrewMember CrewMember { get; set; } = new();

    [JsonPropertyName("ship")]
    public SerializedShip Ship { get; set; } = new();

    [JsonPropertyName("role")]
    public string Role { get; set; } = string.Empty;

    [JsonPropertyName("currentRoster")]
    public List<SerializedCrewMember> CurrentRoster { get; set; } = new();

    [JsonPropertyName("expectedResult")]
    public SerializedAssignShipRoleResult ExpectedResult { get; set; } = new();
}

public class UnassignFromShipRoleCase
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("crewMember")]
    public SerializedCrewMember CrewMember { get; set; } = new();

    [JsonPropertyName("expectedResult")]
    public SerializedUnassignShipRoleResult ExpectedResult { get; set; } = new();
}

public class ResolveComponentRepairCase
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("ship")]
    public SerializedShip Ship { get; set; } = new();

    [JsonPropertyName("ownedCrew")]
    public List<SerializedCrewMember> OwnedCrew { get; set; } = new();

    [JsonPropertyName("activeVoyage")]
    public SerializedVoyage? ActiveVoyage { get; set; }

    [JsonPropertyName("nowMs")]
    public long NowMs { get; set; }

    [JsonPropertyName("expectedResult")]
    public SerializedShip ExpectedResult { get; set; } = new();
}

public class PerformScanCase
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("ship")]
    public SerializedShip Ship { get; set; } = new();

    [JsonPropertyName("dockedPlanet")]
    public SerializedPlanet DockedPlanet { get; set; } = new();

    [JsonPropertyName("ownedScanners")]
    public List<SerializedScanner> OwnedScanners { get; set; } = new();

    [JsonPropertyName("allPlanets")]
    public List<SerializedPlanetRef> AllPlanets { get; set; } = new();

    [JsonPropertyName("expectedResult")]
    public SerializedPerformScanResult ExpectedResult { get; set; } = new();
}

public class InitiateCombatCase
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("voyageId")]
    public string VoyageId { get; set; } = string.Empty;

    [JsonPropertyName("triggerContext")]
    public string TriggerContext { get; set; } = string.Empty;

    [JsonPropertyName("windowIndex")]
    public int? WindowIndex { get; set; }

    [JsonPropertyName("randomSequence")]
    public List<double> RandomSequence { get; set; } = new();

    [JsonPropertyName("expectedResult")]
    public SerializedCombatEncounter ExpectedResult { get; set; } = new();
}

public class ResolveEncountersCase
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("voyage")]
    public SerializedVoyage Voyage { get; set; } = new();

    [JsonPropertyName("ship")]
    public SerializedShip Ship { get; set; } = new();

    [JsonPropertyName("destinationPlanet")]
    public SerializedPlanetRefWithResources DestinationPlanet { get; set; } = new();

    [JsonPropertyName("randomSequence")]
    public List<double> RandomSequence { get; set; } = new();

    [JsonPropertyName("expectedResult")]
    public SerializedEncounterResolution ExpectedResult { get; set; } = new();
}

public class ResolveCombatChoiceCase
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("encounter")]
    public SerializedCombatEncounter Encounter { get; set; } = new();

    [JsonPropertyName("choice")]
    public string Choice { get; set; } = string.Empty;

    [JsonPropertyName("ship")]
    public SerializedShip Ship { get; set; } = new();

    [JsonPropertyName("ownedCrew")]
    public List<SerializedCrewMember> OwnedCrew { get; set; } = new();

    [JsonPropertyName("originPlanet")]
    public SerializedPlanetRef OriginPlanet { get; set; } = new();

    [JsonPropertyName("currentPlanet")]
    public SerializedPlanetRef CurrentPlanet { get; set; } = new();

    [JsonPropertyName("randomSequence")]
    public List<double> RandomSequence { get; set; } = new();

    [JsonPropertyName("retreatVoyageId")]
    public string RetreatVoyageId { get; set; } = string.Empty;

    [JsonPropertyName("nowMs")]
    public long NowMs { get; set; }

    [JsonPropertyName("expectedResult")]
    public SerializedCombatResolution ExpectedResult { get; set; } = new();
}

// ---- Sub-Phase E (Planet Ownership) parity DTOs (agent-60-unity-planet
// -ownership-parity-validation.md).
//
// Retroactive removal (2026-08-04): CitadelLevel/OwnedByPlayerId removed
// from SerializedPlanetOwnershipEntry, and ClaimPlanetCase/BuildCitadelCase
// (and their Serialized*Result DTOs) removed entirely, along with the
// whole Citadels sub-system -- see planet-ownership.md's own retroactive
// note. TransportColonistsCase/MergePlanetOwnershipCase are unaffected. ----

public class SerializedPlanetOwnershipEntry
{
    [JsonPropertyName("colonistCount")]
    public int ColonistCount { get; set; }
}

public class TransportColonistsCase
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("ship")]
    public SerializedShip Ship { get; set; } = new();

    [JsonPropertyName("planet")]
    public SerializedPlanetRef Planet { get; set; } = new();

    [JsonPropertyName("quantity")]
    public int Quantity { get; set; }

    [JsonPropertyName("wallet")]
    public SerializedWallet Wallet { get; set; } = new();

    [JsonPropertyName("entry")]
    public SerializedPlanetOwnershipEntry Entry { get; set; } = new();

    [JsonPropertyName("expectedResult")]
    public SerializedTransportColonistsResult ExpectedResult { get; set; } = new();
}

public class SerializedTransportColonistsResult
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("reason")]
    public string? Reason { get; set; }

    [JsonPropertyName("updatedWallet")]
    public SerializedWallet? UpdatedWallet { get; set; }

    [JsonPropertyName("updatedOwnershipEntry")]
    public SerializedPlanetOwnershipEntry? UpdatedOwnershipEntry { get; set; }
}

public class MergePlanetOwnershipCase
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("planet")]
    public SerializedPlanet Planet { get; set; } = new();

    [JsonPropertyName("entry")]
    public SerializedPlanetOwnershipEntry? Entry { get; set; }

    [JsonPropertyName("expectedResult")]
    public SerializedPlanet ExpectedResult { get; set; } = new();
}
