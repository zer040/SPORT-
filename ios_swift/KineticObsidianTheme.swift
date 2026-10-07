import SwiftUI

// MARK: - Stitch Design System: Kinetic Obsidian Theme Tokens
public struct KineticTheme {
    // ─── Color Space ────────────────────────────────────────────────────────
    public static let background = Color(hex: "#0B1326")
    public static let surfaceLowest = Color(hex: "#060E20")
    public static let surfaceLow = Color(hex: "#131B2E")
    public static let surface = Color(hex: "#171F33")
    public static let surfaceHigh = Color(hex: "#222A3D")
    
    // Glass Elevated Surfaces
    public static let cardSurface = Color(hex: "#1E293B").opacity(0.70)
    public static let modalSurface = Color(hex: "#334155").opacity(0.40)
    
    // Kinetic Emissive Accents
    public static let neonTurf = Color(hex: "#10B981")       // #10B981
    public static let neonTurfBright = Color(hex: "#4EDEA3") // #4EDEA3
    public static let deepEmerald = Color(hex: "#059669")    // #059669
    public static let surgeGold = Color(hex: "#F59E0B")      // #F59E0B
    
    // Typography Colors
    public static let textHeading = Color(hex: "#F8FAFC")
    public static let textBody = Color(hex: "#DAE2FD")
    public static let textMuted = Color(hex: "#94A3B8")
    
    // Borders
    public static let borderSubtle = Color.white.opacity(0.10)
    public static let borderActive = Color(hex: "#10B981").opacity(0.35)
    public static let borderGold = Color(hex: "#F59E0B").opacity(0.40)
    
    // Radii
    public static let radiusCard: CGFloat = 24
    public static let radiusButton: CGFloat = 16
    public static let radiusChip: CGFloat = 20
    public static let radiusInput: CGFloat = 12
}

// MARK: - Hex Color Extension
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Glassmorphic Card ViewModifier
public struct GlassCardModifier: ViewModifier {
    public var isActive: Bool = false
    public var isSurge: Bool = false
    
    public func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: KineticTheme.radiusCard)
                    .fill(KineticTheme.cardSurface)
                    .background(
                        RoundedRectangle(cornerRadius: KineticTheme.radiusCard)
                            .stroke(
                                isActive ? KineticTheme.borderActive : (isSurge ? KineticTheme.borderGold : KineticTheme.borderSubtle),
                                lineWidth: 1
                            )
                    )
            )
            .shadow(color: Color.black.opacity(0.4), radius: 10, x: 0, y: 6)
            .shadow(color: isActive ? KineticTheme.neonTurf.opacity(0.25) : Color.clear, radius: 16, x: 0, y: 0)
    }
}

extension View {
    public func glassCard(isActive: Bool = false, isSurge: Bool = false) -> some View {
        self.modifier(GlassCardModifier(isActive: isActive, isSurge: isSurge))
    }
}
