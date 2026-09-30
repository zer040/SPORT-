import SwiftUI

@main
struct SportPlusApp: App {
    @StateObject private var authViewModel = AuthViewModel()
    
    var body: some Scene {
        WindowGroup {
            Group {
                if authViewModel.isAuthenticated {
                    MainTabView(authViewModel: authViewModel)
                        .transition(.opacity)
                } else {
                    LoginView(viewModel: authViewModel)
                        .transition(.opacity)
                }
            }
            .animation(.easeInOut(duration: 0.3), value: authViewModel.isAuthenticated)
            .preferredColorScheme(.light) // Pure Light Mode as per SPORT+ rules
        }
    }
}
