import SwiftUI

// MARK: - Liquid Glass Card Component (Apple HIG Liquid Glass Specification)
public struct LiquidGlassCard<Content: View>: View {
    private let content: Content
    private let cornerRadius: CGFloat
    private let material: Material
    private let padding: CGFloat
    private let isInteractive: Bool
    private let action: (() -> Void)?
    
    @State private var isPressed: Bool = false
    @Environment(\.accessibilityReduceTransparency) var reduceTransparency
    
    public init(
        cornerRadius: CGFloat = SportPlusTheme.cornerRadiusLarge,
        material: Material = .ultraThinMaterial,
        padding: CGFloat = 20,
        isInteractive: Bool = false,
        action: (() -> Void)? = nil,
        @ViewBuilder content: () -> Content
    ) {
        self.cornerRadius = cornerRadius
        self.material = material
        self.padding = padding
        self.isInteractive = isInteractive
        self.action = action
        self.content = content()
    }
    
    public var body: some View {
        Group {
            if isInteractive {
                Button(action: {
                    HapticManager.shared.impactLight()
                    action?()
                }) {
                    cardContent
                }
                .buttonStyle(GlassPressableButtonStyle())
            } else {
                cardContent
            }
        }
    }
    
    private var cardContent: some View {
        content
            .padding(padding)
            .background {
                if reduceTransparency {
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .fill(SportPlusTheme.surface)
                } else {
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .fill(material)
                        .background(
                            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                                .fill(Color.white.opacity(0.35))
                        )
                }
            }
            .overlay {
                // 1px Specular Optical Highlight Stroke
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .strokeBorder(
                        LinearGradient(
                            stops: [
                                .init(color: Color.white.opacity(0.9), location: 0.0),
                                .init(color: Color.white.opacity(0.35), location: 0.4),
                                .init(color: Color.white.opacity(0.1), location: 1.0)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1
                    )
            }
            // Ultra-soft airy shadow
            .shadow(
                color: SportPlusTheme.glassShadow,
                radius: 18,
                x: 0,
                y: 8
            )
    }
}

// MARK: - Elastic Spring Press Button Style
public struct GlassPressableButtonStyle: ButtonStyle {
    public init() {}
    
    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(.spring(response: 0.28, dampingFraction: 0.65), value: configuration.isPressed)
    }
}

// MARK: - Floating Liquid Pill Button
public struct LiquidPillButton: View {
    let title: String
    let icon: String?
    let isPrimary: Bool
    let action: () -> Void
    
    public init(
        title: String,
        icon: String? = nil,
        isPrimary: Bool = true,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.icon = icon
        self.isPrimary = isPrimary
        self.action = action
    }
    
    public var body: some View {
        Button(action: {
            HapticManager.shared.impactMedium()
            action()
        }) {
            HStack(spacing: 8) {
                if let icon {
                    Image(systemName: icon)
                        .font(.system(size: 15, weight: .semibold))
                }
                Text(title)
                    .font(.system(size: 16, weight: .semibold))
            }
            .foregroundColor(isPrimary ? .white : SportPlusTheme.textPrimary)
            .frame(maxWidth: .infinity)
            .frame(height: 52)
            .background {
                if isPrimary {
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(
                            LinearGradient(
                                colors: [SportPlusTheme.primaryLight, SportPlusTheme.primary],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                } else {
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(.ultraThinMaterial)
                        .background(Color.white.opacity(0.6))
                }
            }
            .overlay {
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .strokeBorder(
                        isPrimary
                        ? Color.white.opacity(0.25)
                        : Color.white.opacity(0.8),
                        lineWidth: 1
                    )
            }
            .shadow(
                color: isPrimary ? SportPlusTheme.primary.opacity(0.25) : SportPlusTheme.glassShadow,
                radius: 12,
                x: 0,
                y: 6
            )
        }
        .buttonStyle(GlassPressableButtonStyle())
    }
}
