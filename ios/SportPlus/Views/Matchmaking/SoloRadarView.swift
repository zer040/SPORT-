import SwiftUI

public struct SoloRadarView: View {
    @StateObject private var viewModel = MatchmakingViewModel()
    @State private var isRadarSpinning: Bool = false
    @State private var selectedLobbyForJoin: MatchLobby?
    
    public init() {}
    
    public var body: some View {
        NavigationStack {
            ZStack {
                SportPlusTheme.background.ignoresSafeArea()
                
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 24) {
                        // Title
                        VStack(spacing: 6) {
                            Text("Solo Play & Radar")
                                .font(.system(size: 26, weight: .bold, design: .rounded))
                                .foregroundColor(SportPlusTheme.textPrimary)
                            
                            Text("Tarkibga o'yinchi yetishmayaptimi? Radar orqali jamoaga qo'shiling!")
                                .font(.system(size: 14))
                                .foregroundColor(SportPlusTheme.textSecondary)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal, 24)
                        }
                        .padding(.top, 16)
                        
                        // Animated Liquid Radar Scanner
                        radarScannerSection
                        
                        // Active Lobbies List
                        lobbiesListSection
                    }
                    .padding(.bottom, 120)
                }
            }
            .navigationBarHidden(true)
            .sheet(item: $selectedLobbyForJoin) { lobby in
                JoinMatchSheet(lobby: lobby, viewModel: viewModel)
            }
        }
    }
    
    private var radarScannerSection: some View {
        ZStack {
            // Concentric Glass Circles
            Circle()
                .stroke(SportPlusTheme.primary.opacity(0.12), lineWidth: 1)
                .frame(width: 260, height: 260)
            
            Circle()
                .stroke(SportPlusTheme.primary.opacity(0.2), lineWidth: 1.5)
                .frame(width: 180, height: 180)
            
            Circle()
                .stroke(SportPlusTheme.primary.opacity(0.3), lineWidth: 2)
                .frame(width: 100, height: 100)
            
            // Rotating Radar Sweep Beam
            if isRadarSpinning {
                Circle()
                    .fill(
                        AngularGradient(
                            gradient: Gradient(colors: [
                                SportPlusTheme.primary.opacity(0.4),
                                SportPlusTheme.primary.opacity(0.0)
                            ]),
                            center: .center
                        )
                    )
                    .frame(width: 260, height: 260)
                    .rotationEffect(.degrees(viewModel.radarAngle))
                    .onAppear {
                        withAnimation(.linear(duration: 4.0).repeatForever(autoreverses: false)) {
                            viewModel.radarAngle = 360
                        }
                    }
            }
            
            // Center Pulse Core Button
            LiquidGlassCard(cornerRadius: 100, padding: 18, isInteractive: true) {
                VStack(spacing: 4) {
                    Image(systemName: isRadarSpinning ? "dot.radiowaves.left.and.right" : "play.fill")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(SportPlusTheme.primary)
                    
                    Text(isRadarSpinning ? "Izlanmoqda" : "Radarni yoqish")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(SportPlusTheme.textPrimary)
                }
                .frame(width: 72, height: 72)
            } action: {
                isRadarSpinning.toggle()
                viewModel.toggleSearch()
            }
        }
        .frame(height: 280)
    }
    
    private var lobbiesListSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Faol O'yinlar (Lobby)")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(SportPlusTheme.textPrimary)
                
                Spacer()
                
                Text("\(viewModel.lobbies.count) ta ochiq")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(SportPlusTheme.primary)
            }
            .padding(.horizontal, 20)
            
            if viewModel.lobbies.isEmpty {
                LiquidGlassCard(cornerRadius: 18, padding: 20) {
                    HStack(spacing: 12) {
                        Image(systemName: "info.circle")
                            .foregroundColor(SportPlusTheme.primary)
                        Text("Ayni paytda yaqin atrofdagi faol matchlar qidirilmoqda...")
                            .font(.system(size: 13))
                            .foregroundColor(SportPlusTheme.textSecondary)
                    }
                }
                .padding(.horizontal, 20)
            } else {
                ForEach(viewModel.lobbies) { lobby in
                    LiquidGlassCard(cornerRadius: 20, padding: 16, isInteractive: true) {
                        VStack(alignment: .leading, spacing: 10) {
                            HStack {
                                Text(lobby.title)
                                    .font(.system(size: 16, weight: .bold))
                                    .foregroundColor(SportPlusTheme.textPrimary)
                                Spacer()
                                Text("\(lobby.currentPlayers)/\(lobby.playersNeeded) o'yinchi")
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundColor(SportPlusTheme.primary)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(SportPlusTheme.primary.opacity(0.12))
                                    .clipShape(Capsule())
                            }
                            
                            HStack(spacing: 14) {
                                Label(lobby.matchDate, systemImage: "calendar")
                                Label(lobby.startTime, systemImage: "clock")
                                if let dist = lobby.distanceKm {
                                    Label(String(format: "%.1f km", dist), systemImage: "location")
                                }
                            }
                            .font(.system(size: 12))
                            .foregroundColor(SportPlusTheme.textSecondary)
                            
                            HStack {
                                Text("\(Int(lobby.costPerPerson)) so'm / kishi")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(SportPlusTheme.textPrimary)
                                Spacer()
                                Text("Qo'shilish")
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 6)
                                    .background(Capsule().fill(SportPlusTheme.primary))
                            }
                        }
                    } action: {
                        selectedLobbyForJoin = lobby
                    }
                    .padding(.horizontal, 20)
                }
            }
        }
    }
}

// MARK: - Join Match Sheet
public struct JoinMatchSheet: View {
    let lobby: MatchLobby
    @ObservedObject var viewModel: MatchmakingViewModel
    @Environment(\.dismiss) var dismiss
    @State private var selectedPosition = "Yarim himoya"
    
    let positions = ["Darvozabon", "Himoya", "Yarim himoya", "Hujumchi"]
    
    public var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                VStack(spacing: 8) {
                    Text(lobby.title)
                        .font(.system(size: 20, weight: .bold))
                    Text("\(lobby.venueName) • \(lobby.matchDate) \(lobby.startTime)")
                        .font(.system(size: 14))
                        .foregroundColor(SportPlusTheme.textSecondary)
                }
                .padding(.top, 20)
                
                LiquidGlassCard(cornerRadius: 20, padding: 18) {
                    VStack(alignment: .leading, spacing: 14) {
                        Text("O'yin pozitsiyangizni tanlang:")
                            .font(.system(size: 15, weight: .semibold))
                        
                        ForEach(positions, id: \.self) { pos in
                            HStack {
                                Text(pos)
                                    .font(.system(size: 15))
                                Spacer()
                                if selectedPosition == pos {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundColor(SportPlusTheme.primary)
                                }
                            }
                            .contentShape(Rectangle())
                            .onTapGesture {
                                HapticManager.shared.selection()
                                selectedPosition = pos
                            }
                            if pos != positions.last {
                                Divider()
                            }
                        }
                    }
                }
                .padding(.horizontal, 20)
                
                Spacer()
                
                LiquidPillButton(title: "Jamoaga tasdiqlash va kirish", icon: "person.badge.plus") {
                    Task {
                        let success = await viewModel.joinLobby(lobbyId: lobby.id, position: selectedPosition)
                        if success {
                            dismiss()
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 20)
            }
            .navigationTitle("Tarkibga qo'shilish")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Bekor qilish") { dismiss() }
                }
            }
        }
    }
}
