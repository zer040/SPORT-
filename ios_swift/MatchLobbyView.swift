import SwiftUI

public struct MatchLobbyItem: Identifiable {
    public let id: String
    public let venueName: String
    public let dateTime: String
    public let format: String
    public let totalSlots: Int
    public let joinedSlots: Int
    public let pricePerPlayer: Int
    public let organizer: String
    public let level: String
}

public struct MatchLobbyView: View {
    let matches: [MatchLobbyItem] = [
        MatchLobbyItem(
            id: "m1",
            venueName: "Bunyodkor Grand Arena",
            dateTime: "Bugun, 20:00 - 21:00",
            format: "7x7",
            totalSlots: 14,
            joinedSlots: 11,
            pricePerPlayer: 12000,
            organizer: "Sardor R.",
            level: "HAYVON / PRO"
        ),
        MatchLobbyItem(
            id: "m2",
            venueName: "Paxtakor City Pitch",
            dateTime: "Bugun, 21:00 - 22:00",
            format: "5x5",
            totalSlots: 10,
            joinedSlots: 9,
            pricePerPlayer: 15000,
            organizer: "Jasur B.",
            level: "HAVASKOR"
        )
    ]
    
    public init() {}
    
    public var body: some View {
        ZStack {
            KineticTheme.background.ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Header
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("MATCH LOBBY")
                            .font(.system(size: 20, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                        Text("SOLO O'YINCHILAR VA SPLIT TO'LOV")
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundColor(KineticTheme.neonTurf)
                    }
                    
                    Spacer()
                    
                    Text("ESCROW ACTIVE")
                        .font(.system(size: 10, weight: .heavy, design: .monospaced))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(KineticTheme.surgeGold.opacity(0.12))
                        .foregroundColor(KineticTheme.surgeGold)
                        .cornerRadius(20)
                        .overlay(
                            RoundedRectangle(cornerRadius: 20)
                                .stroke(KineticTheme.surgeGold.opacity(0.35), lineWidth: 1)
                        )
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
                .padding(.bottom, 12)
                
                ScrollView {
                    LazyVStack(spacing: 20) {
                        ForEach(matches) { m in
                            let remaining = m.totalSlots - m.joinedSlots
                            VStack(alignment: .leading, spacing: 14) {
                                HStack {
                                    Text(m.venueName)
                                        .font(.system(size: 17, weight: .bold))
                                        .foregroundColor(.white)
                                    Spacer()
                                    Text(m.format)
                                        .font(.system(size: 11, weight: .bold))
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 4)
                                        .background(KineticTheme.surfaceHigh)
                                        .foregroundColor(KineticTheme.neonTurf)
                                        .cornerRadius(8)
                                }
                                
                                HStack(spacing: 6) {
                                    Image(systemName: "clock")
                                        .font(.system(size: 12))
                                        .foregroundColor(KineticTheme.textMuted)
                                    Text(m.dateTime)
                                        .font(.system(size: 13))
                                        .foregroundColor(KineticTheme.textMuted)
                                }
                                
                                VStack(alignment: .leading, spacing: 6) {
                                    HStack {
                                        Text("Tarkib: \(m.joinedSlots) / \(m.totalSlots) o'yinchi")
                                            .font(.system(size: 12))
                                            .foregroundColor(.white)
                                        Spacer()
                                        Text("\(remaining) ta joy qoldi")
                                            .font(.system(size: 11, weight: .bold))
                                            .foregroundColor(remaining == 1 ? KineticTheme.surgeGold : KineticTheme.neonTurf)
                                    }
                                    
                                    GeometryReader { geo in
                                        ZStack(alignment: .leading) {
                                            RoundedRectangle(cornerRadius: 3)
                                                .fill(Color.white.opacity(0.1))
                                                .frame(height: 6)
                                            RoundedRectangle(cornerRadius: 3)
                                                .fill(remaining == 1 ? KineticTheme.surgeGold : KineticTheme.neonTurf)
                                                .frame(width: geo.size.width * CGFloat(m.joinedSlots) / CGFloat(m.totalSlots), height: 6)
                                        }
                                    }
                                    .frame(height: 6)
                                }
                                
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("O'YINCHI BOSHI:")
                                            .font(.system(size: 9, design: .monospaced))
                                            .foregroundColor(KineticTheme.textMuted)
                                        Text("\(m.pricePerPlayer) UZS")
                                            .font(.system(size: 16, weight: .heavy, design: .monospaced))
                                            .foregroundColor(.white)
                                    }
                                    
                                    Spacer()
                                    
                                    Button(action: {}) {
                                        Text("QO'SHILISH (SPLIT)")
                                            .font(.system(size: 12, weight: .heavy))
                                            .foregroundColor(.black)
                                            .padding(.horizontal, 16)
                                            .padding(.vertical, 10)
                                            .background(KineticTheme.neonTurf)
                                            .cornerRadius(12)
                                    }
                                }
                            }
                            .padding(20)
                            .glassCard(isActive: remaining == 1, isSurge: remaining > 1)
                        }
                    }
                    .padding(20)
                }
            }
        }
    }
}
