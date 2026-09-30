import SwiftUI

public struct ProfileView: View {
    @ObservedObject var authViewModel: AuthViewModel
    
    public init(authViewModel: AuthViewModel) {
        self.authViewModel = authViewModel
    }
    
    public var body: some View {
        NavigationStack {
            ZStack {
                SportPlusTheme.background.ignoresSafeArea()
                
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 22) {
                        // User Profile Header
                        userHeaderSection
                        
                        // Reliability & Karma Badge Card
                        karmaReliabilityCard
                        
                        // Stats Grid (Matches, Goals, Rating)
                        statsGrid
                        
                        // Settings & Actions
                        settingsList
                    }
                    .padding(.bottom, 120)
                }
            }
            .navigationBarHidden(true)
        }
    }
    
    private var userHeaderSection: some View {
        VStack(spacing: 12) {
            ZStack(alignment: .bottomTrailing) {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [SportPlusTheme.primaryLight, SportPlusTheme.primary],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 84, height: 84)
                    .overlay(
                        Text("JD")
                            .font(.system(size: 30, weight: .bold))
                            .foregroundColor(.white)
                    )
                
                // Verified check
                Image(systemName: "checkmark.seal.fill")
                    .foregroundColor(.white)
                    .background(Circle().fill(SportPlusTheme.primary))
                    .font(.system(size: 20))
            }
            
            VStack(spacing: 4) {
                Text(authViewModel.currentUser?.fullName ?? "Jasur Davronov")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(SportPlusTheme.textPrimary)
                
                Text(authViewModel.currentUser?.phoneNumber ?? "+998 90 123 45 67")
                    .font(.system(size: 14))
                    .foregroundColor(SportPlusTheme.textSecondary)
            }
        }
        .padding(.top, 20)
    }
    
    private var karmaReliabilityCard: some View {
        LiquidGlassCard(cornerRadius: 22, padding: 16) {
            HStack(spacing: 16) {
                ZStack {
                    Circle()
                        .stroke(SportPlusTheme.primary.opacity(0.15), lineWidth: 6)
                        .frame(width: 58, height: 58)
                    Circle()
                        .trim(from: 0, to: 0.98)
                        .stroke(SportPlusTheme.primary, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                        .frame(width: 58, height: 58)
                        .rotationEffect(.degrees(-90))
                    Text("98%")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(SportPlusTheme.primary)
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text("Ishonchlilik Darajasi")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(SportPlusTheme.textPrimary)
                        Spacer()
                        Text("PRO")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(SportPlusTheme.primary)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(SportPlusTheme.primary.opacity(0.12))
                            .clipShape(Capsule())
                    }
                    
                    Text("O'yinlarga o'z vaqtida kelgan va jamoada halol o'ynagan futbolchi.")
                        .font(.system(size: 12))
                        .foregroundColor(SportPlusTheme.textSecondary)
                }
            }
        }
        .padding(.horizontal, 20)
    }
    
    private var statsGrid: some View {
        HStack(spacing: 12) {
            statCard(title: "O'yinlar", value: "32", icon: "soccerball")
            statCard(title: "Fair Play", value: "4.9 ★", icon: "hand.thumbsup.fill")
            statCard(title: "Reyting", value: "#14", icon: "trophy.fill")
        }
        .padding(.horizontal, 20)
    }
    
    private func statCard(title: String, value: String, icon: String) -> some View {
        LiquidGlassCard(cornerRadius: 18, padding: 14) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 18))
                    .foregroundColor(SportPlusTheme.primary)
                Text(value)
                    .font(.system(size: 17, weight: .bold))
                    .foregroundColor(SportPlusTheme.textPrimary)
                Text(title)
                    .font(.system(size: 11))
                    .foregroundColor(SportPlusTheme.textMuted)
            }
            .frame(maxWidth: .infinity)
        }
    }
    
    private var settingsList: some View {
        VStack(spacing: 12) {
            settingsRow(icon: "bell.fill", title: "Bildirishnomalar")
            settingsRow(icon: "lock.shield.fill", title: "Xavfsizlik va Maxfiylik")
            settingsRow(icon: "globe", title: "Til: O'zbekcha")
            
            // Logout Row
            LiquidGlassCard(cornerRadius: 18, padding: 16, isInteractive: true) {
                HStack {
                    Image(systemName: "rectangle.portrait.and.arrow.right")
                        .foregroundColor(SportPlusTheme.danger)
                    Text("Tizimdan chiqish")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(SportPlusTheme.danger)
                    Spacer()
                }
            } action: {
                authViewModel.logout()
            }
        }
        .padding(.horizontal, 20)
    }
    
    private func settingsRow(icon: String, title: String) -> some View {
        LiquidGlassCard(cornerRadius: 18, padding: 16, isInteractive: true) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(SportPlusTheme.primary)
                    .frame(width: 24)
                Text(title)
                    .font(.system(size: 15))
                    .foregroundColor(SportPlusTheme.textPrimary)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(SportPlusTheme.textMuted)
            }
        } action: {
            HapticManager.shared.impactLight()
        }
    }
}
