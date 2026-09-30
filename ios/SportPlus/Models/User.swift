import Foundation

public struct User: Codable, Identifiable {
    public let id: String
    public let phoneNumber: String?
    public let fullName: String
    public let firstName: String?
    public let lastName: String?
    public let role: String
    public let rating: Double
    public let totalGames: Int?
    public let telegramId: Int?
    public let isProfileCompleted: Bool?
    
    enum CodingKeys: String, CodingKey {
        case id
        case phoneNumber = "phone_number"
        case fullName = "full_name"
        case firstName = "first_name"
        case lastName = "last_name"
        case role
        case rating
        case totalGames = "total_games"
        case telegramId = "telegram_id"
        case isProfileCompleted = "is_profile_completed"
    }
}

public struct AuthResponse: Codable {
    public let accessToken: String?
    public let refreshToken: String?
    public let user: User?
    public let status: String?
    public let message: String?
    
    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case user
        case status
        case message
    }
}

public struct TelegramInitResponse: Codable {
    public let success: Bool
    public let authToken: String
    public let botUsername: String
    public let deepLink: String
    public let expiresIn: Int
    
    enum CodingKeys: String, CodingKey {
        case success
        case authToken = "auth_token"
        case botUsername = "bot_username"
        case deepLink = "deep_link"
        case expiresIn = "expires_in"
    }
}
