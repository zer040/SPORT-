import SwiftUI

public struct AuthWelcomeView: View {
    public var onAuthenticated: () -> Void
    
    @State private var phoneNumber: String = "+998 "
    @State private var otpCode: [String] = Array(repeating: "", count: 6)
    @State private var isOtpSent: Bool = false
    @State private var isLoading: Bool = false
    @State private var countdown: Int = 60
    @State private var timer: Timer? = nil
    
    @FocusState private var focusedIndex: Int?
    
    public init(onAuthenticated: @escaping () -> Void) {
        self.onAuthenticated = onAuthenticated
    }
    
    public var body: some View {
        ZStack {
            KineticTheme.background.ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 28) {
                    Spacer().frame(height: 20)
                    
                    // Logo Icon
                    ZStack {
                        RoundedRectangle(cornerRadius: 24)
                            .fill(KineticTheme.surfaceHigh)
                            .frame(width: 76, height: 76)
                            .overlay(
                                RoundedRectangle(cornerRadius: 24)
                                    .stroke(KineticTheme.neonTurf.opacity(0.4), lineWidth: 1.5)
                            )
                            .shadow(color: KineticTheme.neonTurf.opacity(0.35), radius: 25)
                        
                        Image(systemName: "soccerball")
                            .font(.system(size: 38))
                            .foregroundColor(KineticTheme.neonTurf)
                    }
                    
                    VStack(spacing: 6) {
                        Text("SPORT+")
                            .font(.system(size: 34, weight: .bold, design: .rounded))
                            .foregroundColor(KineticTheme.textHeading)
                        
                        Text("Toshkent & Jizzax futbol maydonlari ekotizimi")
                            .font(.system(size: 14))
                            .foregroundColor(KineticTheme.textMuted)
                            .multilineTextAlignment(.center)
                    }
                    
                    // Glass Card Container
                    VStack(alignment: .leading, spacing: 20) {
                        HStack {
                            Text(isOtpSent ? "OTP TASDIQLASH" : "KIRISH VA RO'YXATDAN O'TISH")
                                .font(.system(size: 11, weight: .bold, design: .monospaced))
                                .foregroundColor(KineticTheme.neonTurf)
                                .tracking(1)
                            
                            Spacer()
                            
                            Text("TELEGRAM AUTH")
                                .font(.system(size: 10, weight: .bold))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(KineticTheme.neonTurf.opacity(0.12))
                                .foregroundColor(KineticTheme.neonTurf)
                                .cornerRadius(KineticTheme.radiusChip)
                                .overlay(
                                    RoundedRectangle(cornerRadius: KineticTheme.radiusChip)
                                        .stroke(KineticTheme.neonTurf.opacity(0.3), lineWidth: 1)
                                )
                        }
                        
                        if !isOtpSent {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Telefon raqamingiz")
                                    .font(.system(size: 13))
                                    .foregroundColor(KineticTheme.textMuted)
                                
                                HStack {
                                    Image(systemName: "phone.fill")
                                        .foregroundColor(KineticTheme.neonTurf)
                                    
                                    TextField("+998 90 123 45 67", text: $phoneNumber)
                                        .foregroundColor(.white)
                                        .font(.system(size: 16, design: .monospaced))
                                        .keyboardType(.phonePad)
                                }
                                .padding()
                                .background(KineticTheme.surfaceLowest.opacity(0.8))
                                .cornerRadius(KineticTheme.radiusInput)
                                .overlay(
                                    RoundedRectangle(cornerRadius: KineticTheme.radiusInput)
                                        .stroke(KineticTheme.borderSubtle, lineWidth: 1)
                                )
                            }
                            
                            Button(action: sendOtp) {
                                HStack {
                                    Spacer()
                                    if isLoading {
                                        ProgressView().tint(.black)
                                    } else {
                                        Text("OTP KODNI TELEGRAMGA OLISH")
                                            .font(.system(size: 14, weight: .heavy))
                                            .foregroundColor(.black)
                                            .tracking(0.5)
                                    }
                                    Spacer()
                                }
                                .frame(height: 52)
                                .background(KineticTheme.neonTurf)
                                .cornerRadius(KineticTheme.radiusButton)
                                .shadow(color: KineticTheme.neonTurf.opacity(0.4), radius: 18)
                            }
                        } else {
                            VStack(alignment: .leading, spacing: 14) {
                                Text("Telegram @sport_plus_uz_bot orqali yuborilgan 6 xonali kodni kiriting:")
                                    .font(.system(size: 13))
                                    .foregroundColor(.white.opacity(0.85))
                                
                                // 6-Cell Matrix
                                HStack(spacing: 8) {
                                    ForEach(0..<6, id: \.self) { idx in
                                        TextField("", text: $otpCode[idx])
                                            .focused($focusedIndex, equals: idx)
                                            .frame(height: 52)
                                            .multilineTextAlignment(.center)
                                            .font(.system(size: 22, weight: .bold, design: .monospaced))
                                            .foregroundColor(.white)
                                            .background(KineticTheme.surfaceLowest)
                                            .cornerRadius(10)
                                            .overlay(
                                                RoundedRectangle(cornerRadius: 10)
                                                    .stroke(focusedIndex == idx ? KineticTheme.neonTurf : KineticTheme.borderSubtle, lineWidth: focusedIndex == idx ? 2 : 1)
                                            )
                                            .keyboardType(.numberPad)
                                            .onChange(of: otpCode[idx]) { newVal in
                                                if newVal.count > 1 {
                                                    otpCode[idx] = String(newVal.prefix(1))
                                                }
                                                if !newVal.isEmpty && idx < 5 {
                                                    focusedIndex = idx + 1
                                                }
                                                if otpCode.allSatisfy({ !$0.isEmpty }) {
                                                    verifyOtp()
                                                }
                                            }
                                    }
                                }
                                
                                HStack {
                                    Text("Qayta yuborish: \(countdown)s")
                                        .font(.system(size: 12, design: .monospaced))
                                        .foregroundColor(KineticTheme.neonTurf)
                                    Spacer()
                                    if countdown == 0 {
                                        Button("Qayta yuborish", action: sendOtp)
                                            .foregroundColor(KineticTheme.neonTurfBright)
                                            .font(.system(size: 12, weight: .bold))
                                    }
                                }
                                
                                Button(action: verifyOtp) {
                                    HStack {
                                        Spacer()
                                        if isLoading {
                                            ProgressView().tint(.black)
                                        } else {
                                            Text("TIZIMGA KIRISH")
                                                .font(.system(size: 14, weight: .heavy))
                                                .foregroundColor(.black)
                                        }
                                        Spacer()
                                    }
                                    .frame(height: 52)
                                    .background(KineticTheme.neonTurf)
                                    .cornerRadius(KineticTheme.radiusButton)
                                    .shadow(color: KineticTheme.neonTurf.opacity(0.4), radius: 18)
                                }
                            }
                        }
                    }
                    .padding(24)
                    .glassCard(isActive: true)
                    
                    Spacer()
                }
                .padding(.horizontal, 24)
            }
        }
    }
    
    private func sendOtp() {
        isLoading = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
            isLoading = false
            isOtpSent = true
            countdown = 60
            focusedIndex = 0
            startTimer()
        }
    }
    
    private func startTimer() {
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
            if countdown > 0 {
                countdown -= 1
            } else {
                timer?.invalidate()
            }
        }
    }
    
    private func verifyOtp() {
        let code = otpCode.joined()
        if code.count == 6 {
            isLoading = true
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.7) {
                isLoading = false
                onAuthenticated()
            }
        }
    }
}
