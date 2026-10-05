import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/services/api_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/glass_container.dart';
import '../../navigation/main_navigation_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final ApiService _api = ApiService();
  final TextEditingController _otpController = TextEditingController();

  bool _isLoading = false;
  bool _isWaitingForOtp = false;
  String? _errorMessage;
  String _authToken = '';
  String _deepLink = '';

  Future<void> _startTelegramAuth() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final res = await _api.dio.post('/auth/telegram/init');
      final data = res.data;

      setState(() {
        _authToken = data['auth_token'];
        _deepLink = data['deep_link'] ?? '';
        _isWaitingForOtp = true;
        _isLoading = false;
      });
      HapticFeedback.lightImpact();
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Telegram avtorizatsiyani boshlashda xatolik yuz berdi';
      });
      HapticFeedback.heavyImpact();
    }
  }

  Future<void> _verifyOtp() async {
    if (_otpController.text.length != 6) {
      setState(() => _errorMessage = "6 xonali kodni to'liq kiriting");
      HapticFeedback.mediumImpact();
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final res = await _api.dio.post('/auth/telegram/verify-otp', data: {
        'auth_token': _authToken,
        'code': _otpController.text.trim(),
      });

      final accessToken = res.data['access_token'];
      if (accessToken != null) {
        await _api.saveToken(accessToken);
        HapticFeedback.mediumImpact();
        if (mounted) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => const MainNavigationScreen()),
          );
        }
      } else {
        throw Exception('Token topilmadi');
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Kod noto‘g‘ri yoki muddati tugagan';
      });
      HapticFeedback.heavyImpact();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Logo & Hero
                Container(
                  width: 88,
                  height: 88,
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withOpacity(0.12),
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Image.asset(
                      'assets/images/logo_light.png',
                      width: 52,
                      height: 52,
                      fit: BoxFit.contain,
                      errorBuilder: (context, error, stackTrace) => const Icon(
                        Icons.sports_soccer,
                        size: 44,
                        color: AppTheme.primary,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'SPORT+',
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.textPrimary,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Futbol maydonlarini qulay bron qilish',
                  style: TextStyle(
                    fontSize: 14,
                    color: AppTheme.textSecondary,
                  ),
                ),
                const SizedBox(height: 36),

                // Glassmorphism Card
                GlassContainer(
                  borderRadius: 28.0,
                  padding: const EdgeInsets.all(24.0),
                  child: Column(
                    children: [
                      if (!_isWaitingForOtp) ...[
                        const Text(
                          'Tezkor kirish',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 10),
                        const Text(
                          'SMS kutmasdan, rasmiy Telegram botimiz orqali 6 xonali kod oling.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 14,
                            color: AppTheme.textSecondary,
                            height: 1.4,
                          ),
                        ),
                        const SizedBox(height: 24),
                        GlassPillButton(
                          title: 'Telegram orqali kod olish',
                          icon: Icons.send_rounded,
                          isLoading: _isLoading,
                          onTap: _startTelegramAuth,
                        ),
                      ] else ...[
                        Row(
                          children: [
                            IconButton(
                              icon: const Icon(Icons.arrow_back_ios_new, size: 18),
                              onPressed: () {
                                setState(() {
                                  _isWaitingForOtp = false;
                                  _otpController.clear();
                                });
                              },
                            ),
                            const Expanded(
                              child: Text(
                                'Kodni kiriting',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: AppTheme.textPrimary,
                                ),
                              ),
                            ),
                            const SizedBox(width: 40),
                          ],
                        ),
                        const SizedBox(height: 12),
                        const Text(
                          'Telegram botimizga yuborilgan 6 xonali kod:',
                          style: TextStyle(
                            fontSize: 13,
                            color: AppTheme.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 20),

                        // OTP TextField
                        TextField(
                          controller: _otpController,
                          keyboardType: TextInputType.number,
                          maxLength: 6,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 26,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 10,
                            color: AppTheme.textPrimary,
                          ),
                          decoration: InputDecoration(
                            counterText: '',
                            filled: true,
                            fillColor: Colors.white.withOpacity(0.9),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(16),
                              borderSide: BorderSide(
                                color: AppTheme.primary.withOpacity(0.3),
                              ),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(16),
                              borderSide: const BorderSide(
                                color: AppTheme.primary,
                                width: 2,
                              ),
                            ),
                          ),
                          onChanged: (val) {
                            HapticFeedback.selectionClick();
                            if (val.length == 6) {
                              _verifyOtp();
                            }
                          },
                        ),
                        const SizedBox(height: 12),

                        if (_deepLink.isNotEmpty)
                          TextButton.icon(
                            icon: const Icon(Icons.open_in_new, size: 16),
                            label: const Text('Telegram Botni ochish'),
                            style: TextButton.styleFrom(
                              foregroundColor: AppTheme.primary,
                            ),
                            onPressed: () async {
                              final uri = Uri.parse(_deepLink);
                              if (await canLaunchUrl(uri)) {
                                await launchUrl(uri);
                              }
                            },
                          ),

                        const SizedBox(height: 16),
                        GlassPillButton(
                          title: 'Tasdiqlash',
                          icon: Icons.check_circle_outline,
                          isLoading: _isLoading,
                          onTap: _verifyOtp,
                        ),
                      ],

                      if (_errorMessage != null) ...[
                        const SizedBox(height: 14),
                        Text(
                          _errorMessage!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: AppTheme.danger,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 32),
                const Text(
                  'SPORT+ • Flutter Material 3 Glassmorphism',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppTheme.textMuted,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
