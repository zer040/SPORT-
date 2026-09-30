import SwiftUI

public struct VenuesListView: View {
    @StateObject private var viewModel = VenuesViewModel()
    @State private var selectedVenueForSheet: Venue?
    
    let districts = ["Barchasi", "Chilonzor", "Yunusobod", "Mirobod", "Yakkasaroy", "Jizzax"]
    
    public init() {}
    
    public var body: some View {
        NavigationStack {
            ZStack {
                SportPlusTheme.background.ignoresSafeArea()
                
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 20) {
                        // Header Search & Filters
                        headerSection
                        
                        // District Filter Chips
                        districtFilterChips
                        
                        // Venues Card List
                        if viewModel.isLoading {
                            ProgressView("Maydonlar yuklanmoqda...")
                                .padding(.top, 40)
                        } else if viewModel.filteredVenues.isEmpty {
                            emptyStateView
                        } else {
                            venuesList
                        }
                    }
                    .padding(.bottom, 120) // Space for floating bottom bar
                }
                .refreshable {
                    await viewModel.fetchVenues()
                }
            }
            .navigationBarHidden(true)
            .sheet(item: $selectedVenueForSheet) { venue in
                VenueDetailView(venue: venue)
            }
        }
    }
    
    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Toshkent & Jizzax")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(SportPlusTheme.primary)
                    
                    Text("Futbol Maydonlari")
                        .font(.system(size: 26, weight: .bold, design: .rounded))
                        .foregroundColor(SportPlusTheme.textPrimary)
                }
                Spacer()
                
                // Map Toggle Pill
                LiquidGlassCard(cornerRadius: 16, padding: 10, isInteractive: true) {
                    Image(systemName: "map.fill")
                        .font(.system(size: 17))
                        .foregroundColor(SportPlusTheme.primary)
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 16)
            
            // Search Input Bar
            LiquidGlassCard(cornerRadius: 18, padding: 12) {
                HStack(spacing: 10) {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(SportPlusTheme.textSecondary)
                    
                    TextField("Maydon nomi yoki manzil bo'yicha qidiruv...", text: $viewModel.searchQuery)
                        .font(.system(size: 15))
                    
                    if !viewModel.searchQuery.isEmpty {
                        Button(action: { viewModel.searchQuery = "" }) {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundColor(SportPlusTheme.textMuted)
                        }
                    }
                }
            }
            .padding(.horizontal, 20)
        }
    }
    
    private var districtFilterChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                ForEach(districts, id: \.self) { district in
                    let isSelected = (district == "Barchasi" && viewModel.selectedDistrict == nil) ||
                                     (viewModel.selectedDistrict == district)
                    
                    Button(action: {
                        HapticManager.shared.selection()
                        viewModel.selectedDistrict = district == "Barchasi" ? nil : district
                    }) {
                        Text(district)
                            .font(.system(size: 14, weight: isSelected ? .semibold : .medium))
                            .foregroundColor(isSelected ? .white : SportPlusTheme.textSecondary)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background {
                                if isSelected {
                                    Capsule().fill(SportPlusTheme.primary)
                                } else {
                                    Capsule().fill(Color.white.opacity(0.8))
                                }
                            }
                            .overlay(
                                Capsule().stroke(
                                    isSelected ? Color.clear : Color.black.opacity(0.06),
                                    lineWidth: 1
                                )
                            )
                    }
                }
            }
            .padding(.horizontal, 20)
        }
    }
    
    private var venuesList: some View {
        LazyVStack(spacing: 16) {
            ForEach(viewModel.filteredVenues) { venue in
                LiquidGlassCard(cornerRadius: 22, padding: 16, isInteractive: true) {
                    VStack(alignment: .leading, spacing: 12) {
                        // Venue Hero Placeholder / Image
                        ZStack(alignment: .topTrailing) {
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .fill(SportPlusTheme.surfaceSecondary)
                                .frame(height: 140)
                                .overlay(
                                    Image(systemName: "sportscourt.fill")
                                        .font(.system(size: 48))
                                        .foregroundColor(SportPlusTheme.textMuted.opacity(0.3))
                                )
                            
                            // PostGIS Distance Badge
                            if let distance = venue.distanceKm {
                                HStack(spacing: 4) {
                                    Image(systemName: "location.fill")
                                        .font(.system(size: 10))
                                    Text(String(format: "%.1f km", distance))
                                        .font(.system(size: 12, weight: .bold))
                                }
                                .padding(.horizontal, 10)
                                .padding(.vertical, 6)
                                .background(.ultraThinMaterial)
                                .clipShape(Capsule())
                                .padding(10)
                            }
                        }
                        
                        // Details
                        HStack(alignment: .top) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(venue.name)
                                    .font(.system(size: 18, weight: .bold))
                                    .foregroundColor(SportPlusTheme.textPrimary)
                                
                                Text(venue.address)
                                    .font(.system(size: 13))
                                    .foregroundColor(SportPlusTheme.textSecondary)
                                    .lineLimit(1)
                            }
                            
                            Spacer()
                            
                            // Rating
                            HStack(spacing: 3) {
                                Image(systemName: "star.fill")
                                    .foregroundColor(SportPlusTheme.warning)
                                    .font(.system(size: 13))
                                Text(String(format: "%.1f", venue.rating))
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(SportPlusTheme.textPrimary)
                            }
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.white.opacity(0.85))
                            .clipShape(Capsule())
                        }
                        
                        Divider().opacity(0.4)
                        
                        // Price & Action Button
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Narxi")
                                    .font(.system(size: 11))
                                    .foregroundColor(SportPlusTheme.textMuted)
                                Text(venue.minPricePerHour != nil ? "\(Int(venue.minPricePerHour!)) so'm / soat" : "200,000 so'm / soat")
                                    .font(.system(size: 15, weight: .bold))
                                    .foregroundColor(SportPlusTheme.primary)
                            }
                            
                            Spacer()
                            
                            Text("Bron qilish")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(.white)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                                .background(Capsule().fill(SportPlusTheme.primary))
                        }
                    }
                } action: {
                    selectedVenueForSheet = venue
                }
                .padding(.horizontal, 20)
            }
        }
    }
    
    private var emptyStateView: some View {
        VStack(spacing: 12) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 38))
                .foregroundColor(SportPlusTheme.textMuted)
            Text("Maydon topilmadi")
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(SportPlusTheme.textPrimary)
            Text("Qidiruv parametrlarini o'zgartirib ko'ring")
                .font(.system(size: 14))
                .foregroundColor(SportPlusTheme.textSecondary)
        }
        .padding(.top, 40)
    }
}

