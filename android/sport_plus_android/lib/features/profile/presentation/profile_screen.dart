import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/services/api_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/glass_container.dart';
import '../../auth/presentation/login_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

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
              const SizedBox(height: 20),

              // Avatar & Name
              Container(
                width: 84,
                height: 84,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    colors: [AppTheme.primaryLight, AppTheme.primary],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: const Center(
                  child: Text(
                    'JD',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 30,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              const Text(
                'Jasur Davronov',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                '+998 90 123 45 67',
                style: TextStyle(
                  fontSize: 14,
                  color: AppTheme.textSecondary,
                ),
              ),
              const SizedBox(height: 24),

              // Karma / Reliability Badge Card
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: GlassContainer(
                  borderRadius: 22,
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Stack(
                        alignment: Alignment.center,
                        children: [
                          SizedBox(
                            width: 58,
                            height: 58,
                            child: CircularProgressIndicator(
                              value: 0.98,
                              strokeWidth: 5,
                              backgroundColor: AppTheme.primary.withOpacity(0.15),
                              valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.primary),
                            ),
                          ),
                          const Text(
                            '98%',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.primary,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  'Ishonchlilik Darajasi',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 15,
                                    color: AppTheme.textPrimary,
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: AppTheme.primary.withOpacity(0.12),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Text(
                                    'PRO',
                                    style: TextStyle(
                                      color: AppTheme.primary,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 10,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              'O‘yinlarga o‘z vaqtida kelgan va doim faol qatnashgan futbolchi.',
                              style: TextStyle(
                                fontSize: 12,
                                color: AppTheme.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Stats Row
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  children: [
                    _statItem(icon: Icons.sports_soccer, title: 'O‘yinlar', value: '32'),
                    const SizedBox(width: 12),
                    _statItem(icon: Icons.thumb_up_alt_rounded, title: 'Fair Play', value: '4.9 ★'),
                    const SizedBox(width: 12),
                    _statItem(icon: Icons.emoji_events_rounded, title: 'Reyting', value: '#14'),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Settings List
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  children: [
                    _settingsTile(icon: Icons.notifications_rounded, title: 'Bildirishnomalar'),
                    const SizedBox(height: 10),
                    _settingsTile(icon: Icons.security_rounded, title: 'Xavfsizlik va Maxfiylik'),
                    const SizedBox(height: 10),
                    _settingsTile(icon: Icons.language_rounded, title: 'Til: O‘zbekcha'),
                    const SizedBox(height: 16),
                    GlassContainer(
                      borderRadius: 18,
                      padding: const EdgeInsets.all(16),
                      onTap: () async {
                        HapticFeedback.mediumImpact();
                        await ApiService().clearToken();
                        if (context.mounted) {
                          Navigator.of(context).pushReplacement(
                            MaterialPageRoute(builder: (_) => const LoginScreen()),
                          );
                        }
                      },
                      child: Row(
                        children: const [
                          Icon(Icons.logout_rounded, color: AppTheme.danger),
                          SizedBox(width: 12),
                          Text(
                            'Tizimdan chiqish',
                            style: TextStyle(
                              color: AppTheme.danger,
                              fontWeight: FontWeight.w600,
                              fontSize: 15,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _statItem({required IconData icon, required String title, required String value}) {
    return Expanded(
      child: GlassContainer(
        borderRadius: 18,
        padding: const EdgeInsets.all(14),
        child: Column(
          children: [
            Icon(icon, color: AppTheme.primary, size: 20),
            const SizedBox(height: 6),
            Text(
              value,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              title,
              style: const TextStyle(
                fontSize: 11,
                color: AppTheme.textMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _settingsTile({required IconData icon, required String title}) {
    return GlassContainer(
      borderRadius: 18,
      padding: const EdgeInsets.all(16),
      onTap: () => HapticFeedback.lightImpact(),
      child: Row(
        children: [
          Icon(icon, color: AppTheme.primary, size: 20),
          const SizedBox(width: 12),
          Text(
            title,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w500,
              color: AppTheme.textPrimary,
            ),
          ),
          const Spacer(),
          const Icon(Icons.arrow_forward_ios, size: 14, color: AppTheme.textMuted),
        ],
      ),
    );
  }
}
