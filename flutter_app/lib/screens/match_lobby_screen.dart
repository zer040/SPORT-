import 'package:flutter/material.dart';
import '../theme/kinetic_obsidian_theme.dart';

class MatchLobbyScreen extends StatefulWidget {
  const MatchLobbyScreen({super.key});

  @override
  State<MatchLobbyScreen> createState() => _MatchLobbyScreenState();
}

class _MatchLobbyScreenState extends State<MatchLobbyScreen> {
  final List<Map<String, dynamic>> _lobbyMatches = [
    {
      'id': 'm1',
      'venue_name': 'Bunyodkor Grand Arena',
      'date_time': 'Bugun, 20:00 - 21:00',
      'format': '7x7',
      'total_slots': 14,
      'joined_slots': 11,
      'price_per_player': 12000,
      'organizer': 'Sardor R.',
      'level': 'HAYVON / PRO',
      'status': 'RECRUITING',
    },
    {
      'id': 'm2',
      'venue_name': 'Paxtakor City Pitch',
      'date_time': 'Bugun, 21:00 - 22:00',
      'format': '5x5',
      'total_slots': 10,
      'joined_slots': 9,
      'price_per_player': 15000,
      'organizer': 'Jasur B.',
      'level': 'HAVASKOR',
      'status': 'LAST_SLOT',
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: KineticObsidianTheme.background,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text('MATCH LOBBY', style: KineticObsidianTheme.headlineMd),
                      SizedBox(height: 2),
                      Text('SOLO O\'YINCHILAR VA SPLIT TO\'LOV', style: KineticObsidianTheme.telemetryLabel),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: KineticObsidianTheme.badgeDecoration(color: KineticObsidianTheme.surgeGold),
                    child: const Text('ESCROW ACTIVE', style: TextStyle(color: KineticObsidianTheme.surgeGold, fontSize: 10, fontWeight: FontWeight.bold, fontFamily: 'JetBrainsMono')),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.all(20),
                itemCount: _lobbyMatches.length,
                itemBuilder: (context, i) {
                  final m = _lobbyMatches[i];
                  final remaining = (m['total_slots'] as int) - (m['joined_slots'] as int);
                  return Container(
                    margin: const EdgeInsets.only(bottom: 20),
                    padding: const EdgeInsets.all(20),
                    decoration: KineticObsidianTheme.glassCardDecoration(isActive: remaining == 1, isSurge: remaining > 1),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(m['venue_name'], style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.bold)),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(color: KineticObsidianTheme.surfaceHigh, borderRadius: BorderRadius.circular(8)),
                              child: Text(m['format'], style: const TextStyle(color: KineticObsidianTheme.neonTurf, fontSize: 11, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            const Icon(Icons.access_time, color: KineticObsidianTheme.textMuted, size: 14),
                            const SizedBox(width: 4),
                            Text(m['date_time'], style: const TextStyle(color: KineticObsidianTheme.textMuted, fontSize: 13)),
                          ],
                        ),
                        const SizedBox(height: 16),
                        // Progress bar of players
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('Tarkib: ${m['joined_slots']} / ${m['total_slots']} o\'yinchi', style: const TextStyle(color: Colors.white, fontSize: 12)),
                                Text('$remaining ta joy qoldi', style: TextStyle(color: remaining == 1 ? Colors.amberAccent : KineticObsidianTheme.neonTurf, fontSize: 11, fontWeight: FontWeight.bold)),
                              ],
                            ),
                            const SizedBox(height: 8),
                            LinearProgressIndicator(
                              value: (m['joined_slots'] as int) / (m['total_slots'] as int),
                              backgroundColor: Colors.white10,
                              valueColor: AlwaysStoppedAnimation<Color>(remaining == 1 ? Colors.amberAccent : KineticObsidianTheme.neonTurf),
                              minHeight: 6,
                              borderRadius: BorderRadius.circular(3),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('O\'YINCHI BOSHI:', style: TextStyle(color: KineticObsidianTheme.textMuted, fontSize: 10, letterSpacing: 0.5)),
                                Text('${m['price_per_player']} UZS', style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900, fontFamily: 'JetBrainsMono')),
                              ],
                            ),
                            ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: KineticObsidianTheme.neonTurf,
                                foregroundColor: Colors.black,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                              ),
                              onPressed: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Muvaffaqiyatli qo\'shildingiz! Telegram botga to\'lov linki yuborildi.')),
                                );
                              },
                              child: const Text('QO\'SHILISH (SPLIT)', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12)),
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
