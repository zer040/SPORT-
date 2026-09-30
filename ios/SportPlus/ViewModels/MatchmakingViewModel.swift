import SwiftUI
import Combine

@MainActor
public final class MatchmakingViewModel: ObservableObject {
    @Published public var lobbies: [MatchLobby] = []
    @Published public var isSearching: Bool = false
    @Published public var isLoading: Bool = false
    @Published public var radarAngle: Double = 0
    @Published public var radarScale: CGFloat = 1.0
    @Published public var errorMessage: String?
    
    public init() {
        Task { await fetchLobbies() }
    }
    
    public func fetchLobbies() async {
        isLoading = true
        errorMessage = nil
        do {
            let fetched: [MatchLobby] = try await NetworkManager.shared.request(
                endpoint: "/matches?lat=41.2858&lon=69.2163&radius_km=25&status=FORMING"
            )
            self.lobbies = fetched
            self.isLoading = false
        } catch {
            self.isLoading = false
            self.errorMessage = error.localizedDescription
        }
    }
    
    public func toggleSearch() {
        isSearching.toggle()
        if isSearching {
            HapticManager.shared.impactMedium()
        } else {
            HapticManager.shared.impactLight()
        }
    }
    
    public func joinLobby(lobbyId: String, position: String = "MID") async -> Bool {
        HapticManager.shared.impactMedium()
        do {
            let body = ["player_position": position]
            let _: [String: Any] = try await NetworkManager.shared.request(
                endpoint: "/matches/\(lobbyId)/join",
                method: "POST",
                body: body,
                requiresAuth: true
            )
            HapticManager.shared.success()
            await fetchLobbies()
            return true
        } catch {
            HapticManager.shared.error()
            self.errorMessage = error.localizedDescription
            return false
        }
    }
}
