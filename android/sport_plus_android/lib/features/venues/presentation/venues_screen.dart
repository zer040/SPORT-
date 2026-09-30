import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/services/api_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/glass_container.dart';

class VenuesScreen extends StatefulWidget {
  const VenuesScreen({super.key});

  @override
  State<VenuesScreen> createState() => _VenuesScreenState();
}

class _VenuesScreenState extends State<VenuesScreen> {
  final ApiService _api = ApiService();
  final TextEditingController _searchController = TextEditingController();

  List<dynamic> _venues = [];
  bool _isLoading = true;
  String? _selectedDistrict;

  final List<String> _districts = [
    'Barchasi',
    'Chilonzor',
    'Yunusobod',
    'Mirobod',
    'Yakkasaroy',
    'Jizzax',
  ];

  @override
  void initState() {
    super.initState();
    _fetchVenues();
  }

  Future<void> _fetchVenues() async {
    setState(() => _isLoading = true);
    try {
      final res = await _api.dio.get('/venues?lat=41.2858&lon=69.2163&radius_km=25');
      setState(() {
        _venues = res.data ?? [];
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: _fetchVenues,
          color: AppTheme.primary,
          child: CustomScrollView(
            slivers: [
              // Header & Search
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: const [
                              Text(
                                'Toshkent & Jizzax',
                                style: TextStyle(
                                  color: AppTheme.primary,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              SizedBox(height: 2),
                              Text(
                                'Futbol Maydonlari',
                                style: TextStyle(
                                  fontSize: 26,
                                  fontWeight: FontWeight.bold,
                                  color: AppTheme.textPrimary,
                                ),
                              ),
                            ],
                          ),
                          GlassContainer(
                            borderRadius: 16,
                            padding: const EdgeInsets.all(10),
                            child: const Icon(
                              Icons.map_rounded,
                              color: AppTheme.primary,
                              size: 20,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      // Search Bar
                      GlassContainer(
                        borderRadius: 18,
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                        child: TextField(
                          controller: _searchController,
                          decoration: const InputDecoration(
                            border: InputBorder.none,
                            hintText: 'Maydon nomi yoki manzil...',
                            hintStyle: TextStyle(
                              color: AppTheme.textMuted,
                              fontSize: 14,
                            ),
                            icon: Icon(Icons.search, color: AppTheme.textSecondary),
                          ),
                          onChanged: (_) => setState(() {}),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // District Chips
              SliverToBoxAdapter(
                child: SizedBox(
                  height: 40,
                  child: ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    scrollDirection: Axis.horizontal,
                    itemCount: _districts.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (context, index) {
                      final district = _districts[index];
                      final isSelected = (district == 'Barchasi' && _selectedDistrict == null) ||
                          (_selectedDistrict == district);

                      return GestureDetector(
                        onTap: () {
                          HapticFeedback.selectionClick();
                          setState(() {
                            _selectedDistrict = district == 'Barchasi' ? null : district;
                          });
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          decoration: BoxDecoration(
                            color: isSelected ? AppTheme.primary : Colors.white.withOpacity(0.8),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: isSelected ? Colors.transparent : Colors.black.withOpacity(0.06),
                            ),
                          ),
                          child: Text(
                            district,
                            style: TextStyle(
                              color: isSelected ? Colors.white : AppTheme.textSecondary,
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ),

              const SliverToBoxAdapter(child: SizedBox(height: 16)),

              // Venues List
              if (_isLoading)
                const SliverFillRemaining(
                  child: Center(
                    child: CircularProgressIndicator(color: AppTheme.primary),
                  ),
                )
              else if (_venues.isEmpty)
                SliverFillRemaining(
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: const [
                        Icon(Icons.sports_soccer, size: 48, color: AppTheme.textMuted),
                        SizedBox(height: 12),
                        Text(
                          'Maydonlar topilmadi',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.textPrimary,
                          ),
                        ),
                      ],
                    ),
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 120),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final venue = _venues[index];
                        final name = venue['name'] ?? 'Maydon';
                        final address = venue['address'] ?? 'Toshkent';
                        final distance = venue['distance_km'];
                        final rating = venue['rating'] ?? 4.8;
                        final price = venue['min_price_per_hour'] ?? 200000;

                        return Padding(
                          padding: const EdgeInsets.only(bottom: 16),
                          child: GlassContainer(
                            borderRadius: 22,
                            padding: const EdgeInsets.all(16),
                            onTap: () {
                              HapticFeedback.lightImpact();
                            },
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Placeholder banner
                                Container(
                                  height: 130,
                                  width: double.infinity,
                                  decoration: BoxDecoration(
                                    color: AppTheme.surfaceSecondary,
                                    borderRadius: BorderRadius.circular(16),
                                  ),
                                  child: Stack(
                                    children: [
                                      const Center(
                                        child: Icon(
                                          Icons.stadium_rounded,
                                          size: 48,
                                          color: AppTheme.textMuted,
                                        ),
                                      ),
                                      if (distance != null)
                                        Positioned(
                                          top: 10,
                                          right: 10,
                                          child: Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                            decoration: BoxDecoration(
                                              color: Colors.white.withOpacity(0.9),
                                              borderRadius: BorderRadius.circular(12),
                                            ),
                                            child: Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                const Icon(Icons.location_on, size: 12, color: AppTheme.primary),
                                                const SizedBox(width: 4),
                                                Text(
                                                  '${distance.toStringAsFixed(1)} km',
                                                  style: const TextStyle(
                                                    fontSize: 12,
                                                    fontWeight: FontWeight.bold,
                                                    color: AppTheme.textPrimary,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 12),

                                // Title and Rating
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            name,
                                            style: const TextStyle(
                                              fontSize: 17,
                                              fontWeight: FontWeight.bold,
                                              color: AppTheme.textPrimary,
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            address,
                                            style: const TextStyle(
                                              fontSize: 13,
                                              color: AppTheme.textSecondary,
                                            ),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ],
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Row(
                                        children: [
                                          const Icon(Icons.star, size: 14, color: AppTheme.warning),
                                          const SizedBox(width: 4),
                                          Text(
                                            '$rating',
                                            style: const TextStyle(
                                              fontSize: 13,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),

                                const Divider(height: 24, thickness: 0.5),

                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      '$price so‘m / soat',
                                      style: const TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.bold,
                                        color: AppTheme.primary,
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                                      decoration: BoxDecoration(
                                        color: AppTheme.primary,
                                        borderRadius: BorderRadius.circular(14),
                                      ),
                                      child: const Text(
                                        'Bron qilish',
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                      childCount: _venues.length,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
