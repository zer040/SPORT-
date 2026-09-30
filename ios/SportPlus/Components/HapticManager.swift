import UIKit
import AudioToolbox

// MARK: - Haptic & Audio Feedback Manager
public final class HapticManager {
    public static let shared = HapticManager()
    
    private let lightImpact = UIImpactFeedbackGenerator(style: .light)
    private let mediumImpact = UIImpactFeedbackGenerator(style: .medium)
    private let heavyImpact = UIImpactFeedbackGenerator(style: .heavy)
    private let selectionFeedback = UISelectionFeedbackGenerator()
    private let notificationFeedback = UINotificationFeedbackGenerator()
    
    private init() {
        prepare()
    }
    
    public func prepare() {
        lightImpact.prepare()
        mediumImpact.prepare()
        selectionFeedback.prepare()
        notificationFeedback.prepare()
    }
    
    public func impactLight() {
        lightImpact.impactOccurred()
    }
    
    public func impactMedium() {
        mediumImpact.impactOccurred()
    }
    
    public func impactHeavy() {
        heavyImpact.impactOccurred()
    }
    
    public func selection() {
        selectionFeedback.selectionChanged()
    }
    
    public func success() {
        notificationFeedback.notificationOccurred(.success)
        AudioServicesPlaySystemSound(1054) // iOS tick/success audio feedback
    }
    
    public func warning() {
        notificationFeedback.notificationOccurred(.warning)
    }
    
    public func error() {
        notificationFeedback.notificationOccurred(.error)
        AudioServicesPlaySystemSound(1053) // Subtle alert
    }
}
