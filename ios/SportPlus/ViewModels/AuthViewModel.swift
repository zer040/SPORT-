import SwiftUI
import Combine

@MainActor
public final class AuthViewModel: ObservableObject {
    @Published public var isAuthenticated: Bool = false
    @Published public var currentUser: User?
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String?
    
    // Telegram OTP Flow
    @Published public var otpCode: String = ""
    @Published public var authToken: String = ""
    @Published public var deepLinkURL: URL?
    @Published public var botUsername: String = "sport_plus_uz_bot"
    @Published public var isWaitingForOtp: Bool = false
    
    public init() {
        self.isAuthenticated = KeychainStorage.shared.isAuthenticated
        if isAuthenticated {
            Task { await fetchCurrentUser() }
        }
    }
    
    public func startTelegramAuth() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let response: TelegramInitResponse = try await NetworkManager.shared.request(
                endpoint: "/auth/telegram/init",
                method: "POST"
            )
            
            self.authToken = response.authToken
            self.botUsername = response.botUsername
            if let url = URL(string: response.deepLink) {
                self.deepLinkURL = url
            }
            self.isWaitingForOtp = true
            self.isLoading = false
            HapticManager.shared.impactLight()
        } catch {
            self.isLoading = false
            self.errorMessage = error.localizedDescription
            HapticManager.shared.error()
        }
    }
    
    public func verifyOtp() async {
        guard otpCode.count == 6 else {
            errorMessage = "6 xonali kodni to'liq kiriting"
            HapticManager.shared.warning()
            return
        }
        
        isLoading = true
        errorMessage = nil
        
        do {
            let body: [String: Any] = [
                "auth_token": authToken,
                "code": otpCode
            ]
            
            let response: AuthResponse = try await NetworkManager.shared.request(
                endpoint: "/auth/telegram/verify-otp",
                method: "POST",
                body: body
            )
            
            if let token = response.accessToken {
                KeychainStorage.shared.saveToken(token)
                self.currentUser = response.user
                self.isAuthenticated = true
                self.isWaitingForOtp = false
                HapticManager.shared.success()
            } else {
                throw NetworkError.serverError("Token olinmadi")
            }
            self.isLoading = false
        } catch {
            self.isLoading = false
            self.errorMessage = error.localizedDescription
            HapticManager.shared.error()
        }
    }
    
    public func fetchCurrentUser() async {
        do {
            let user: User = try await NetworkManager.shared.request(
                endpoint: "/auth/me",
                method: "GET",
                requiresAuth: true
            )
            self.currentUser = user
            self.isAuthenticated = true
        } catch {
            KeychainStorage.shared.removeToken()
            self.isAuthenticated = false
        }
    }
    
    public func logout() {
        KeychainStorage.shared.removeToken()
        self.isAuthenticated = false
        self.currentUser = nil
        self.isWaitingForOtp = false
        self.otpCode = ""
        HapticManager.shared.impactMedium()
    }
}
