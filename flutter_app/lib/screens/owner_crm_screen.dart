import 'package:flutter/material.dart';
import '../theme/kinetic_obsidian_theme.dart';

class OwnerCrmScreen extends StatefulWidget {
  const OwnerCrmScreen({super.key});

  @override
  State<OwnerCrmScreen> createState() => _OwnerCrmScreenState();
}

class _OwnerCrmScreenState extends State<OwnerCrmScreen> {
  bool _surgePricingActive = false;
  final Map<String, bool> _slotLocks = {
    '16:00': false,
    '17:00': false,
    '18:00': true, // locked
    '19:00': false,
    '20:00': false,
    '21:00': false,
    '22:00': false,
    '23:00': false,
  };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: KineticObsidianTheme.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text('OWNER CRM', style: KineticObsidianTheme.headlineMd),
                      SizedBox(height: 2),
                      Text('SLOT MATRIX & DAROMAD', style: KineticObsidianTheme.telemetryLabel),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: KineticObsidianTheme.badgeDecoration(),
                    child: Row(
                      children: [
                        Container(width: 6, height: 6, decoration: const BoxDecoration(color: KineticObsidianTheme.neonTurf, shape: BoxShape.circle)),
                        const SizedBox(width: 6),
                        const Text('REDIS LIVE', style: TextStyle(color: KineticObsidianTheme.neonTurf, fontSize: 10, fontWeight: FontWeight.bold, fontFamily: 'JetBrainsMono')),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 24),

              // Revenue Telemetry Card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: KineticObsidianTheme.glassCardDecoration(isActive: true),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('BUGUNGI SOF TUSHUM', style: TextStyle(color: KineticObsidianTheme.textMuted, fontSize: 11, letterSpacing: 0.5)),
                    const SizedBox(height: 6),
                    const Text('1 420 000 UZS', style: TextStyle(color: KineticObsidianTheme.neonTurfBright, fontSize: 26, fontWeight: FontWeight.w900, fontFamily: 'JetBrainsMono')),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: const [
                        Text('Band qilingan slotlar:', style: TextStyle(color: Colors.white70, fontSize: 13)),
                        Text('8 / 10 slot (80%)', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontFamily: 'JetBrainsMono')),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Surge pricing switch card
              Container(
                padding: const EdgeInsets.all(18),
                decoration: KineticObsidianTheme.glassCardDecoration(isSurge: _surgePricingActive),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('SURGE DINAMIK NARX', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                        const SizedBox(height: 4),
                        Text(
                          _surgePricingActive ? '+20% peak vaqt stavkasi yoqilgan' : 'Standart narxlar o\'rnatilgan',
                          style: TextStyle(color: _surgePricingActive ? KineticObsidianTheme.surgeGold : KineticObsidianTheme.textMuted, fontSize: 11),
                        ),
                      ],
                    ),
                    Switch(
                      value: _surgePricingActive,
                      activeColor: KineticObsidianTheme.surgeGold,
                      onChanged: (val) => setState(() => _surgePricingActive = val),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 28),
              const Text('SLOTLARNI BOSHQARISH MATRIXI', style: KineticObsidianTheme.telemetryLabel),
              const SizedBox(height: 12),

              // Interactive Slot Grid (Click to lock/unlock)
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 2.6,
                ),
                itemCount: _slotLocks.keys.length,
                itemBuilder: (context, i) {
                  final slotTime = _slotLocks.keys.elementAt(i);
                  final isLocked = _slotLocks[slotTime]!;

                  return GestureDetector(
                    onTap: () {
                      setState(() {
                        _slotLocks[slotTime] = !isLocked;
                      });
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      decoration: BoxDecoration(
                        color: isLocked ? Colors.red.withOpacity(0.15) : KineticObsidianTheme.surfaceHigh,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isLocked ? Colors.redAccent.withOpacity(0.6) : KineticObsidianTheme.borderActive,
                          width: 1.2,
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            slotTime,
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontFamily: 'JetBrainsMono', fontSize: 14),
                          ),
                          Icon(
                            isLocked ? Icons.lock : Icons.lock_open,
                            color: isLocked ? Colors.redAccent : KineticObsidianTheme.neonTurf,
                            size: 18,
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
