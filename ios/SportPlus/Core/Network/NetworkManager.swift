import Foundation

public enum NetworkError: LocalizedError {
    case invalidURL
    case serverError(String)
    case unauthorized
    case decodingError(String)
    case unknown
    
    public var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Noto'g'ri server manzili"
        case .serverError(let message):
            return message
        case .unauthorized:
            return "Sessiya tugagan. Qaytadan kiring."
        case .decodingError(let desc):
            return "Ma'lumotlarni o'qishda xatolik: \(desc)"
        case .unknown:
            return "Kutilmagan xatolik yuz berdi"
        }
    }
}

public final class NetworkManager {
    public static let shared = NetworkManager()
    public let baseURL = "https://sport-jmu3.onrender.com/api/v1"
    
    private let session: URLSession
    
    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 20
        config.timeoutIntervalForResource = 30
        self.session = URLSession(configuration: config)
    }
    
    public func request<T: Decodable>(
        endpoint: String,
        method: String = "GET",
        body: [String: Any]? = nil,
        requiresAuth: Bool = false
    ) async throws -> T {
        guard let url = URL(string: "\(baseURL)\(endpoint)") else {
            throw NetworkError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        
        if requiresAuth, let token = KeychainStorage.shared.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        if let body = body {
            request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        }
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw NetworkError.unknown
        }
        
        if httpResponse.statusCode == 401 {
            KeychainStorage.shared.removeToken()
            throw NetworkError.unauthorized
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                let msg = (json["detail"] as? String) ?? (json["message"] as? String) ?? "Server xatosi (\(httpResponse.statusCode))"
                throw NetworkError.serverError(msg)
            }
            throw NetworkError.serverError("Server xatosi (\(httpResponse.statusCode))")
        }
        
        do {
            let decoded = try JSONDecoder().decode(T.self, from: data)
            return decoded
        } catch {
            throw NetworkError.decodingError(error.localizedDescription)
        }
    }
}
