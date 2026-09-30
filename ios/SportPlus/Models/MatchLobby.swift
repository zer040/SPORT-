import Foundation

public struct MatchLobby: Codable, Identifiable {
    public let id: String
    public let title: String
    public let venueName: String
    public let venueAddress: String
    public let matchDate: String
    public let startTime: String
    public let endTime: String
    public let playersNeeded: Int
    public let currentPlayers: Int
    public let costPerPerson: Double
    public let skillLevel: String
    public let status: String
    public let distanceKm: Double?
    
    enum CodingKeys: String, CodingKey {
        case id
        case title
        case venueName = "venue_name"
        case venueAddress = "venue_address"
        case matchDate = "match_date"
        case startTime = "start_time"
        case endTime = "end_time"
        case playersNeeded = "players_needed"
        case currentPlayers = "current_players"
        case costPerPerson = "cost_per_person"
        case skillLevel = "skill_level"
        case status
        case distanceKm = "distance_km"
    }
}
