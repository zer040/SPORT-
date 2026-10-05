import SwiftUI

public struct MatchPassView: View {
    @StateObject private var viewModel = BookingsViewModel()
    @ObservedObject private var liveActivityManager = LiveActivityManager.shared
    
    public init() {}
    
    public var body: some View {
        NavigationStack {
            ZStack {
                SportPlusTheme.background.ignoresSafeArea()
                
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 24) {
                        // Title
                        VStack(spacing: 6) {
                            Text("Match Pass & Chiptalar")
                                .font(.system(size: 26, weight: .bold, design: .rounded))
                                .foregroundColor(SportPlusTheme.textPrimary)
                            
                            Text("Maydonga kirish uchun QR chiptangizni ko'rsating")
                                .font(.system(size: 14))
                                .foregroundColor(SportPlusTheme.textSecondary)
                        }
                        .padding(.top, 16)
                        
                        // Apple Wallet Style Ticket Pass
                        appleWalletTicketPass
                        
                        // Previous Bookings History
                        previousBookingsSection
                    }
                    .padding(.bottom, 120)
                }
            }
            .navigationBarHidden(true)
        }
    }
    
    private var appleWalletTicketPass: some View {
        VStack(spacing: 0) {
            // Upper Pass (Header & Venue Info)
            VStack(alignment: .leading, spacing: 14) {
                HStack {
                    HStack(spacing: 6) {
                        Image(systemName: "sportscourt.fill")
                            .foregroundColor(SportPlusTheme.primary)
                        Text("SPORT+ MATCH PASS")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(SportPlusTheme.primary)
                    }
                    
                    Spacer()
                    
                    Text("TASDIQLANGAN")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(SportPlusTheme.success)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(SportPlusTheme.success.opacity(0.12))
                        .clipShape(Capsule())
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("Bunyodkor Arena")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(SportPlusTheme.textPrimary)
                    
                    Text("Maydon №2 • Sun'iy maysazor")
                        .font(.system(size: 14))
                        .foregroundColor(SportPlusTheme.textSecondary)
                }
                
                HStack(spacing: 24) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("SANA")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(SportPlusTheme.textMuted)
                        Text("Bugun, 20:00")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(SportPlusTheme.textPrimary)
                    }
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text("DAVOMIYLIGI")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(SportPlusTheme.textMuted)
                        Text("1 soat 30 daqiqa")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(SportPlusTheme.textPrimary)
                    }
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text("TO'LANGAN")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(SportPlusTheme.textMuted)
                        Text("250,000 so'm")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(SportPlusTheme.primary)
                    }
                }
            }
            .padding(20)
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
            
            // Perforated Ticket Notches & Divider
            HStack {
                Circle()
                    .fill(SportPlusTheme.background)
                    .frame(width: 24, height: 24)
                    .offset(x: -12)
                
                Line()
                    .stroke(style: StrokeStyle(lineWidth: 1.5, dash: [6, 4]))
                    .foregroundColor(Color.black.opacity(0.12))
                    .frame(height: 1)
                
                Circle()
                    .fill(SportPlusTheme.background)
                    .frame(width: 24, height: 24)
                    .offset(x: 12)
            }
            .background(Color.white)
            .frame(height: 24)
            
            // Lower Pass (QR Code Stub)
            VStack(spacing: 12) {
                // QR Mockup Block
                ZStack {
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(SportPlusTheme.surfaceSecondary)
                        .frame(width: 140, height: 140)
                    
                    Image(systemName: "qrcode")
                        .font(.system(size: 100))
                        .foregroundColor(SportPlusTheme.textPrimary)
                }
                
                Text("KOD: SP-9842-PASS")
                    .font(.system(size: 13, weight: .bold, design: .monospaced))
                    .foregroundColor(SportPlusTheme.textSecondary)
                
                // MARK: - Dynamic Island Live Activity Action Bar
                Button {
                    HapticManager.shared.impact(.medium)
                    Task {
                        if liveActivityManager.isActivityActive {
                            await liveActivityManager.endActivity(bookingId: "SP-9842-PASS")
                        } else {
                            let kickoff = Date().addingTimeInterval(30 * 60)
                            await liveActivityManager.startMatchCountdown(
                                bookingId: "SP-9842-PASS",
                                venueName: "Bunyodkor Arena",
                                pitchName: "Maydon №2",
                                kickoffTime: kickoff,
                                endTime: kickoff.addingTimeInterval(90 * 60)
                            )
                        }
                    }
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: liveActivityManager.isActivityActive ? "stop.circle.fill" : "wave.3.forward.circle.fill")
                            .font(.system(size: 16))
                        
                        Text(liveActivityManager.isActivityActive ? "Dynamic Island Faol (To'xtatish)" : "Dynamic Island Taymerini Yoqish")
                            .font(.system(size: 13, weight: .semibold))
                    }
                    .foregroundColor(liveActivityManager.isActivityActive ? Color(hex: "EF4444") : SportPlusTheme.primary)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .frame(maxWidth: .infinity)
                    .background(
                        (liveActivityManager.isActivityActive ? Color(hex: "EF4444") : SportPlusTheme.primary)
                            .opacity(0.1)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .padding(.top, 4)
            }
            .padding(20)
            .frame(maxWidth: .infinity)
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        }
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(Color.white.opacity(0.85), lineWidth: 1)
        )
        .shadow(color: SportPlusTheme.glassShadow, radius: 24, x: 0, y: 10)
        .padding(.horizontal, 24)
    }
    
    private var previousBookingsSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("O'tgan o'yinlar tarixi")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(SportPlusTheme.textPrimary)
                .padding(.horizontal, 24)
            
            VStack(spacing: 12) {
                bookingHistoryItem(venue: "Jar Stadium", date: "24-Sentyabr, 19:00", price: "220,000 so'm", status: "YAKUNLANDI")
                bookingHistoryItem(venue: "Paxtakor Mini Arena", date: "18-Sentyabr, 21:00", price: "180,000 so'm", status: "YAKUNLANDI")
            }
            .padding(.horizontal, 20)
        }
    }
    
    private func bookingHistoryItem(venue: String, date: String, price: String, status: String) -> some View {
        LiquidGlassCard(cornerRadius: 18, padding: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(venue)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(SportPlusTheme.textPrimary)
                    Text(date)
                        .font(.system(size: 13))
                        .foregroundColor(SportPlusTheme.textSecondary)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 4) {
                    Text(price)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(SportPlusTheme.primary)
                    Text(status)
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(SportPlusTheme.textMuted)
                }
            }
        }
    }
}

// Line helper for ticket dash
struct Line: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: 0, y: rect.midY))
        path.addLine(to: CGPoint(x: rect.width, y: rect.midY))
        return path
    }
}
