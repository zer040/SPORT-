import ActivityKit
import Foundation

// MARK: - Match Activity Attributes (iOS Dynamic Island & Lock Screen)
public struct MatchActivityAttributes: ActivityAttributes {
    // MARK: - Dynamic State (O'zgaruvchan kontent)
    public struct ContentState: Codable, Hashable {
        /// Holat: "countdown_30min", "kickoff_imminent", "live_in_progress", "completed", "cancelled"
        public var status: String
        /// Qolgan daqiqalar
        public var countdownMinutes: Int
        /// Ekranda ko'rsatiluvchi matn
        public var customMessage: String
        /// Stadion nomi (ixtiyoriy yangilanish uchun)
        public var venueName: String?
        /// Pitch nomi
        public var pitchName: String?
        
        public init(
            status: String = "countdown_30min",
            countdownMinutes: Int = 30,
            customMessage: String = "O'yin boshlanishiga 30 daqiqa qoldi!",
            venueName: String? = nil,
            pitchName: String? = nil
        ) {
            self.status = status
            self.countdownMinutes = countdownMinutes
            self.customMessage = customMessage
            self.venueName = venueName
            self.pitchName = pitchName
        }
    }

    // MARK: - Fixed Static Attributes (O'zgarmas ma'lumotlar)
    public var bookingId: String
    public var venueName: String
    public var pitchName: String
    public var kickoffTime: Date
    public var endTime: Date
    
    public init(
        bookingId: String,
        venueName: String,
        pitchName: String,
        kickoffTime: Date,
        endTime: Date
    ) {
        self.bookingId = bookingId
        self.venueName = venueName
        self.pitchName = pitchName
        self.kickoffTime = kickoffTime
        self.endTime = endTime
    }
}
