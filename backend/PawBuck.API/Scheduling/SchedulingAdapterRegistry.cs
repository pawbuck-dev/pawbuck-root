using PawBuck.API.Scheduling.Abstractions;
using PawBuck.API.Scheduling.Contracts;

namespace PawBuck.API.Scheduling;

/// <summary>
/// Resolves <see cref="ISchedulingVendorAdapter"/> by <see cref="BookingProviderKind"/>.
/// </summary>
public sealed class SchedulingAdapterRegistry
{
    private readonly IReadOnlyDictionary<BookingProviderKind, ISchedulingVendorAdapter> _byKind;

    public SchedulingAdapterRegistry(IEnumerable<ISchedulingVendorAdapter> adapters)
    {
        _byKind = adapters.ToDictionary(a => a.ProviderKind, a => a);
    }

    public bool TryGet(BookingProviderKind kind, out ISchedulingVendorAdapter? adapter)
    {
        if (kind == BookingProviderKind.Unknown)
        {
            adapter = null;
            return false;
        }

        return _byKind.TryGetValue(kind, out adapter);
    }
}
