import ActivityKit
import Foundation
import SwiftUI

// MARK: - Live Activity Client Manager (iOS ActivityKit Lifecycle)
@MainActor
public final class LiveActivityManager: ObservableObject {
    public static let shared = LiveActivityManager()
    
    @Published public var activeBookingId: String?
    @Published public var isActivityActive: Bool = false
    @Published public var lastPushTokenHex: String?
    
    private var currentActivity: Activity<MatchActivityAttributes>?
    
    private init() {
        checkExistingActivities()
    }
    
    /// Qurilma Live Activities funksiyasini qo'llab-quvvatlaydimi va ruxsat berilganmi?
    public var areActivitiesEnabled: Bool {
        return ActivityAuthorizationInfo().areActivitiesEnabled
    }
    
    /// O'yin boshlanishiga 30 daqiqa qolganda Dynamic Island va Lock Screen taymerini ishga tushirish
    public func startMatchCountdown(
        bookingId: String,
        venueName: String,
        pitchName: String,
        kickoffTime: Date,
        endTime: Date
    ) async {
        guard areActivitiesEnabled else {
            print("⚠️ Live Activities ruxsat etilmagan yoki o'chirilgan.")
            return
        }
        
        // Agar ushbu bron uchun avval ochilgan bo'lsa, tozalaymiz
        await endActivity(bookingId: bookingId)
        
        let attributes = MatchActivityAttributes(
            bookingId: bookingId,
            venueName: venueName,
            pitchName: pitchName,
            kickoffTime: kickoffTime,
            endTime: endTime
        )
        
        let initialContentState = MatchActivityAttributes.ContentState(
            status: "countdown_30min",
            countdownMinutes: max(0, Int(kickoffTime.timeIntervalSinceNow / 60)),
            customMessage: "30 daqiqadan so'ng match boshlanadi!",
            venueName: venueName,
            pitchName: pitchName
        )
        
        do {
            let activity = try Activity.request(
                attributes: attributes,
                content: .init(state: initialContentState, staleDate: kickoffTime.addingTimeInterval(3600)),
                pushType: .token // APNs orqali orqa fonda yangilanishlarni qabul qilish
            )
            
            self.currentActivity = activity
            self.activeBookingId = bookingId
            self.isActivityActive = true
            
            // Push token o'zgarishini tinglash va backendga yuborish
            Task {
                for await pushTokenData in activity.pushTokenUpdates {
                    let tokenString = pushTokenData.map { String(format: "%02.2hhx", $0) }.joined()
                    self.lastPushTokenHex = tokenString
                    await self.registerPushTokenWithBackend(bookingId: bookingId, pushToken: tokenString, activityId: activity.id)
                }
            }
            
            print("✅ Live Activity muvaffaqiyatli boshlandi! ActivityID: \(activity.id)")
        } catch {
            print("❌ Live Activity boshlashda xatolik: \(error.localizedDescription)")
        }
    }
    
    /// APNs push tokenni SPORT+ backendiga yuborish
    private func registerPushTokenWithBackend(
        bookingId: String,
        pushToken: String,
        activityId: String
    ) async {
        let body: [String: Any] = [
            "booking_id": bookingId,
            "push_token": pushToken,
            "activity_id": activityId,
            "device_os": "iOS"
        ]
        
        do {
            struct RegisterResponse: Decodable {
                let success: Bool
                let message: String
            }
            
            let response: RegisterResponse = try await NetworkManager.shared.request(
                endpoint: "/live-activities/register",
                method: "POST",
                body: body,
                requiresAuth: true
            )
            print("✅ Backend Live Activity APNs tokenni saqladi: \(response.message)")
        } catch {
            print("⚠️ Backendga Live Activity tokenni jo'natishda xatolik: \(error)")
        }
    }
    
    /// Dynamic Island kontentini lokal yangilash
    public func updateState(
        status: String,
        countdownMinutes: Int,
        message: String
    ) async {
        guard let activity = currentActivity else { return }
        
        let updatedState = MatchActivityAttributes.ContentState(
            status: status,
            countdownMinutes: countdownMinutes,
            customMessage: message
        )
        
        await activity.update(.init(state: updatedState, staleDate: nil))
    }
    
    /// Dynamic Island sessiyasini yakunlash
    public func endActivity(bookingId: String? = nil) async {
        for activity in Activity<MatchActivityAttributes>.activities {
            if bookingId == nil || activity.attributes.bookingId == bookingId {
                let finalState = MatchActivityAttributes.ContentState(
                    status: "completed",
                    countdownMinutes: 0,
                    customMessage: "O'yin yakunlandi"
                )
                await activity.end(.init(state: finalState, staleDate: nil), dismissalPolicy: .immediate)
            }
        }
        
        if bookingId == nil || self.activeBookingId == bookingId {
            self.currentActivity = nil
            self.activeBookingId = nil
            self.isActivityActive = false
        }
    }
    
    /// Mavjud aktiv sessiyalarni tekshirish
    private func checkExistingActivities() {
        if let first = Activity<MatchActivityAttributes>.activities.first {
            self.currentActivity = first
            self.activeBookingId = first.attributes.bookingId
            self.isActivityActive = true
        }
    }
}
