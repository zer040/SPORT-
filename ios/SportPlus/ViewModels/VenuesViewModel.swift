import SwiftUI
import Combine

@MainActor
public final class VenuesViewModel: ObservableObject {
    @Published public var venues: [Venue] = []
    @Published public var selectedVenue: Venue?
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String?
    @Published public var searchQuery: String = ""
    @Published public var selectedDistrict: String? = nil
    
    // User location (Default: Tashkent Center)
    public var currentLat: Double = 41.2858
    public var currentLon: Double = 69.2163
    
    public init() {
        Task { await fetchVenues() }
    }
    
    public var filteredVenues: [Venue] {
        venues.filter { venue in
            let matchesSearch = searchQuery.isEmpty ||
                venue.name.localizedCaseInsensitiveContains(searchQuery) ||
                venue.address.localizedCaseInsensitiveContains(searchQuery)
            
            let matchesDistrict = selectedDistrict == nil || venue.district == selectedDistrict
            return matchesSearch && matchesDistrict
        }
    }
    
    public func fetchVenues() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let endpoint = "/venues?lat=\(currentLat)&lon=\(currentLon)&radius_km=25"
            let fetched: [Venue] = try await NetworkManager.shared.request(endpoint: endpoint)
            self.venues = fetched
            self.isLoading = false
        } catch {
            self.isLoading = false
            self.errorMessage = error.localizedDescription
        }
    }
}
