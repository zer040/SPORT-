import SwiftUI

@main
public struct SportPlusApp: App {
    public init() {}
    
    public var body: some Scene {
        WindowGroup {
            MainShellView()
                .preferredColorScheme(.dark)
        }
    }
}

public struct MainShellView: View {
    @State private var isAuthenticated: Bool = true
    @State private var selectedTab: Int = 0
    @State private var activeVenueForBooking: VenueItem? = nil
    @State private var showBookingSuccess: Bool = false
    @State private var bookingSuccessMessage: String = ""
    
    public init() {}
    
    public var body: some View {
        Group {
            if !isAuthenticated {
                AuthWelcomeView {
                    isAuthenticated = true
                }
            } else {
                ZStack(alignment: .bottom) {
                    TabView(selection: $selectedTab) {
                        ArenaExplorerView { venue in
                            activeVenueForBooking = venue
                        }
                        .tabItem {
                            Label("Maydonlar", systemImage: "sparkle.magnifyingglass")
                        }
                        .tag(0)
                        
                        MatchLobbyView()
                            .tabItem {
                                Label("Match Lobby", systemImage: "person.3.fill")
                            }
                            .tag(1)
                        
                        OwnerCRMView()
                            .tabItem {
                                Label("Owner CRM", systemImage: "chart.bar.xaxis")
                            }
                            .tag(2)
                    }
                    .accentColor(KineticTheme.neonTurf)
                }
                .sheet(item: $activeVenueForBooking) { venue in
                    BookingSlotPickerView(
                        venue: venue,
                        onBack: { activeVenueForBooking = nil },
                        onConfirm: { slot, total in
                            activeVenueForBooking = nil
                            bookingSuccessMessage = "Slot \(slot) muvaffaqiyatli band qilindi! (\(Int(total)) UZS)"
                            showBookingSuccess = true
                        }
                    )
                }
                .alert(isPresented: $showBookingSuccess) {
                    Alert(
                        title: Text("Muvaffaqiyatli!"),
                        message: Text(bookingSuccessMessage),
                        dismissButton: .default(Text("OK"))
                    )
                }
            }
        }
    }
}
