import 'package:flutter/material.dart';
import '../theme/kinetic_obsidian_theme.dart';

class BookingSlotScreen extends StatefulWidget {
  final Map<String, dynamic> venue;
  final VoidCallback onBack;
  final Function(String slot, double total) onConfirm;

  const BookingSlotScreen({
    super.key,
    required this.venue,
    required this.onBack,
    required this.onConfirm,
  });

  @override
  State<BookingSlotScreen> createState() => _BookingSlotScreenState();
}

class _BookingSlotScreenState extends State<BookingSlotScreen> {
  int _selectedDateIndex = 0;
  String? _selectedSlot;
  bool _isProcessing = false;

  final List<String> _days = ['Bugun (7 Okt)', 'Ertaga (8 Okt)', '9 Oktabr', '10 Oktabr', '11 Oktabr'];

  final List<Map<String, dynamic>> _slots = [
    {'time': '16:00 - 17:00', 'isAvailable': true, 'isPeak': false},
    {'time': '17:00 - 18:00', 'isAvailable': false, 'isPeak': false},
    {'time': '18:00 - 19:00', 'isAvailable': true, 'isPeak': true},
    {'time': '19:00 - 20:00', 'isAvailable': true, 'isPeak': true},
    {'time': '20:00 - 21:00', 'isAvailable': false, 'isPeak': true},
    {'time': '21:00 - 22:00', 'isAvailable': true, 'isPeak': true},
    {'time': '22:00 - 23:00', 'isAvailable': true, 'isPeak': false},
    {'time': '23:00 - 00:00', 'isAvailable': true, 'isPeak': false},
  ];

