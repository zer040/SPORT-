import SwiftUI

public struct LoginView: View {
    @ObservedObject var viewModel: AuthViewModel
    @FocusState private var isCodeFocused: Bool
    
    public init(viewModel: AuthViewModel) {
        self.viewModel = viewModel
    }
    
    public var body: some View {
        ZStack {
            // Subtle ambient background gradient
            SportPlusTheme.background.ignoresSafeArea()
            
            VStack(spacing: 28) {
                Spacer()
                
                // Hero Logo & Title
                VStack(spacing: 12) {
                    ZStack {
                        Circle()
                            .fill(SportPlusTheme.primary.opacity(0.12))
                            .frame(width: 88, height: 88)
                        
                        Image(systemName: "figure.indoor.soccer")
                            .font(.system(size: 42))
                            .foregroundColor(SportPlusTheme.primary)
                    }
                    
                    Text("SPORT+")
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundColor(SportPlusTheme.textPrimary)
                    
                    Text("O'zbekistondagi eng ilg'or futbol platformasi")
                        .font(.system(size: 15))
                        .foregroundColor(SportPlusTheme.textSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 32)
                }
                
                // Liquid Glass Auth Panel
                LiquidGlassCard(cornerRadius: 28, padding: 24) {
                    VStack(spacing: 20) {
                        if !viewModel.isWaitingForOtp {
                            // Step 1: Telegram Auth Initiation
                            VStack(spacing: 14) {
                                Text("Tezkor va xavfsiz kirish")
                                    .font(.system(size: 18, weight: .bold))
                                    .foregroundColor(SportPlusTheme.textPrimary)
                                
                                Text("SMS kod kutmasdan, Telegram botimiz orqali 1 soniyada 6 xonali tasdiq kodini oling.")
                                    .font(.system(size: 14))
                                    .foregroundColor(SportPlusTheme.textSecondary)
                                    .multilineTextAlignment(.center)
                                    .padding(.horizontal, 8)
                                
                                LiquidPillButton(
                                    title: viewModel.isLoading ? "Yuklanmoqda..." : "Telegram orqali kod olish",
                                    icon: "paperplane.fill",
                                    isPrimary: true
                                ) {
                                    Task { await viewModel.startTelegramAuth() }
                                }
                                .disabled(viewModel.isLoading)
                            }
                        } else {
                            // Step 2: 6-Digit OTP Entry
                            VStack(spacing: 18) {
                                HStack {
                                    Button(action: {
                                        viewModel.isWaitingForOtp = false
                                        viewModel.otpCode = ""
                                    }) {
                                        Image(systemName: "chevron.left")
                                            .font(.system(size: 16, weight: .semibold))
                                            .foregroundColor(SportPlusTheme.textSecondary)
                                    }
                                    Spacer()
                                    Text("Kodni kiriting")
                                        .font(.system(size: 17, weight: .bold))
                                        .foregroundColor(SportPlusTheme.textPrimary)
                                    Spacer()
                                    // Balance
                                    Image(systemName: "chevron.left").opacity(0)
                                }
                                
                                Text("Telegram botimizga yuborilgan 6 xonali kodni yozing:")
                                    .font(.system(size: 13))
                                    .foregroundColor(SportPlusTheme.textSecondary)
                                    .multilineTextAlignment(.center)
                                
                                // 6 Individual OTP Cells
                                ZStack {
                                    // Hidden TextField for keyboard
                                    TextField("", text: $viewModel.otpCode)
                                        .keyboardType(.numberPad)
                                        .textContentType(.oneTimeCode)
                                        .focused($isCodeFocused)
                                        .opacity(0.01)
                                        .onChange(of: viewModel.otpCode) { _, newValue in
                                            if newValue.count > 6 {
                                                viewModel.otpCode = String(newValue.prefix(6))
                                            }
                                            HapticManager.shared.impactLight()
                                            if viewModel.otpCode.count == 6 {
                                                Task { await viewModel.verifyOtp() }
                                            }
                                        }
                                    
                                    HStack(spacing: 8) {
                                        ForEach(0..<6, id: \.self) { index in
                                            let char = getDigit(at: index)
                                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                                .fill(Color.white.opacity(0.8))
                                                .frame(height: 52)
                                                .overlay(
                                                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                                                        .stroke(
                                                            viewModel.otpCode.count == index
                                                            ? SportPlusTheme.primary
                                                            : Color.black.opacity(0.08),
                                                            lineWidth: viewModel.otpCode.count == index ? 2 : 1
                                                        )
                                                )
                                                .overlay(
                                                    Text(char)
                                                        .font(.system(size: 22, weight: .bold, design: .rounded))
                                                        .foregroundColor(SportPlusTheme.textPrimary)
                                                )
                                                .onTapGesture {
                                                    isCodeFocused = true
                                                }
                                        }
                                    }
                                }
                                .onAppear {
                                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                                        isCodeFocused = true
                                    }
                                }
                                
                                if let deepLink = viewModel.deepLinkURL {
                                    Link(destination: deepLink) {
                                        HStack(spacing: 6) {
                                            Image(systemName: "arrow.up.right.square")
                                            Text("Telegram Botni ochish")
                                        }
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundColor(SportPlusTheme.primary)
                                    }
                                    .padding(.top, 4)
                                }
                                
                                LiquidPillButton(
                                    title: viewModel.isLoading ? "Tekshirilmoqda..." : "Tasdiqlash",
                                    icon: "checkmark",
                                    isPrimary: true
                                ) {
                                    Task { await viewModel.verifyOtp() }
                                }
                                .disabled(viewModel.otpCode.count != 6 || viewModel.isLoading)
                            }
                        }
                        
                        if let error = viewModel.errorMessage {
                            Text(error)
                                .font(.system(size: 13))
                                .foregroundColor(SportPlusTheme.danger)
                                .multilineTextAlignment(.center)
                        }
                    }
                }
                .padding(.horizontal, 20)
                
                Spacer()
                
                Text("SPORT+ • Apple Human Interface Guidelines 2026")
                    .font(.system(size: 12))
                    .foregroundColor(SportPlusTheme.textMuted)
                    .padding(.bottom, 16)
            }
        }
    }
    
    private func getDigit(at index: Int) -> String {
        let code = viewModel.otpCode
        guard index < code.count else { return "" }
        let stringIndex = code.index(code.startIndex, offsetBy: index)
        return String(code[stringIndex])
    }
}
