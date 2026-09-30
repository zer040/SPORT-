import Foundation

public struct Venue: Codable, Identifiable {
    public let id: String
    public let name: String
    public let address: String
    public let district: String?
    public let city: String?
    public let latitude: Double
    public let longitude: Double
    public let rating: Double
    public let reviewsCount: Int?
    public let mainImage: String?
    public let minPricePerHour: Double?
    public let distanceKm: Double?
    public let amenities: [String]?
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case address
        case district
        case city
        case latitude
        case longitude
        case rating
        case reviewsCount = "reviews_count"
        case mainImage = "main_image"
        case minPricePerHour = "min_price_per_hour"
        case distanceKm = "distance_km"
        case amenities
    }
}

public struct Pitch: Codable, Identifiable {
    public let id: String
    public let venueId: String
    public let name: String
    public let surfaceType: String
    public let isCovered: Bool
    public let pricePerHour: Double
    public let dimensions: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case venueId = "venue_id"
        case name
        case surfaceType = "surface_type"
        case isCovered = "is_covered"
        case pricePerHour = "price_per_hour"
        case dimensions
    }
}

public struct TimeSlot: Codable, Identifiable {
    public let id: String
    public let pitchId: String
    public let startTime: String
    public let endTime: String
    public let price: Double
    public let isAvailable: Bool
    
    enum CodingKeys: String, CodingKey {
        case id
        case pitchId = "pitch_id"
        case startTime = "start_time"
        case endTime = "end_time"
        case price
        case isAvailable = "is_available"
    }
}
