import SwiftUI

// MARK: - SPORT+ Design System & Liquid Glass Palette
public enum SportPlusTheme {
    // Brand & Semantic Colors
    public static let primary = Color(hex: "059669")       // Emerald 600
    public static let primaryLight = Color(hex: "10B981")  // Emerald 500
    public static let primaryDark = Color(hex: "047857")   // Emerald 700
    
    // Backgrounds (Clean Premium Light Mode)
    public static let background = Color(hex: "F8FAFC")    // Slate 50
    public static let surface = Color(hex: "FFFFFF")       // Pure White
    public static let surfaceSecondary = Color(hex: "F1F5F9") // Slate 100
    
    // Glass Tint Colors
    public static let glassTint = Color.white.opacity(0.68)
    public static let glassBorder = Color.white.opacity(0.85)
    public static let glassShadow = Color(hex: "0F172A").opacity(0.06)
    
    // Typography
    public static let textPrimary = Color(hex: "0F172A")   // Slate 900
    public static let textSecondary = Color(hex: "64748B") // Slate 500
    public static let textMuted = Color(hex: "94A3B8")     // Slate 400
    
    // Status
    public static let success = Color(hex: "10B981")
    public static let warning = Color(hex: "F59E0B")
    public static let danger = Color(hex: "EF4444")
    
    // Radii
    public static let cornerRadiusSmall: CGFloat = 12
    public static let cornerRadiusMedium: CGFloat = 18
    public static let cornerRadiusLarge: CGFloat = 24
    public static let cornerRadiusPill: CGFloat = 100
}

// MARK: - Color Hex Initializer
public extension Color {
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
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
