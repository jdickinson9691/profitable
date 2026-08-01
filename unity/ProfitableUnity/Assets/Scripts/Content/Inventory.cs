using System.Collections.Generic;
using System.Linq;
using Profitable.Core.Schema;

namespace Profitable.Unity.Content
{
    // Agent 35 -- in-memory, session-only inventory of gathered/refined
    // ResourceInstance batches, grouped by resource id. Deliberately not
    // wired through Adapters.ISaveSystem -- see agent-35-unity-mvp
    // -presentation.md's Must-Not-Do section for why persistence is out
    // of scope for this agent specifically.
    public class Inventory
    {
        private readonly List<ResourceInstance> _batches = new();

        public IReadOnlyList<ResourceInstance> Batches => _batches;

        public void Add(ResourceInstance instance) => _batches.Add(instance);

        public int TotalQuantity(string resourceId) =>
            _batches.Where(b => b.Resource.Id == resourceId).Sum(b => b.Quantity);

        // Removes up to `quantity` units of the given resource, oldest
        // batches first (simple FIFO -- matches this project's own
        // inventory.ts convention for the same "which batch gets
        // consumed first" question). Returns the consumed instances,
        // each possibly a partial batch. Throws if insufficient quantity
        // is available -- callers (the panels) check TotalQuantity()
        // first and should never hit this in normal use; the exception
        // exists to fail loudly on a real bug rather than silently
        // under-consume.
        public List<ResourceInstance> Take(string resourceId, int quantity)
        {
            if (TotalQuantity(resourceId) < quantity)
            {
                throw new System.InvalidOperationException(
                    $"Inventory.Take: requested {quantity}x '{resourceId}' but only {TotalQuantity(resourceId)} available");
            }

            var taken = new List<ResourceInstance>();
            var remaining = quantity;
            while (remaining > 0)
            {
                var index = _batches.FindIndex(b => b.Resource.Id == resourceId);
                var batch = _batches[index];
                if (batch.Quantity <= remaining)
                {
                    taken.Add(batch);
                    remaining -= batch.Quantity;
                    _batches.RemoveAt(index);
                }
                else
                {
                    taken.Add(new ResourceInstance { Resource = batch.Resource, Quantity = remaining, Qualities = batch.Qualities });
                    _batches[index] = new ResourceInstance { Resource = batch.Resource, Quantity = batch.Quantity - remaining, Qualities = batch.Qualities };
                    remaining = 0;
                }
            }
            return taken;
        }
    }
}
