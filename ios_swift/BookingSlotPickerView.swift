import SwiftUI

public struct SlotModel: Identifiable {
    public let id = UUID()
    public let time: String
    public let isAvailable: Bool
    public let isPeak: Bool
}

public struct BookingSlotPickerView: View {
    public let venue: VenueItem
    public var onBack: () -> Void
    public var onConfirm: (String, Double) -> Void
    
    @State private var selectedDateIndex: Int = 0
    @State private var selectedSlot: String? = nil
    @State private var isProcessing: Bool = false
    
    let days: [String] = ["Bugun (7 Okt)", "Ertaga (8 Okt)", "9 Oktabr", "10 Oktabr", "11 Oktabr"]
    
    let slots: [SlotModel] = [
        SlotModel(time: "16:00 - 17:00", isAvailable: true, isPeak: false),
        SlotModel(time: "17:00 - 18:00", isAvailable: false, isPeak: false),
        SlotModel(time: "18:00 - 19:00", isAvailable: true, isPeak: true),
        SlotModel(time: "19:00 - 20:00", isAvailable: true, isPeak: true),
        SlotModel(time: "20:00 - 21:00", isAvailable: false, isPeak: true),
        SlotModel(time: "21:00 - 22:00", isAvailable: true, isPeak: true),
        SlotModel(time: "22:00 - 23:00", isAvailable: true, isPeak: false),
        SlotModel(time: "23:00 - 00:00", isAvailable: true, isPeak: false)
    ]
    
    public init(venue: VenueItem, onBack: @escaping () -> Void, onConfirm: @escaping (String, Double) -> Void) {
        self.venue = venue
        self.onBack = onBack
        self.onConfirm = onConfirm
    }
    
    public var body: some View {
        let total = venue.pricePerHour + 10000.0
        
        ZStack {
            KineticTheme.background.ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Top Bar
                HStack {
                    Button(action: onBack) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                            .padding(10)
                            .background(KineticTheme.surfaceHigh)
                            .clipShape(Circle())
                    }
                    
                    Spacer()
                    
                    Text(venue.name)
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(.white)
                    
                    Spacer()
                    
                    Circle().fill(Color.clear).frame(width: 36, height: 36)
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
                .padding(.bottom, 8)
                
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        // Specs Row
                        HStack(spacing: 12) {
                            SpecBadge(icon: "square.dashed", title: "FORMAT", val: venue.format)
                            SpecBadge(icon: "lightbulb.fill", title: "YORITISH", val: "LED PRO")
                            SpecBadge(icon: "shower.fill", title: "DUSH", val: "Mavjud")
                            SpecBadge(icon: "parkingsign.circle.fill", title: "PARKOVKA", val: "Bepul")
                        }
                        .padding(16)
                        .glassCard()
                        
                        // Date Scroller
                        VStack(alignment: .leading, spacing: 10) {
                            Text("SANA TANLANG")
                                .font(.system(size: 11, weight: .bold, design: .monospaced))
                                .foregroundColor(KineticTheme.neonTurf)
                            
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 8) {
                                    ForEach(0..<days.count, id: \.self) { i in
                                        let sel = selectedDateIndex == i
                                        Button(action: { selectedDateIndex = i }) {
                                            Text(days[i])
                                                .font(.system(size: 13, weight: sel ? .heavy : .medium))
                                                .padding(.horizontal, 16)
                                                .padding(.vertical, 10)
                                                .background(sel ? KineticTheme.neonTurf : KineticTheme.surfaceHigh)
                                                .foregroundColor(sel ? .black : .white)
                                                .cornerRadius(14)
                                        }
                                    }
                                }
                            }
                        }
                        