  @override
  Widget build(BuildContext context) {
    final double hourlyRate = (widget.venue['price_per_hour'] ?? 140000).toDouble();
    const double serviceFee = 10000;
    final double totalAmount = hourlyRate + serviceFee;

    return Scaffold(
      backgroundColor: KineticObsidianTheme.background,
      appBar: AppBar(
        backgroundColor: KineticObsidianTheme.background,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 20),
          onPressed: widget.onBack,
        ),
        title: Text(widget.venue['name'] ?? 'Bron qilish', style: KineticObsidianTheme.headlineMd),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // ─── Pitch Specs Bar ────────────────────────────────────
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: KineticObsidianTheme.glassCardDecoration(),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _buildSpecItem(Icons.crop_square, 'FORMAT', widget.venue['format'] ?? '7x7'),
                          _buildSpecItem(Icons.lightbulb, 'YORITISH', 'LED PRO'),
                          _buildSpecItem(Icons.shower, 'DUSH', 'Mavjud'),
                          _buildSpecItem(Icons.local_parking, 'PARKOVKA', 'Bepul'),
                        ],
                      ),
                    ),

                    const SizedBox(height: 24),
                    const Text('SANA TANLANG', style: KineticObsidianTheme.telemetryLabel),
                    const SizedBox(height: 12),

                    // ─── Date Horizontal Scroller ───────────────────────────
                    SizedBox(
                      height: 48,
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        itemCount: _days.length,
                        itemBuilder: (context, i) {
                          final selected = _selectedDateIndex == i;
                          return GestureDetector(
                            onTap: () => setState(() => _selectedDateIndex = i),
                            child: Container(
                              margin: const EdgeInsets.only(right: 10),
                              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                              decoration: BoxDecoration(
                                color: selected ? KineticObsidianTheme.neonTurf : KineticObsidianTheme.surfaceHigh,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: selected ? KineticObsidianTheme.neonTurf : KineticObsidianTheme.borderSubtle),
                              ),
                              child: Text(
                                _days[i],
                                style: TextStyle(
                                  color: selected ? Colors.black : Colors.white,
                                  fontWeight: selected ? FontWeight.w800 : FontWeight.w500,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),

                    const SizedBox(height: 28),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('VAQT MATRIXI (SLOTLAR)', style: KineticObsidianTheme.telemetryLabel),
                        Row(
                          children: [
                            Container(width: 8, height: 8, decoration: const BoxDecoration(color: KineticObsidianTheme.surgeGold, shape: BoxShape.circle)),
                            const SizedBox(width: 4),
                            const Text('Peak vaqt', style: TextStyle(color: KineticObsidianTheme.surgeGold, fontSize: 10, fontFamily: 'JetBrainsMono')),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // ─── Slot Segmented Grid ────────────────────────────────
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                        childAspectRatio: 2.8,
                      ),
                      itemCount: _slots.length,
                      itemBuilder: (context, idx) {
                        final s = _slots[idx];
                        final isSelected = _selectedSlot == s['time'];
                        final isAvailable = s['isAvailable'] as bool;
                        final isPeak = s['isPeak'] as bool;

                        return GestureDetector(
                          onTap: isAvailable ? () => setState(() => _selectedSlot = s['time']) : null,
                          child: Container(
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? KineticObsidianTheme.neonTurf
                                  : (isAvailable ? KineticObsidianTheme.surfaceHigh.withOpacity(0.8) : Colors.black26),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: isSelected
                                    ? KineticObsidianTheme.neonTurf
                                    : (isPeak && isAvailable ? KineticObsidianTheme.surgeGold.withOpacity(0.6) : KineticObsidianTheme.borderSubtle),
                                width: isSelected ? 2 : 1,
                              ),
                              boxShadow: isSelected
                                  ? [BoxShadow(color: KineticObsidianTheme.neonTurf.withOpacity(0.35), blurRadius: 16, spreadRadius: 1)]
                                  : null,
                            ),
                            padding: const EdgeInsets.symmetric(horizontal: 14),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  s['time'],
                                  style: TextStyle(
                                    color: isSelected
                                        ? Colors.black
                                        : (isAvailable ? Colors.white : Colors.white24),
                                    fontWeight: isSelected ? FontWeight.w900 : FontWeight.w600,
                                    fontSize: 13,
                                    fontFamily: 'JetBrainsMono',
                                  ),
                                ),
                                if (!isAvailable)
                                  const Text('BAND', style: TextStyle(color: Colors.redAccent, fontSize: 10, fontWeight: FontWeight.bold))
                                else if (isPeak)
                                  Icon(Icons.bolt, color: isSelected ? Colors.black : KineticObsidianTheme.surgeGold, size: 16),
                              ],
                            ),
                          ),
                        );
                      },
                    ),

                    const SizedBox(height: 28),

                    // ─── Financial Breakdown Card ───────────────────────────
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: KineticObsidianTheme.glassCardDecoration(isActive: _selectedSlot != null),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Maydon ijarasi (1 soat):', style: TextStyle(color: KineticObsidianTheme.textMuted, fontSize: 13)),
                              Text('${hourlyRate.toInt()} UZS', style: const TextStyle(color: Colors.white, fontFamily: 'JetBrainsMono', fontWeight: FontWeight.w600)),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: const [
                              Text('Platforma xizmati:', style: TextStyle(color: KineticObsidianTheme.textMuted, fontSize: 13)),
                              Text('10 000 UZS', style: TextStyle(color: KineticObsidianTheme.neonTurf, fontFamily: 'JetBrainsMono', fontWeight: FontWeight.bold)),
                            ],
                          ),
                          const Divider(color: KineticObsidianTheme.borderSubtle, height: 24),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('JAMI TO\'LOV:', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                              Text(
                                '${totalAmount.toInt()} UZS',
                                style: const TextStyle(color: KineticObsidianTheme.neonTurfBright, fontSize: 18, fontWeight: FontWeight.w900, fontFamily: 'JetBrainsMono'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // ─── Bottom Hold Bar ───────────────────────────────────────────
            Container(
              padding: const EdgeInsets.all(20),
              decoration: const BoxDecoration(
                color: KineticObsidianTheme.surfaceLowest,
                border: Border(top: BorderSide(color: KineticObsidianTheme.borderSubtle)),
              ),
              child: GestureDetector(
                onTap: (_selectedSlot != null && !_isProcessing)
                    ? () {
                        setState(() => _isProcessing = true);
                        Future.delayed(const Duration(milliseconds: 600), () {
                          setState(() => _isProcessing = false);
                          widget.onConfirm(_selectedSlot!, totalAmount);
                        });
                      }
                    : null,
                child: Container(
                  width: double.infinity,
                  height: 52,
                  decoration: BoxDecoration(
                    color: _selectedSlot != null ? KineticObsidianTheme.neonTurf : Colors.grey.shade800,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: _selectedSlot != null
                        ? [BoxShadow(color: KineticObsidianTheme.neonTurf.withOpacity(0.35), blurRadius: 20)]
                        : null,
                  ),
                  child: Center(
                    child: _isProcessing
                        ? const CircularProgressIndicator(color: Colors.black, strokeWidth: 2)
                        : Text(
                            _selectedSlot != null ? 'SLOTNI BRON QILISH VA TO\'LASH' : 'ILTIMOS VAQTNI TANLANG',
                            style: TextStyle(
                              color: _selectedSlot != null ? Colors.black : Colors.white38,
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.5,
                            ),
                          ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSpecItem(IconData icon, String label, String value) {
    return Column(
      children: [
        Icon(icon, color: KineticObsidianTheme.neonTurf, size: 20),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(color: KineticObsidianTheme.textMuted, fontSize: 9, letterSpacing: 0.5)),
        const SizedBox(height: 2),
        Text(value, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
      ],
    );
  }
}
