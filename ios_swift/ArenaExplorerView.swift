import SwiftUI

public struct VenueItem: Identifiable {
    public let id: String
    public let name: String
    public let district: String
    public let city: String
    public let format: String
    public let pricePerHour: Double
    public let rating: Double
    public let distanceKm: Double
    public let imageUrl: String
    public let isAvailableNow: Bool
}

public struct ArenaExplorerView: View {
    public var onSelectVenue: (VenueItem) -> Void
    
    @State private var selectedCity: String = "Toshkent"
    @State private var selectedFormat: String = "ALL"
    
    let sampleVenues: [VenueItem] = [
        VenueItem(
            id: "1",
            name: "Bunyodkor Grand Arena",
            district: "Chilonzor",
            city: "Toshkent",
            format: "7x7",
            pricePerHour: 140000,
            rating: 4.9,
            distanceKm: 1.2,
            imageUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80",
            isAvailableNow: true
        ),
        VenueItem(
            id: "2",
            name: "Paxtakor City Pitch",
            district: "Yunusobod",
            city: "Toshkent",
            format: "5x5",
            pricePerHour: 120000,
            rating: 4.8,
            distanceKm: 2.8,
            imageUrl: "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=800&q=80",
            isAvailableNow: false
        ),
        VenueItem(
            id: "3",
            name: "Jizzax Olimpia Stadium",
            district: "Markaz",
            city: "Jizzax",
            format: "11x11",
            pricePerHour: 200000,
            rating: 5.0,
            distanceKm: 0.8,
            imageUrl: "https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=800&q=80",
            isAvailableNow: true
        )
    ]
    
    public init(onSelectVenue: @escaping (VenueItem) -> Void) {
        self.onSelectVenue = onSelectVenue
    }
    
    public var body: some View {
        ZStack {
            KineticTheme.background.ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Header
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("SPORT+ ARENA")
                            .font(.system(size: 20, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                        Text("RADAR SCANNER & EXPLORER")
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundColor(KineticTheme.neonTurf)
                            .tracking(0.5)
                    }
                    
                    Spacer()
                    
                    HStack(spacing: 6) {
                        Circle()
                            .fill(KineticTheme.neonTurf)
                            .frame(width: 8, height: 8)
                        Text("LIVE TURF")
                            .font(.system(size: 11, weight: .heavy))
                            .foregroundColor(KineticTheme.neonTurf)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(KineticTheme.neonTurf.opacity(0.12))
                    .cornerRadius(20)
                    .overlay(
                        RoundedRectangle(cornerRadius: 20)
                            .stroke(KineticTheme.neonTurf.opacity(0.3), lineWidth: 1)
                    )
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
                .padding(.bottom, 12)
                
                // Filters
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        FilterPill(title: "Toshkent", isSelected: selectedCity == "Toshkent") { selectedCity = "Toshkent" }
                        FilterPill(title: "Jizzax", isSelected: selectedCity == "Jizzax") { selectedCity = "Jizzax" }
                        FilterPill(title: "Barcha formatlar", isSelected: selectedFormat == "ALL") { selectedFormat = "ALL" }
                        FilterPill(title: "5x5 Mini", isSelected: selectedFormat == "5x5") { selectedFormat = "5x5" }
                        FilterPill(title: "7x7 Standart", isSelected: selectedFormat == "7x7") { selectedFormat = "7x7" }
                        FilterPill(title: "11x11 Katta", isSelected: selectedFormat == "11x11") { selectedFormat = "11x11" }
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 6)
                }
                
                // List of Arenas
                ScrollView {
                    LazyVStack(spacing: 20) {
                        ForEach(filteredVenues) { venue in
                            VenueCardView(venue: venue, onBook: { onSelectVenue(venue) })
                        }
                    }
                    .padding(20)
                }
            }
        }
    }
    
    private var filteredVenues: [VenueItem] {
        sampleVenues.filter { v in
            if selectedCity != "ALL" && v.city != selectedCity { return false }
            if selectedFormat != "ALL" && v.format != selectedFormat { return false }
            return true
        }
    }
}

struct FilterPill: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 12, weight: isSelected ? .bold : .medium))
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(isSelected ? KineticTheme.neonTurf : KineticTheme.surfaceHigh)
                .foregroundColor(isSelected ? .black : .white)
                .cornerRadius(20)
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(isSelected ? KineticTheme.neonTurf : KineticTheme.borderSubtle, lineWidth: 1)
                )
        }
    }
}

struct VenueCardView: View {
    let venue: VenueItem
    let onBook: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Turf banner
            ZStack(alignment: .topLeading) {
                AsyncImage(url: URL(string: venue.imageUrl)) { phase in
                    if let image = phase.image {
                        image.resizable().scaledToFill()
                    } else {
                        Rectangle().fill(KineticTheme.surfaceHigh)
                    }
                }
                .frame(height: 160)
                .clipped()
                
                HStack {
                    Text("\(venue.format) FORMAT")
                        .font(.system(size: 11, weight: .bold))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(Color.black.opacity(0.75))
                        .foregroundColor(.white)
                        .cornerRadius(10)
                    
                    Spacer()
                    
                    Text(venue.isAvailableNow ? "BO'SH SLOT" : "BAND")
                        .font(.system(size: 10, weight: .heavy))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(venue.isAvailableNow ? KineticTheme.neonTurf : Color.gray.opacity(0.8))
                        .foregroundColor(venue.isAvailableNow ? .black : .white)
                        .cornerRadius(10)
                }
                .padding(12)
            }
            
            // Info Content
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text(venue.name)
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(.white)
                    
                    Spacer()
                    
                    HStack(spacing: 3) {
                        Image(systemName: "star.fill")
                            .font(.system(size: 13))
                            .foregroundColor(KineticTheme.surgeGold)
                        Text(String(format: "%.1f", venue.rating))
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.white)
                    }
                }
                
                Text("\(venue.district), \(venue.city) • \(String(format: "%.1f", venue.distanceKm)) km masofada")
                    .font(.system(size: 13))
                    .foregroundColor(KineticTheme.textMuted)
                
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("1 SOAT UCHUN:")
                            .font(.system(size: 10, weight: .semibold, design: .monospaced))
                            .foregroundColor(KineticTheme.textMuted)
                        Text("\(Int(venue.pricePerHour)) UZS")
                            .font(.system(size: 16, weight: .heavy, design: .monospaced))
                            .foregroundColor(KineticTheme.neonTurf)
                    }
                    
                    Spacer()
                    
                    Button(action: onBook) {
                        Text("BRON QILISH")
                            .font(.system(size: 12, weight: .heavy))
                            .foregroundColor(.black)
                            .padding(.horizontal, 18)
                            .padding(.vertical, 10)
                            .background(KineticTheme.neonTurf)
                            .cornerRadius(14)
                    }
                }
                .padding(.top, 4)
            }
            .padding(18)
        }
        .glassCard(isActive: venue.isAvailableNow)
        .cornerRadius(KineticTheme.radiusCard)
    }
}
