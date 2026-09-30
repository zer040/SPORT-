import Foundation
import Security

public final class KeychainStorage {
    public static let shared = KeychainStorage()
    private let tokenKey = "uz.sportplus.jwt_token"
    private let userKey = "uz.sportplus.cached_user"
    
    private init() {}
    
    public func saveToken(_ token: String) {
        UserDefaults.standard.set(token, forKey: tokenKey)
    }
    
    public func getToken() -> String? {
        UserDefaults.standard.string(forKey: tokenKey)
    }
    
    public func removeToken() {
        UserDefaults.standard.removeObject(forKey: tokenKey)
    }
    
    public var isAuthenticated: Bool {
        return getToken() != nil
    }
}
