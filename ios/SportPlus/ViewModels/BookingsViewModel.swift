import SwiftUI
import Combine

@MainActor
public final class BookingsViewModel: ObservableObject {
    @Published public var bookings: [Booking] = []
    @Published public var selectedBooking: Booking?
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String?
    
    public init() {
        Task { await fetchMyBookings() }
    }
    
    public func fetchMyBookings() async {
        isLoading = true
        errorMessage = nil
        do {
            let fetched: [Booking] = try await NetworkManager.shared.request(
                endpoint: "/bookings/my",
                method: "GET",
                requiresAuth: true
            )
            self.bookings = fetched
            self.isLoading = false
        } catch {
            self.isLoading = false
            self.errorMessage = error.localizedDescription
        }
    }
}