// MARK: - Venue Detail Sheet
public struct VenueDetailView: View {
    let venue: Venue
    @Environment(\.dismiss) var dismiss
    
    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .fill(SportPlusTheme.surfaceSecondary)
                        .frame(height: 200)
                        .overlay(
                            Image(systemName: "sportscourt.fill")
                                .font(.system(size: 64))
                                .foregroundColor(SportPlusTheme.textMuted.opacity(0.4))
                        )
                        .padding(.horizontal, 20)
                    
                    VStack(alignment: .leading, spacing: 8) {
                        Text(venue.name)
                            .font(.system(size: 24, weight: .bold))
                            .foregroundColor(SportPlusTheme.textPrimary)
                        
                        Text(venue.address)
                            .font(.system(size: 15))
                            .foregroundColor(SportPlusTheme.textSecondary)
                    }
                    .padding(.horizontal, 20)
                    
                    // Liquid Glass Amenities Card
                    LiquidGlassCard(cornerRadius: 20, padding: 16) {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Qulayliklar")
                                .font(.system(size: 16, weight: .bold))
                            
                            HStack(spacing: 16) {
                                amenityItem(icon: "shower.fill", title: "Dush")
                                amenityItem(icon: "car.fill", title: "Avtoturargoh")
                                amenityItem(icon: "lightbulb.fill", title: "Yoritgichlar")
                                amenityItem(icon: "tshirt.fill", title: "Kiyinish xonasi")
                            }
                        }
                    }
                    .padding(.horizontal, 20)
                    
                    LiquidPillButton(title: "Vaqt tanlash va bron qilish", icon: "calendar.badge.clock") {
                        HapticManager.shared.success()
                        dismiss()
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 10)
                }
            }
            .navigationTitle("Maydon haqida")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Yopish") { dismiss() }
                }
            }
        }
    }
    
    private func amenityItem(icon: String, title: String) -> some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 18))
                .foregroundColor(SportPlusTheme.primary)
            Text(title)
                .font(.system(size: 11))
                .foregroundColor(SportPlusTheme.textSecondary)
        }
        .frame(maxWidth: .infinity)
    }
}
