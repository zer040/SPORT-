import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../core/services/api_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/glass_container.dart';
import '../../auth/presentation/login_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _notifications = true;
  bool _ownerMode = false;
  final String _walletBalance = '50,000';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        bottom: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 130),
          child: Column(
            children: [
              // 1. O'yinchi Pasporti (Identity Card)
              GlassContainer(
                borderRadius: 24,
                padding: const EdgeInsets.all(22),
                child: Column(
                  children: [
                    Container(
                      width: 76,
                      height: 76,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: const LinearGradient(
                          colors: [AppTheme.primaryLight, AppTheme.primary],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: AppTheme.primary.withOpacity(0.3),
                            blurRadius: 10,
                            offset: const Offset(0, 5),
                          ),
                        ],
                      ),
                      child: const Center(
                        child: Text(
                          'S',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 32,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Shohrux Atabullayev',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      '+998 93 768 06 28',
                      style: TextStyle(
                        fontSize: 14,
                        color: AppTheme.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppTheme.primary.withOpacity(0.2)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: const [
                          Icon(Icons.shield, size: 14, color: AppTheme.primary),
                          SizedBox(width: 6),
                          Text(
                            '⚽ Yarim himoyachi • 98.5% Karma',
                            style: TextStyle(
                              color: AppTheme.primary,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // 2. Mini-Statistika (Hub)
              Row(
                children: [
                  _statBox(icon: Icons.sports_soccer, value: '15', label: "O'yinlar"),
                  const SizedBox(width: 10),
                  _statBox(icon: Icons.check_circle_outline, value: '0', label: 'No-Show'),
                  const SizedBox(width: 10),
                  _statBox(icon: Icons.star, value: '4.9', label: 'Reyting'),
                ],
              ),
              const SizedBox(height: 16),

              // 3. Funksional Sozlamalar va Bo'limlar
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.glassShadow,
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    _menuTile(
                      icon: Icons.wallet_rounded,
                      color: const Color(0xFF0284C7),
                      title: 'Mening Hamyonim & Kartalar',
                      subtitle: 'Balans: $_walletBalance so‘m',
                      onTap: () {},
                    ),
                    const Divider(height: 1, indent: 64, color: Color(0xFFF1F5F9)),
                    _menuTile(
                      icon: Icons.people_alt_rounded,
                      color: const Color(0xFF8B5CF6),
                      title: 'Mening Jamoam (Squad)',
                      subtitle: 'FC Bunyodkor Havaskor',
                      onTap: () {},
                    ),
                    const Divider(height: 1, indent: 64, color: Color(0xFFF1F5F9)),
                    _menuTile(
                      icon: Icons.history_rounded,
                      color: Colors.indigo,
                      title: 'O‘yinlar va bronlar tarixi',
                      onTap: () {},
                    ),
                    const Divider(height: 1, indent: 64, color: Color(0xFFF1F5F9)),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      child: Row(
                        children: [
                          _iconBadge(Icons.notifications_rounded, Colors.orange),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: const [
                                Text(
                                  'Bildirishnomalar',
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w600,
                                    color: AppTheme.textPrimary,
                                  ),
                                ),
                                Text(
                                  'Telegram va SMS eslatmalar',
                                  style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                                ),
                              ],
                            ),
                          ),
                          Switch(
                            value: _notifications,
                            onChanged: (val) {
                              HapticFeedback.lightImpact();
                              setState(() => _notifications = val);
                            },
                            activeColor: AppTheme.primary,
                          ),
                        ],
                      ),
                    ),
                    const Divider(height: 1, indent: 64, color: Color(0xFFF1F5F9)),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      child: Row(
                        children: [
                          _iconBadge(Icons.business_rounded, AppTheme.primary),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: const [
                                Text(
                                  'Maydon egasi rejimi',
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w600,
                                    color: AppTheme.textPrimary,
                                  ),
                                ),
                                Text(
                                  'Stadionlar va slotlar boshqaruvi',
                                  style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                                ),
                              ],
                            ),
                          ),
                          Switch(
                            value: _ownerMode,
                            onChanged: (val) {
                              HapticFeedback.lightImpact();
                              setState(() => _ownerMode = val);
                            },
                            activeColor: AppTheme.primary,
                          ),
                        ],
                      ),
                    ),
                    const Divider(height: 1, indent: 64, color: Color(0xFFF1F5F9)),
                    _menuTile(
                      icon: Icons.language_rounded,
                      color: Colors.blueGrey,
                      title: 'Til: O‘zbekcha',
                      onTap: () {},
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // 4. Chiqish tugmasi
              GestureDetector(
                onTap: () async {
                  HapticFeedback.mediumImpact();
                  await ApiService().clearToken();
                  if (context.mounted) {
                    Navigator.of(context).pushReplacement(
                      MaterialPageRoute(builder: (_) => const LoginScreen()),
                    );
                  }
                },
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF2F2),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFFEE2E2)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: const [
                      Icon(Icons.logout_rounded, color: AppTheme.danger, size: 20),
                      SizedBox(width: 8),
                      Text(
                        'Akkountdan chiqish',
                        style: TextStyle(
                          color: AppTheme.danger,
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _statBox({required IconData icon, required String value, required String label}) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Column(
          children: [
            Icon(icon, size: 18, color: AppTheme.textSecondary),
            const SizedBox(height: 4),
            Text(
              value,
              style: const TextStyle(
                fontSize: 19,
                fontWeight: FontWeight.bold,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary),
            ),
          ],
        ),
      ),
    );
  }

  Widget _menuTile({
    required IconData icon,
    required Color color,
    required String title,
    String? subtitle,
    required VoidCallback onTap,
  }) {
    return ListTile(
      leading: _iconBadge(icon, color),
      title: Text(
        title,
        style: const TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.w600,
          color: AppTheme.textPrimary,
        ),
      ),
      subtitle: subtitle != null
          ? Text(subtitle, style: const TextStyle(fontSize: 12, color: AppTheme.textSecondary))
          : null,
      trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: AppTheme.textMuted),
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
    );
  }

  Widget _iconBadge(IconData icon, Color color) {
    return Container(
      width: 34,
      height: 34,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Icon(icon, color: Colors.white, size: 18),
    );
  }
}
