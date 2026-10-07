import SwiftUI

public struct OwnerCRMView: View {
    @State private var surgePricingActive: Bool = false
    @State private var slotLocks: [String: Bool] = [
        "16:00": false,
        "17:00": false,
        "18:00": true, // locked
        "19:00": false,
        "20:00": false,
        "21:00": false,
        "22:00": false,
        "23:00": false
    ]
    
    let slotKeys: [String] = ["16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"]
    
    public init() {}
    
    public var body: some View {
        ZStack {
            KineticTheme.background.ignoresSafeArea()
            
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    // Header
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("OWNER CRM")
                                .font(.system(size: 20, weight: .bold, design: .rounded))
                                .foregroundColor(.white)
                            Text("SLOT MATRIX & DAROMAD")
                                .font(.system(size: 11, weight: .bold, design: .monospaced))
                                .foregroundColor(KineticTheme.neonTurf)
                        }
                        
                        Spacer()
                        
                        HStack(spacing: 6) {
                            Circle().fill(KineticTheme.neonTurf).frame(width: 6, height: 6)
                            Text("REDIS LIVE")
                                .font(.system(size: 10, weight: .heavy, design: .monospaced))
                                .foregroundColor(KineticTheme.neonTurf)
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(KineticTheme.neonTurf.opacity(0.12))
                        .cornerRadius(20)
                        .overlay(
                            RoundedRectangle(cornerRadius: 20)
                                .stroke(KineticTheme.neonTurf.opacity(0.3), lineWidth: 1)
                        )
                    }
                    .padding(.top, 16)
                    
                    // Revenue Telemetry Card
                    VStack(alignment: .leading, spacing: 12) {
                        Text("BUGUNGI SOF TUSHUM")
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundColor(KineticTheme.textMuted)
                        
                        Text("1 420 000 UZS")
                            .font(.system(size: 28, weight: .heavy, design: .monospaced))
                            .foregroundColor(KineticTheme.neonTurfBright)
                        
                        Divider().background(KineticTheme.borderSubtle)
                        
                        HStack {
                            Text("Band qilingan slotlar:")
                                .font(.system(size: 13))
                                .foregroundColor(.white.opacity(0.75))
                            Spacer()
                            Text("8 / 10 slot (80%)")
                                .font(.system(size: 13, weight: .bold, design: .monospaced))
                                .foregroundColor(.white)
                        }
                    }
                    .padding(20)
                    .glassCard(isActive: true)
                    
                    // Surge Pricing Toggle
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("SURGE DINAMIK NARX")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.white)
                            Text(surgePricingActive ? "+20% peak vaqt stavkasi yoqilgan" : "Standart narxlar o'rnatilgan")
                                .font(.system(size: 11))
                                .foregroundColor(surgePricingActive ? KineticTheme.surgeGold : KineticTheme.textMuted)
                        }
                        
                        Spacer()
                        
                        Toggle("", isOn: $surgePricingActive)
                            .labelsHidden()
                            .tint(KineticTheme.surgeGold)
                    }
                    .padding(18)
                    .glassCard(isSurge: surgePricingActive)
                    
                    // Slot Management Matrix
                    VStack(alignment: .leading, spacing: 12) {
                        Text("SLOTLARNI BOSHQARISH MATRIXI (TAP TO LOCK)")
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundColor(KineticTheme.neonTurf)
                        
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                            ForEach(slotKeys, id: \.self) { slot in
                                let isLocked = slotLocks[slot] ?? false
                                Button(action: {
                                    slotLocks[slot] = !isLocked
                                }) {
                                    HStack {
                                        Text(slot)
                                            .font(.system(size: 14, weight: .bold, design: .monospaced))
                                            .foregroundColor(.white)
                                        Spacer()
                                        Image(systemName: isLocked ? "lock.fill" : "lock.open.fill")
                                            .foregroundColor(isLocked ? .red : KineticTheme.neonTurf)
                                            .font(.system(size: 15))
                                    }
                                    .padding(.horizontal, 14)
                                    .frame(height: 48)
                                    .background(isLocked ? Color.red.opacity(0.15) : KineticTheme.surfaceHigh)
                                    .cornerRadius(16)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 16)
                                            .stroke(isLocked ? Color.red.opacity(0.6) : KineticTheme.borderActive, lineWidth: 1.2)
                                    )
                                }
                            }
                        }
                    }
                }
                .padding(20)
            }
        }
    }
}
