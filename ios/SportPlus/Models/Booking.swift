import Foundation

public struct Booking: Codable, Identifiable {
    public let id: String
    public let venueName: String
    public let pitchName: String
    public let matchDate: String
    public let startTime: String
    public let endTime: String
    public let totalPrice: Double
    public let paidAmount: Double
    public let status: String
    public let qrPassCode: String
    public let address: String
    
    enum CodingKeys: String, CodingKey {
        case id
        case venueName = "venue_name"
        case pitchName = "pitch_name"
        case matchDate = "match_date"
        case startTime = "start_time"
        case endTime = "end_time"
        case totalPrice = "total_price"
        case paidAmount = "paid_amount"
        case status
        case qrPassCode = "qr_pass"
        case address
    }
}
