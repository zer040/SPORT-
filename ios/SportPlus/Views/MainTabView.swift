import SwiftUI

public enum AppTab: Int, CaseIterable {
    case venues = 0
    case soloPlay = 1
    case passes = 2
    case profile = 3
    
    var title: String {
        switch self {
        case .venues: return "Maydonlar"
        case .soloPlay: return "Solo Play"
        case .passes: return "Chiptalar"
        case .profile: return "Profil"
        }
    }
    
    var icon: String {
        switch self {
        case .venues: return "figure.indoor.soccer"
        case .soloPlay: return "dot.radiowaves.left.and.right"
        case .passes: return "ticket.fill"
        case .profile: return "person.fill"
        }
    }
}

public struct MainTabView: View {
    @State private var selectedTab: AppTab = .venues
    @ObservedObject var authViewModel: AuthViewModel
    
    public init(authViewModel: AuthViewModel) {
        self.authViewModel = authViewModel
    }
    
    public var body: some View {
        ZStack(alignment: .bottom) {
            // Tab Content
            Group {
                switch selectedTab {
                case .venues:
                    VenuesListView()
                case .soloPlay:
                    SoloRadarView()
                case .passes:
                    MatchPassView()
                case .profile:
                    ProfileView(authViewModel: authViewModel)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            
            // Floating Liquid Glass Bottom Bar
            floatingTabBar
                .padding(.horizontal, 24)
                .padding(.bottom, 16)
        }
        .ignoresSafeArea(.keyboard)
    }
    
    private var floatingTabBar: some View {
        HStack(spacing: 0) {
            ForEach(AppTab.allCases, id: \.self) { tab in
                let isSelected = selectedTab == tab
                
                Button(action: {
                    HapticManager.shared.selection()
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.7)) {
                        selectedTab = tab
                    }
                }) {
                    VStack(spacing: 4) {
                        Image(systemName: tab.icon)
                            .font(.system(size: isSelected ? 20 : 18, weight: isSelected ? .bold : .medium))
                            .foregroundColor(isSelected ? SportPlusTheme.primary : SportPlusTheme.textSecondary)
                        
                        Text(tab.title)
                            .font(.system(size: 11, weight: isSelected ? .bold : .medium))
                            .foregroundColor(isSelected ? SportPlusTheme.primary : SportPlusTheme.textSecondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                }
            }
        }
        .background {
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .fill(.ultraThinMaterial)
                .background(
                    RoundedRectangle(cornerRadius: 28, style: .continuous)
                        .fill(Color.white.opacity(0.72))
                )
        }
        .overlay(
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .strokeBorder(
                    LinearGradient(
                        stops: [
                            .init(color: Color.white.opacity(0.95), location: 0),
                            .init(color: Color.white.opacity(0.2), location: 1)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1
                )
        )
        .shadow(color: SportPlusTheme.glassShadow, radius: 24, x: 0, y: 10)
    }
}
