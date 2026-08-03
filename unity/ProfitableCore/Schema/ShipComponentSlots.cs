namespace Profitable.Core.Schema;

// Ports the `{ weapon, engine, shield, cargoHold }` component-slot shape
// shared by Ship.components and ShipCandidate.components in the
// TypeScript source (both object-literal-typed inline there, not a named
// interface -- named here since C# has no equivalent anonymous-object
// convenience for a reused shape).
public class ShipComponentSlots
{
    public ShipComponent? Weapon { get; set; }
    public ShipComponent? Engine { get; set; }
    public ShipComponent? Shield { get; set; }
    public ShipComponent? CargoHold { get; set; }

    public ShipComponent? Get(ComponentCategory category) => category switch
    {
        ComponentCategory.Weapon => Weapon,
        ComponentCategory.Engine => Engine,
        ComponentCategory.Shield => Shield,
        ComponentCategory.CargoHold => CargoHold,
        _ => throw new ArgumentOutOfRangeException(nameof(category)),
    };

    public ShipComponentSlots With(ComponentCategory category, ShipComponent component)
    {
        var copy = new ShipComponentSlots { Weapon = Weapon, Engine = Engine, Shield = Shield, CargoHold = CargoHold };
        switch (category)
        {
            case ComponentCategory.Weapon: copy.Weapon = component; break;
            case ComponentCategory.Engine: copy.Engine = component; break;
            case ComponentCategory.Shield: copy.Shield = component; break;
            case ComponentCategory.CargoHold: copy.CargoHold = component; break;
        }
        return copy;
    }

    public IEnumerable<KeyValuePair<ComponentCategory, ShipComponent?>> AsPairs()
    {
        yield return new(ComponentCategory.Weapon, Weapon);
        yield return new(ComponentCategory.Engine, Engine);
        yield return new(ComponentCategory.Shield, Shield);
        yield return new(ComponentCategory.CargoHold, CargoHold);
    }
}
