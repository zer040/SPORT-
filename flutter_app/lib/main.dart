import 'package:flutter/material.dart';
import 'theme/kinetic_obsidian_theme.dart';
import 'screens/auth_welcome_screen.dart';
import 'screens/arena_explorer_screen.dart';
import 'screens/booking_slot_screen.dart';
import 'screens/match_lobby_screen.dart';
import 'screens/owner_crm_screen.dart';

void main() {
  runApp(const SportPlusApp());
}

class SportPlusApp extends StatelessWidget {
  const SportPlusApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SPORT+ Arena Booking',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: KineticObsidianTheme.background,
        colorScheme: const ColorScheme.dark(
          primary: KineticObsidianTheme.neonTurf,
          secondary: KineticObsidianTheme.deepEmerald,
          surface: KineticObsidianTheme.surface,
          background: KineticObsidianTheme.background,
        ),
      ),
      home: const MainNavigationShell(),
    );
  }
}

class MainNavigationShell extends StatefulWidget {
  const MainNavigationShell({super.key});

  @override
  State<MainNavigationShell> createState() => _MainNavigationShellState();
}

class _MainNavigationShellState extends State<MainNavigationShell> {
  bool _isAuthenticated = true; // Set default true for preview
  int _currentIndex = 0;
  Map<String, dynamic>? _activeVenueForBooking;

  @override
  Widget build(BuildContext context) {
    if (!_isAuthenticated) {
      return AuthWelcomeScreen(
        onAuthenticated: () => setState(() => _isAuthenticated = true),
      );
    }

    if (_activeVenueForBooking != null) {
      return BookingSlotScreen(
        venue: _activeVenueForBooking!,
        onBack: () => setState(() => _activeVenueForBooking = null),
        onConfirm: (slot, total) {
          setState(() => _activeVenueForBooking = null);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              backgroundColor: KineticObsidianTheme.surfaceHigh,
              content: Text(
                '✅ Bron muvaffaqiyatli band qilindi! ($slot, ${total.toInt()} UZS)',
                style: const TextStyle(color: KineticObsidianTheme.neonTurfBright, fontWeight: FontWeight.bold),
              ),
            ),
          );
        },
      );
    }

    final screens = [
      ArenaExplorerScreen(
        onSelectVenue: (venue) => setState(() => _activeVenueForBooking = venue),
      ),
      const MatchLobbyScreen(),
      const OwnerCrmScreen(),
    ];

    return Scaffold(
      backgroundColor: KineticObsidianTheme.background,
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: KineticObsidianTheme.surfaceLowest,
          border: Border(top: BorderSide(color: KineticObsidianTheme.borderSubtle)),
        ),
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (index) => setState(() => _currentIndex = index),
          backgroundColor: Colors.transparent,
          elevation: 0,
          selectedItemColor: KineticObsidianTheme.neonTurf,
          unselectedItemColor: KineticObsidianTheme.textMuted,
          selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
          unselectedLabelStyle: const TextStyle(fontSize: 11),
          type: BottomNavigationBarType.fixed,
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.explore_outlined),
              activeIcon: Icon(Icons.explore),
              label: 'Maydonlar',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.groups_outlined),
              activeIcon: Icon(Icons.groups),
              label: 'Match Lobby',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.dashboard_outlined),
              activeIcon: Icon(Icons.dashboard),
              label: 'Owner CRM',
            ),
          ],
        ),
      ),
    );
  }
}
