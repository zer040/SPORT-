import SwiftUI

public struct ProfileView: View {
    @ObservedObject var authViewModel: AuthViewModel
    @State private var notificationsEnabled = true
    @State private var isFieldOwner = false
    
    public init(authViewModel: AuthViewModel) {
        self.authViewModel = authViewModel
    }
    
    public var body: some View {
        NavigationStack {
            ZStack {
                SportPlusTheme.background.ignoresSafeArea()
                
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 20) {
                        
                        // MARK: - User Header Card (Sport Identity)
                        VStack(spacing: 12) {
                            ZStack {
                                Circle()
                                    .fill(
                                        LinearGradient(
                                            colors: [SportPlusTheme.primaryLight, SportPlusTheme.primary],
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        )
                                    )
                                    .frame(width: 80, height: 80)
                                    .shadow(color: SportPlusTheme.primary.opacity(0.3), radius: 10, y: 5)
                                
                                Text(userInitial)
                                    .font(.system(size: 32, weight: .bold, design: .rounded))
                                    .foregroundColor(.white)
                            }
                            
                            VStack(spacing: 4) {
                                Text(authViewModel.currentUser?.fullName ?? "Shohrux Atabullayev")
                                    .font(.system(size: 20, weight: .bold, design: .rounded))
                                    .foregroundColor(SportPlusTheme.textPrimary)
                                
                                Text(authViewModel.currentUser?.phoneNumber ?? "+998 93 768 06 28")
                                    .font(.subheadline)
                                    .foregroundColor(SportPlusTheme.textSecondary)
                            }
                            
                            // Status Pill
                            HStack(spacing: 6) {
                                Image(systemName: "checkmark.seal.fill")
                                    .foregroundColor(SportPlusTheme.primary)
                                Text("⚽ Yarim himoyachi • 98.5% Karma")
                                    .font(.caption.weight(.semibold))
                                    .foregroundColor(SportPlusTheme.primary)
                            }
                            .padding(.horizontal, 14)
                            .padding(.vertical, 6)
                            .background(SportPlusTheme.primary.opacity(0.1))
                            .clipShape(Capsule())
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 20)
                        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 24, style: .continuous)
                                .stroke(Color.white.opacity(0.85), lineWidth: 1)
                        )
                        .shadow(color: SportPlusTheme.glassShadow, radius: 16, y: 6)
                        .padding(.horizontal)
                        
                        // MARK: - Quick Stats (Mini Hub)
                        HStack(spacing: 12) {
                            StatCard(value: "\(authViewModel.currentUser?.totalGames ?? 15)", label: "O'yinlar", icon: "sportscourt.fill")
                            StatCard(value: "0", label: "No-Show", icon: "checkmark.circle.fill")
                            StatCard(value: "4.9", label: "Reyting", icon: "star.fill")
                        }
                        .padding(.horizontal)
                        
                        // MARK: - Settings & Navigation List
                        VStack(spacing: 2) {
                            SettingsRow(icon: "creditcard.fill", title: "Mening Hamyonim & Kartalar", subtitle: "Balans: 50,000 so'm", color: .blue)
                            Divider().padding(.leading, 56)
                            
                            SettingsRow(icon: "person.3.fill", title: "Mening Jamoam (Squad)", subtitle: "FC Bunyodkor Havaskor", color: .purple)
                            Divider().padding(.leading, 56)
                            
                            SettingsRow(icon: "clock.arrow.circlepath", title: "O'yinlar va bronlar tarixi", subtitle: nil, color: .indigo)
                            Divider().padding(.leading, 56)
                            
                            Toggle(isOn: $notificationsEnabled) {
                                HStack(spacing: 14) {
                                    IconBadge(icon: "bell.fill", color: .orange)
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("Bildirishnomalar")
                                            .font(.body.weight(.medium))
                                            .foregroundColor(SportPlusTheme.textPrimary)
                                        Text("Telegram va SMS eslatmalar")
                                            .font(.caption)
                                            .foregroundColor(SportPlusTheme.textSecondary)
                                    }
                                }
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 10)
                            
                            Divider().padding(.leading, 56)
                            
                            Toggle(isOn: $isFieldOwner) {
                                HStack(spacing: 14) {
                                    IconBadge(icon: "building.2.fill", color: SportPlusTheme.primary)
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("Maydon egasi rejimi")
                                            .font(.body.weight(.medium))
                                            .foregroundColor(SportPlusTheme.textPrimary)
                                        Text("Stadionlar va slotlar boshqaruvi")
                                            .font(.caption)
                                            .foregroundColor(SportPlusTheme.textSecondary)
                                    }
                                }
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 10)
                            
                            Divider().padding(.leading, 56)
                            
                            SettingsRow(icon: "globe", title: "Til: O'zbekcha", subtitle: nil, color: .gray)
                        }
                        .background(Color.white)
                        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 20, style: .continuous)
                                .stroke(Color.black.opacity(0.04), lineWidth: 1)
                        )
                        .shadow(color: SportPlusTheme.glassShadow, radius: 10, y: 4)
                        .padding(.horizontal)
                        
                        // MARK: - Logout Button
                        Button(action: {
                            HapticManager.shared.impactMedium()
                            authViewModel.logout()
                        }) {
                            HStack {
                                Image(systemName: "rectangle.portrait.and.arrow.right")
                                Text("Akkountdan chiqish")
                            }
                            .font(.body.weight(.semibold))
                            .foregroundColor(SportPlusTheme.danger)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(SportPlusTheme.danger.opacity(0.08))
                            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                        }
                        .padding(.horizontal)
                        .padding(.bottom, 120) // BottomNav ustiga chiqib qolmasligi uchun xavfsiz masofa
                    }
                    .padding(.top, 10)
                }
            }
            .navigationTitle("Profil")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
    
    private var userInitial: String {
        let name = authViewModel.currentUser?.fullName ?? "Shohrux"
        return String(name.prefix(1)).uppercased()
    }
}

// MARK: - Subcomponents
struct StatCard: View {
    let value: String
    let label: String
    let icon: String
    
    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.subheadline)
                .foregroundColor(SportPlusTheme.textSecondary)
            Text(value)
                .font(.system(size: 20, weight: .bold, design: .rounded))
                .foregroundColor(SportPlusTheme.textPrimary)
            Text(label)
                .font(.caption2.weight(.medium))
                .foregroundColor(SportPlusTheme.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .shadow(color: Color.black.opacity(0.03), radius: 8, y: 3)
    }
}

struct SettingsRow: View {
    let icon: String
    let title: String
    let subtitle: String?
    let color: Color
    
    var body: some View {
        HStack(spacing: 14) {
            IconBadge(icon: icon, color: color)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.body.weight(.medium))
                    .foregroundColor(SportPlusTheme.textPrimary)
                if let subtitle = subtitle {
                    Text(subtitle)
                        .font(.caption)
                        .foregroundColor(SportPlusTheme.textSecondary)
                }
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.caption.weight(.bold))
                .foregroundColor(SportPlusTheme.textMuted)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }
}

struct IconBadge: View {
    let icon: String
    let color: Color
    
    var body: some View {
        Image(systemName: icon)
            .font(.caption.weight(.semibold))
            .foregroundColor(.white)
            .frame(width: 32, height: 32)
            .background(color)
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}
