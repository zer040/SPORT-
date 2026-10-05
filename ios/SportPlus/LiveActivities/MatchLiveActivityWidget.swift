import ActivityKit
import SwiftUI
import WidgetKit

// MARK: - Dynamic Island & Lock Screen Live Activity Widget
public struct MatchLiveActivityWidget: Widget {
    public init() {}
    
    public var body: some WidgetConfiguration {
        ActivityConfiguration(for: MatchActivityAttributes.self) { context in
            // MARK: - Lock Screen & StandBy Mode Banner
            LockScreenLiveActivityView(context: context)
                .widgetURL(URL(string: "sportplus://booking/\(context.attributes.bookingId)"))
        } dynamicIsland: { context in
            DynamicIsland {
                // MARK: - Dynamic Island: Expanded Leading
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 8) {
                        ZStack {
                            Circle()
                                .fill(Color(hex: "059669").opacity(0.18))
                                .frame(width: 32, height: 32)
                            
                            Image(systemName: "sportscourt.fill")
                                .font(.system(size: 15, weight: .bold))
                                .foregroundColor(Color(hex: "10B981"))
                        }
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text(context.state.venueName ?? context.attributes.venueName)
                                .font(.system(size: 14, weight: .bold, design: .rounded))
                                .foregroundColor(.white)
                                .lineLimit(1)
                            
                            Text(context.state.pitchName ?? context.attributes.pitchName)
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(Color.white.opacity(0.7))
                        }
                    }
                    .padding(.leading, 4)
                }
                
                // MARK: - Dynamic Island: Expanded Trailing
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 2) {
                        HStack(spacing: 4) {
                            Circle()
                                .fill(Color(hex: "10B981"))
                                .frame(width: 6, height: 6)
                            
                            Text("BOSHLANISH")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(Color(hex: "10B981"))
                        }
                        
                        // Native Real-Time Countdown (Zero battery drain, 1s precision)
                        Text(context.attributes.kickoffTime, style: .timer)
                            .font(.system(size: 18, weight: .black, design: .monospaced))
                            .foregroundColor(.white)
                    }
                    .padding(.trailing, 4)
                }
                
                // MARK: - Dynamic Island: Expanded Center / Bottom
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(spacing: 8) {
                        Divider()
                            .background(Color.white.opacity(0.15))
                        
                        HStack {
                            HStack(spacing: 6) {
                                Image(systemName: "clock.badge.checkmark.fill")
                                    .font(.system(size: 12))
                                    .foregroundColor(Color(hex: "10B981"))
                                
                                Text(context.state.customMessage)
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundColor(.white.opacity(0.9))
                                    .lineLimit(1)
                            }
                            
                            Spacer()
                            
                            HStack(spacing: 4) {
                                Text("Match Pass")
                                    .font(.system(size: 11, weight: .bold))
                                Image(systemName: "arrow.right.circle.fill")
                                    .font(.system(size: 12))
                            }
                            .foregroundColor(Color(hex: "10B981"))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 4)
                            .background(Color(hex: "10B981").opacity(0.15))
                            .clipShape(Capsule())
                        }
                    }
                    .padding(.horizontal, 4)
                    .padding(.top, 2)
                }
            } compactLeading: {
                // MARK: - Dynamic Island: Compact Leading
                HStack(spacing: 5) {
                    Image(systemName: "figure.indoor.soccer")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(Color(hex: "10B981"))
                    
                    Circle()
                        .fill(Color(hex: "10B981"))
                        .frame(width: 5, height: 5)
                }
                .padding(.leading, 4)
            } compactTrailing: {
                // MARK: - Dynamic Island: Compact Trailing (Countdown Timer)
                Text(context.attributes.kickoffTime, style: .timer)
                    .font(.system(size: 13, weight: .bold, design: .monospaced))
                    .foregroundColor(Color(hex: "10B981"))
                    .frame(maxWidth: 48)
                    .padding(.trailing, 4)
            } minimal: {
                // MARK: - Dynamic Island: Minimal (Boshqa ilova bilan bo'linganda)
                Image(systemName: "sportscourt.fill")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(Color(hex: "10B981"))
            }
        }
    }
}

// MARK: - Lock Screen / StandBy Banner View
private struct LockScreenLiveActivityView: View {
    let context: ActivityViewContext<MatchActivityAttributes>
    
    var body: some View {
        VStack(spacing: 12) {
            // Header Row
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "sportscourt.fill")
                        .foregroundColor(Color(hex: "10B981"))
                    Text("SPORT+ MATCH DAY")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(Color(hex: "10B981"))
                }
                
                Spacer()
                
                HStack(spacing: 5) {
                    Circle()
                        .fill(Color(hex: "10B981"))
                        .frame(width: 6, height: 6)
                    Text("30 MINUT QOLDI")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(Color(hex: "10B981"))
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 3)
                .background(Color(hex: "10B981").opacity(0.12))
                .clipShape(Capsule())
            }
            
            // Content Row (Venue & Countdown)
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(context.state.venueName ?? context.attributes.venueName)
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                        .foregroundColor(Color(hex: "0F172A"))
                    
                    Text(context.state.pitchName ?? context.attributes.pitchName)
                        .font(.system(size: 13))
                        .foregroundColor(Color(hex: "64748B"))
                }
                
                Spacer()
                
                // Real-time Countdown Box
                VStack(spacing: 2) {
                    Text("KICK-OFF")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(Color(hex: "94A3B8"))
                    
                    Text(context.attributes.kickoffTime, style: .timer)
                        .font(.system(size: 20, weight: .black, design: .monospaced))
                        .foregroundColor(Color(hex: "059669"))
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(Color(hex: "059669").opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
            
            // Footer Info
            HStack {
                Label(context.state.customMessage, systemImage: "figure.walk")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(Color(hex: "64748B"))
                    .lineLimit(1)
                
                Spacer()
                
                Text("QR Pass ochish →")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(Color(hex: "059669"))
            }
        }
        .padding(16)
        .background(
            Color.white
                .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 22, style: .continuous)
                        .stroke(Color.white.opacity(0.9), lineWidth: 1)
                )
        )
        .shadow(color: Color.black.opacity(0.08), radius: 16, x: 0, y: 6)
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
    }
}
