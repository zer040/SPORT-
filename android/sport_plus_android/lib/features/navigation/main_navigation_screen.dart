import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/glass_container.dart';
import '../bookings/presentation/match_ticket_screen.dart';
import '../matchmaking/presentation/radar_matchmaking_screen.dart';
import '../profile/presentation/profile_screen.dart';
import '../venues/presentation/venues_screen.dart';

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = const [
    VenuesScreen(),
    RadarMatchmakingScreen(),
    MatchTicketScreen(),
    ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: Stack(
        children: [
          // Current Screen
          IndexedStack(
            index: _currentIndex,
            children: _screens,
          ),

          // Floating Glass Bottom Navigation
          Positioned(
            left: 20,
            right: 20,
            bottom: 20,
            child: GlassContainer(
              borderRadius: 28,
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _navItem(0, Icons.sports_soccer, 'Maydonlar'),
                  _navItem(1, Icons.sensors, 'Solo Play'),
                  _navItem(2, Icons.confirmation_number_rounded, 'Chiptalar'),
                  _navItem(3, Icons.person_rounded, 'Profil'),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _navItem(int index, IconData icon, String label) {
    final isSelected = _currentIndex == index;
    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        setState(() => _currentIndex = index);
      },
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primary.withOpacity(0.12) : Colors.transparent,
          borderRadius: BorderRadius.circular(18),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 22,
              color: isSelected ? AppTheme.primary : AppTheme.textSecondary,
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                color: isSelected ? AppTheme.primary : AppTheme.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