                        // Slot Matrix
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Text("VAQT MATRIXI (SLOTLAR)")
                                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                                    .foregroundColor(KineticTheme.neonTurf)
                                Spacer()
                                HStack(spacing: 4) {
                                    Circle().fill(KineticTheme.surgeGold).frame(width: 6, height: 6)
                                    Text("Peak vaqt")
                                        .font(.system(size: 10, design: .monospaced))
                                        .foregroundColor(KineticTheme.surgeGold)
                                }
                            }
                            
                            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                                ForEach(slots) { s in
                                    let isSel = selectedSlot == s.time
                                    Button(action: {
                                        if s.isAvailable { selectedSlot = s.time }
                                    }) {
                                        HStack {
                                            Text(s.time)
                                                .font(.system(size: 13, weight: isSel ? .heavy : .medium, design: .monospaced))
                                                .foregroundColor(isSel ? .black : (s.isAvailable ? .white : .white.opacity(0.25)))
                                            
                                            Spacer()
                                            
                                            if !s.isAvailable {
                                                Text("BAND")
                                                    .font(.system(size: 9, weight: .bold))
                                                    .foregroundColor(.red.opacity(0.8))
                                            } else if s.isPeak {
                                                Image(systemName: "bolt.fill")
                                                    .font(.system(size: 11))
                                                    .foregroundColor(isSel ? .black : KineticTheme.surgeGold)
                                            }
                                        }
                                        .padding(.horizontal, 12)
                                        .frame(height: 48)
                                        .background(isSel ? KineticTheme.neonTurf : (s.isAvailable ? KineticTheme.surfaceHigh.opacity(0.8) : Color.black.opacity(0.3)))
                                        .cornerRadius(14)
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 14)
                                                .stroke(isSel ? KineticTheme.neonTurf : (s.isPeak && s.isAvailable ? KineticTheme.surgeGold.opacity(0.5) : KineticTheme.borderSubtle), lineWidth: isSel ? 2 : 1)
                                        )
                                    }
                                    .disabled(!s.isAvailable)
                                }
                            }
                        }
                        
                        // Financial Breakdown
                        VStack(spacing: 10) {
                            HStack {
                                Text("Maydon ijarasi (1 soat):")
                                    .font(.system(size: 13))
                                    .foregroundColor(KineticTheme.textMuted)
                                Spacer()
                                Text("\(Int(venue.pricePerHour)) UZS")
                                    .font(.system(size: 13, weight: .bold, design: .monospaced))
                                    .foregroundColor(.white)
                            }
                            HStack {
                                Text("Platforma xizmati:")
                                    .font(.system(size: 13))
                                    .foregroundColor(KineticTheme.textMuted)
                                Spacer()
                                Text("10 000 UZS")
                                    .font(.system(size: 13, weight: .bold, design: .monospaced))
                                    .foregroundColor(KineticTheme.neonTurf)
                            }
                            Divider().background(KineticTheme.borderSubtle)
                            HStack {
                                Text("JAMI TO'LOV:")
                                    .font(.system(size: 15, weight: .bold))
                                    .foregroundColor(.white)
                                Spacer()
                                Text("\(Int(total)) UZS")
                                    .font(.system(size: 18, weight: .heavy, design: .monospaced))
                                    .foregroundColor(KineticTheme.neonTurfBright)
                            }
                        }
                        .padding(18)
                        .glassCard(isActive: selectedSlot != nil)
                    }
                    .padding(20)
                }
                
                // Bottom Confirm Bar
                VStack {
                    Button(action: {
                        guard let slot = selectedSlot else { return }
                        isProcessing = true
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
                            isProcessing = false
                            onConfirm(slot, total)
                        }
                    }) {
                        HStack {
                            Spacer()
                            if isProcessing {
                                ProgressView().tint(.black)
                            } else {
                                Text(selectedSlot != nil ? "SLOTNI BRON QILISH VA TO'LASH" : "ILTIMOS VAQTNI TANLANG")
                                    .font(.system(size: 14, weight: .heavy))
                                    .foregroundColor(selectedSlot != nil ? .black : .white.opacity(0.35))
                                    .tracking(0.5)
                            }
                            Spacer()
                        }
                        .frame(height: 52)
                        .background(selectedSlot != nil ? KineticTheme.neonTurf : Color.gray.opacity(0.3))
                        .cornerRadius(KineticTheme.radiusButton)
                        .shadow(color: selectedSlot != nil ? KineticTheme.neonTurf.opacity(0.35) : Color.clear, radius: 18)
                    }
                    .disabled(selectedSlot == nil || isProcessing)
                }
                .padding(20)
                .background(KineticTheme.surfaceLowest)
                .overlay(Rectangle().frame(height: 1).foregroundColor(KineticTheme.borderSubtle), alignment: .top)
            }
        }
    }
}

struct SpecBadge: View {
    let icon: String
    let title: String
    let val: String
    
    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 18))
                .foregroundColor(KineticTheme.neonTurf)
            Text(title)
                .font(.system(size: 8, weight: .semibold, design: .monospaced))
                .foregroundColor(KineticTheme.textMuted)
            Text(val)
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(.white)
        }
        .frame(maxWidth: .infinity)
    }
}
