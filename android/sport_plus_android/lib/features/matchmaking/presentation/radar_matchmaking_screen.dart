import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/services/api_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/glass_container.dart';

class RadarMatchmakingScreen extends StatefulWidget {
  const RadarMatchmakingScreen({super.key});

  @override
  State<RadarMatchmakingScreen> createState() => _RadarMatchmakingScreenState();
}

class _RadarMatchmakingScreenState extends State<RadarMatchmakingScreen>
    with SingleTickerProviderStateMixin {
  final ApiService _api = ApiService();
  late final AnimationController _radarController;

  bool _isScanning = false;
  List<dynamic> _lobbies = [];

  @override
  void initState() {
    super.initState();
    _radarController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    );
    _fetchMatches();
  }

  @override
  void dispose() {
    _radarController.dispose();
    super.dispose();
  }

  void _toggleRadar() {
    HapticFeedback.mediumImpact();
    setState(() {
      _isScanning = !_isScanning;
      if (_isScanning) {
        _radarController.repeat();
      } else {
        _radarController.stop();
      }
    });
  }

  Future<void> _fetchMatches() async {
    try {
      final res = await _api.dio.get('/matches?lat=41.2858&lon=69.2163&radius_km=25&status=FORMING');
      setState(() {
        _lobbies = res.data ?? [];
      });
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        bottom: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.only(bottom: 120),
          child: Column(
            children: [
              const SizedBox(height: 16),
              const Text(
                'Solo Play & Radar',
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 6),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 24),
                child: Text(
                  'Yaqin atrofdagi futbol matchlariga qo‘shiling yoki yangi jamoa qidiring.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    color: AppTheme.textSecondary,
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Animated Radar
              SizedBox(
                height: 260,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    // Concentric Rings
                    Container(
                      width: 240,
                      height: 240,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: AppTheme.primary.withOpacity(0.12)),
                      ),
                    ),
                    Container(
                      width: 170,
                      height: 170,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: AppTheme.primary.withOpacity(0.2)),
                      ),
                    ),
                    Container(
                      width: 100,
                      height: 100,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: AppTheme.primary.withOpacity(0.3)),
                      ),
                    ),

                    // Rotating Radar Sweep
                    if (_isScanning)
                      AnimatedBuilder(
                        animation: _radarController,
                        builder: (_, __) {
                          return Transform.rotate(
                            angle: _radarController.value * 2 * math.pi,
                            child: Container(
                              width: 240,
                              height: 240,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                gradient: SweepGradient(
                                  colors: [
                                    AppTheme.primary.withOpacity(0.4),
                                    AppTheme.primary.withOpacity(0.0),
                                  ],
                                  stops: const [0.25, 0.5],
                                ),
                              ),
                            ),
                          );
                        },
                      ),

                    // Center Control
                    GestureDetector(
                      onTap: _toggleRadar,
                      child: Container(
                        width: 74,
                        height: 74,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white,
                          boxShadow: [
                            BoxShadow(
                              color: AppTheme.primary.withOpacity(0.25),
                              blurRadius: 18,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              _isScanning ? Icons.sensors : Icons.play_arrow_rounded,
                              color: AppTheme.primary,
                              size: 26,
                            ),
                            const SizedBox(height: 2),
                            Text(
                              _isScanning ? 'Izlanmoqda' : 'Radar',
                              style: const TextStyle(
                                fontSize: 10,
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

              const SizedBox(height: 24),

              // Active Lobbies
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Ochiq Lobbilar',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    Text(
                      '${_lobbies.length} ta mavjud',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.primary,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),

              if (_lobbies.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: GlassContainer(
                    borderRadius: 18,
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: const [
                        Icon(Icons.info_outline, color: AppTheme.primary),
                        SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'Yaqin atrofda ochilgan matchlar avtomatik yangilanmoqda...',
                            style: TextStyle(
                              fontSize: 13,
                              color: AppTheme.textSecondary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                )
              else
                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  itemCount: _lobbies.length,
                  itemBuilder: (context, index) {
                    final lobby = _lobbies[index];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: GlassContainer(
                        borderRadius: 20,
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  lobby['title'] ?? 'Do‘stona O‘yin',
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.textPrimary,
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: AppTheme.primary.withOpacity(0.12),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Text(
                                    '${lobby['current_players'] ?? 6}/${lobby['players_needed'] ?? 10} o‘yinchi',
                                    style: const TextStyle(
                                      color: AppTheme.primary,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 12,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              '${lobby['venue_name'] ?? 'Mini Arena'} • ${lobby['start_time'] ?? '20:00'}',
                              style: const TextStyle(
                                fontSize: 13,
                                color: AppTheme.textSecondary,
                              ),
                            ),
                            const SizedBox(height: 12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  '${lobby['cost_per_person'] ?? 25000} so‘m / kishi',
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: AppTheme.textPrimary,
                                  ),
                                ),
                                GlassPillButton(
                                  title: 'Qo‘shilish',
                                  onTap: () {
                                    HapticFeedback.lightImpact();
                                  },
                                ),
                              ],
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
