import 'package:flutter/material.dart';
import '../theme/kinetic_obsidian_theme.dart';

class ArenaExplorerScreen extends StatefulWidget {
  final Function(Map<String, dynamic>) onSelectVenue;

  const ArenaExplorerScreen({super.key, required this.onSelectVenue});

  @override
  State<ArenaExplorerScreen> createState() => _ArenaExplorerScreenState();
}

class _ArenaExplorerScreenState extends State<ArenaExplorerScreen> {
  String _selectedCity = 'Toshkent';
  String _selectedFormat = 'ALL';

  final List<Map<String, dynamic>> _venues = [
    {
      'id': '1',
      'name': 'Bunyodkor Grand Arena',
      'district': 'Chilonzor',
      'city': 'Toshkent',
      'format': '7x7',
      'price_per_hour': 140000,
      'rating': 4.9,
      'distance_km': 1.2,
      'image_url': 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
      'available_now': true,
      'lighting': true,
      'shower': true,
    },
    {
      'id': '2',
      'name': 'Paxtakor City Pitch',
      'district': 'Yunusobod',
      'city': 'Toshkent',
      'format': '5x5',
      'price_per_hour': 120000,
      'rating': 4.8,
      'distance_km': 2.8,
      'image_url': 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=800&q=80',
      'available_now': false,
      'lighting': true,
      'shower': true,
    },
    {
      'id': '3',
      'name': 'Jizzax Olimpia Stadium',
      'district': 'Markaz',
      'city': 'Jizzax',
      'format': '11x11',
      'price_per_hour': 200000,
      'rating': 5.0,
      'distance_km': 0.8,
      'image_url': 'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=800&q=80',
      'available_now': true,
      'lighting': true,
      'shower': true,
    },
  ];

  @override
  Widget build(BuildContext context) {
    final filtered = _venues.where((v) {
      if (_selectedCity != 'ALL' && v['city'] != _selectedCity) return false;
      if (_selectedFormat != 'ALL' && v['format'] != _selectedFormat) return false;
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: KineticObsidianTheme.background,
      body: SafeArea(
        child: Column(
          children: [
            // ─── Header & Tactical Radar ───────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text('SPORT+ ARENA', style: KineticObsidianTheme.headlineMd),
                      SizedBox(height: 2),
                      Text('RADAR SCANNER & EXPLORER', style: KineticObsidianTheme.telemetryLabel),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: KineticObsidianTheme.badgeDecoration(),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(width: 8, height: 8, decoration: const BoxDecoration(color: KineticObsidianTheme.neonTurf, shape: BoxShape.circle)),
                        const SizedBox(width: 6),
                        const Text('LIVE TURF', style: TextStyle(color: KineticObsidianTheme.neonTurf, fontSize: 11, fontWeight: FontWeight.w700)),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // ─── Filter Pills ───────────────────────────────────────────────
            SizedBox(
              height: 48,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                children: [
                  _buildFilterPill('Toshkent', _selectedCity == 'Toshkent', () => setState(() => _selectedCity = 'Toshkent')),
                  _buildFilterPill('Jizzax', _selectedCity == 'Jizzax', () => setState(() => _selectedCity = 'Jizzax')),
                  _buildFilterPill('Barcha formatlar', _selectedFormat == 'ALL', () => setState(() => _selectedFormat = 'ALL')),
                  _buildFilterPill('5x5 Mini', _selectedFormat == '5x5', () => setState(() => _selectedFormat = '5x5')),
                  _buildFilterPill('7x7 Standart', _selectedFormat == '7x7', () => setState(() => _selectedFormat = '7x7')),
                  _buildFilterPill('11x11 Katta', _selectedFormat == '11x11', () => setState(() => _selectedFormat = '11x11')),
                ],
              ),
            ),

            const SizedBox(height: 8),

            // ─── Venues Feed ────────────────────────────────────────────────
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                itemCount: filtered.length,
                itemBuilder: (context, index) {
                  final v = filtered[index];
                  return _buildVenueCard(v);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterPill(String label, bool isSelected, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(right: 8, top: 4, bottom: 4),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? KineticObsidianTheme.neonTurf : KineticObsidianTheme.surfaceHigh,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: isSelected ? KineticObsidianTheme.neonTurf : KineticObsidianTheme.borderSubtle),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.black : Colors.white,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
            fontSize: 12,
          ),
        ),
      ),
    );
  }

  Widget _buildVenueCard(Map<String, dynamic> v) {
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      decoration: KineticObsidianTheme.glassCardDecoration(isActive: v['available_now'] == true),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Banner Image with Format Chip
          Stack(
            children: [
              Image.network(
                v['image_url'],
                height: 160,
                width: double.infinity,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(height: 160, color: KineticObsidianTheme.surfaceHigh),
              ),
              Positioned(
                top: 12,
                left: 12,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.75),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: KineticObsidianTheme.borderSubtle),
                  ),
                  child: Text('${v['format']} FORMAT', style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              ),
              Positioned(
                top: 12,
                right: 12,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: v['available_now'] ? KineticObsidianTheme.neonTurf : Colors.grey.shade800,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    v['available_now'] ? 'BO\'SH SLOT' : 'BAND',
                    style: TextStyle(
                      color: v['available_now'] ? Colors.black : Colors.white70,
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ),
            ],
          ),

          Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        v['name'],
                        style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w700),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Row(
                      children: [
                        const Icon(Icons.star, color: KineticObsidianTheme.surgeGold, size: 16),
                        const SizedBox(width: 4),
                        Text('${v['rating']}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  '${v['district']}, ${v['city']} • ${v['distance_km']} km masofada',
                  style: const TextStyle(color: KineticObsidianTheme.textMuted, fontSize: 13),
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('1 SOAT UCHUN:', style: TextStyle(color: KineticObsidianTheme.textMuted, fontSize: 10, letterSpacing: 0.5)),
                        const SizedBox(height: 2),
                        Text(
                          '${v['price_per_hour'].toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]} ')} UZS',
                          style: const TextStyle(color: KineticObsidianTheme.neonTurf, fontSize: 16, fontWeight: FontWeight.w900, fontFamily: 'JetBrainsMono'),
                        ),
                      ],
                    ),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: KineticObsidianTheme.neonTurf,
                        foregroundColor: Colors.black,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                        elevation: 0,
                      ),
                      onPressed: () => widget.onSelectVenue(v),
                      child: const Text('BRON QILISH', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12, letterSpacing: 0.5)),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
