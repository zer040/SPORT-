import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../core/services/api_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../navigation/main_navigation_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with TickerProviderStateMixin {
  final ApiService _api = ApiService();
  final TextEditingController _otpController = TextEditingController();
  final FocusNode _otpFocus = FocusNode();

  bool _isLoading = false;
  bool _isWaitingForOtp = false;
  String? _errorMessage;
  String _authToken = '';
  String _deepLink = '';

  late AnimationController _shakeController;

  @override
  void initState() {
    super.initState();
    _shakeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
  }

  @override
  void dispose() {
    _otpController.dispose();
    _otpFocus.dispose();
    _shakeController.dispose();
    super.dispose();
  }

  Future<void> _startTelegramAuth() async {
    HapticFeedback.heavyImpact();
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      dynamic data;
      try {
        final res = await _api.dio.post('/auth/telegram/init');
        data = res.data;
        _authToken = data['auth_token'] ?? '';
        _deepLink = data['deep_link'] ?? '';
      } catch (_) {
        final res2 = await _api.dio.post('/auth/telegram-start');
        data = res2.data;
        _authToken = data['session_id'] ?? '';
        _deepLink = data['deep_link'] ?? '';
      }

      setState(() {
        _isWaitingForOtp = true;
        _isLoading = false;
      });

      // Telegram botini avtomatik ochish
      await _openTelegram();

      // OTP inputga focus
      Future.delayed(const Duration(milliseconds: 300), () {
        _otpFocus.requestFocus();
      });
    } catch (e) {
      HapticFeedback.heavyImpact();
      setState(() {
        _isLoading = false;
        _errorMessage = 'Ulanishda xatolik. Qayta urining.';
      });
      _shakeController.forward(from: 0);
    }
  }

  Future<void> _openTelegram() async {
    if (_deepLink.isEmpty && _authToken.isEmpty) return;
    try {
      if (_deepLink.isNotEmpty) {
        final tgUri = Uri.parse(_deepLink);
        if (await canLaunchUrl(tgUri)) {
          await launchUrl(tgUri, mode: LaunchMode.externalApplication);
          return;
        }
      }
    } catch (_) {}

    // Fallback: Web havola orqali ochish
    try {
      final fallbackUrl = 'https://t.me/sport_plus_uz_bot?start=auth_$_authToken';
      final webUri = Uri.parse(fallbackUrl);
      await launchUrl(webUri, mode: LaunchMode.externalApplication);
    } catch (_) {}
  }

  Future<void> _verifyOtp() async {
    if (_otpController.text.length != 6) {
      HapticFeedback.mediumImpact();
      setState(() => _errorMessage = '6 xonali kodni kiriting');
      _shakeController.forward(from: 0);
      return;
    }

    HapticFeedback.lightImpact();
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final enteredCode = _otpController.text.trim();

    try {
      dynamic resData;

      // 1-urinish: /auth/telegram/verify-otp (TelegramAuthService)
      try {
        final res = await _api.dio.post('/auth/telegram/verify-otp', data: {
          'auth_token': _authToken,
          'code': enteredCode,
        });
        resData = res.data;
      } catch (_) {
        // 2-urinish: /auth/verify-telegram-otp (Direct bot OTP fallback)
        final res2 = await _api.dio.post('/auth/verify-telegram-otp', data: {
          'code': enteredCode,
        });
        resData = res2.data;
      }

      final accessToken = resData?['access_token'];
      if (accessToken != null) {
        await _api.saveToken(accessToken);
        HapticFeedback.mediumImpact();
        if (mounted) {
          Navigator.of(context).pushReplacement(
            PageRouteBuilder(
              pageBuilder: (_, __, ___) => const MainNavigationScreen(),
              transitionsBuilder: (_, anim, __, child) => FadeTransition(
                opacity: anim,
                child: child,
              ),
              transitionDuration: const Duration(milliseconds: 400),
            ),
          );
        }
      } else {
        throw Exception('Token topilmadi');
      }
    } catch (e) {
      HapticFeedback.heavyImpact();
      setState(() {
        _isLoading = false;
        _errorMessage = 'Kod noto\'g\'ri yoki muddati tugagan';
      });
      _otpController.clear();
      _shakeController.forward(from: 0);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isKeyboardOpen = MediaQuery.of(context).viewInsets.bottom > 0;

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                physics: const ClampingScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  children: [
                    SizedBox(height: isKeyboardOpen ? 16 : 48),

                    // ─── Logo & Brand ───────────────────────────
                    _buildBrand(isKeyboardOpen),

                    SizedBox(height: isKeyboardOpen ? 20 : 40),

                    // ─── Action Card ────────────────────────────
                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 300),
                      transitionBuilder: (child, anim) => SlideTransition(
                        position: Tween<Offset>(
                          begin: const Offset(0.05, 0),
                          end: Offset.zero,
                        ).animate(CurvedAnimation(parent: anim, curve: Curves.easeOutCubic)),
                        child: FadeTransition(opacity: anim, child: child),
                      ),
                      child: _isWaitingForOtp
                          ? _buildOtpCard()
                          : _buildInitCard(),
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),

            // ─── Footer ─────────────────────────────────────────
            if (!isKeyboardOpen)
              Padding(
                padding: const EdgeInsets.only(bottom: 24),
                child: TextButton(
                  onPressed: () {},
                  child: const Text(
                    'Foydalanish shartlari',
                    style: TextStyle(
                      color: AppTheme.textMuted,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildBrand(bool isKeyboardOpen) {
    return Column(
      children: [
        // Logo badge
        AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          width: isKeyboardOpen ? 60 : 88,
          height: isKeyboardOpen ? 60 : 88,
          decoration: BoxDecoration(
            color: const Color(0xFFECFDF5),
            borderRadius: BorderRadius.circular(isKeyboardOpen ? 18 : 28),
            border: Border.all(
              color: const Color(0xFFA7F3D0),
              width: 1.5,
            ),
          ),
          child: Center(
            child: Image.asset(
              'assets/images/logo_light.png',
              width: isKeyboardOpen ? 36 : 52,
              height: isKeyboardOpen ? 36 : 52,
              fit: BoxFit.contain,
              errorBuilder: (_, __, ___) => Text(
                'S+',
                style: TextStyle(
                  fontSize: isKeyboardOpen ? 22 : 32,
                  fontWeight: FontWeight.w900,
                  color: AppTheme.primary,
                  letterSpacing: -1,
                ),
              ),
            ),
          ),
        ),

        const SizedBox(height: 12),

        Text(
          'SPORT+',
          style: TextStyle(
            fontSize: isKeyboardOpen ? 22 : 28,
            fontWeight: FontWeight.w800,
            color: AppTheme.textPrimary,
            letterSpacing: -0.8,
          ),
        ),
      ],
    );
  }

  Widget _buildInitCard() {
    return _buildCard(
      key: const ValueKey('init'),
      child: Column(
        children: [
          _buildTelegramButton(),
          if (_errorMessage != null) ...[
            const SizedBox(height: 12),
            _buildErrorBadge(_errorMessage!),
          ],
        ],
      ),
    );
  }

  Widget _buildOtpCard() {
    return _buildCard(
      key: const ValueKey('otp'),
      child: Column(
        children: [
          // Header row
          Row(
            children: [
              GestureDetector(
                onTap: () {
                  HapticFeedback.selectionClick();
                  setState(() {
                    _isWaitingForOtp = false;
                    _otpController.clear();
                    _errorMessage = null;
                  });
                },
                child: Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: AppTheme.surfaceSecondary,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.arrow_back_ios_new_rounded,
                    size: 16,
                    color: AppTheme.textSecondary,
                  ),
                ),
              ),
              const Expanded(
                child: Text(
                  'Kodni kiriting',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary,
                  ),
                ),
              ),
              const SizedBox(width: 36),
            ],
          ),

          const SizedBox(height: 20),

          // OTP Input
          TextField(
            controller: _otpController,
            focusNode: _otpFocus,
            keyboardType: TextInputType.number,
            maxLength: 6,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w800,
              letterSpacing: 12,
              color: AppTheme.textPrimary,
            ),
            decoration: InputDecoration(
              counterText: '',
              filled: true,
              fillColor: AppTheme.surfaceSecondary,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide.none,
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(
                  color: AppTheme.primary,
                  width: 1.5,
                ),
              ),
              hintText: '_ _ _ _ _ _',
              hintStyle: const TextStyle(
                color: AppTheme.textMuted,
                fontSize: 22,
                letterSpacing: 8,
              ),
            ),
            onChanged: (val) {
              HapticFeedback.selectionClick();
              if (val.length == 6) _verifyOtp();
            },
          ),

          const SizedBox(height: 16),

          // Telegram bot link
          if (_deepLink.isNotEmpty || _authToken.isNotEmpty)
            GestureDetector(
              onTap: _openTelegram,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFBFDBFE)),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.send_rounded, size: 14, color: Color(0xFF3B82F6)),
                    SizedBox(width: 8),
                    Text(
                      'Telegram botni ochish',
                      style: TextStyle(
                        color: Color(0xFF3B82F6),
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),

          const SizedBox(height: 16),

          // Verify button
          _buildActionButton(
            label: 'Tasdiqlash',
            icon: Icons.check_rounded,
            onTap: _verifyOtp,
          ),

          if (_errorMessage != null) ...[
            const SizedBox(height: 12),
            _buildErrorBadge(_errorMessage!),
          ],
        ],
      ),
    );
  }

  Widget _buildCard({required Widget child, required ValueKey key}) {
    return Container(
      key: key,
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: const Color(0xFFE2E8F0),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withOpacity(0.04),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: child,
    );
  }

  Widget _buildTelegramButton() {
    return GestureDetector(
      onTap: _isLoading ? null : _startTelegramAuth,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        height: 54,
        decoration: BoxDecoration(
          color: AppTheme.primary,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: AppTheme.primary.withOpacity(0.28),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Center(
          child: _isLoading
              ? const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  ),
                )
              : const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.send_rounded, size: 20, color: Colors.white),
                    SizedBox(width: 10),
                    Text(
                      'Telegram orqali kirish',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.2,
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }

  Widget _buildActionButton({
    required String label,
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: _isLoading ? null : onTap,
      child: Container(
        height: 54,
        width: double.infinity,
        decoration: BoxDecoration(
          color: AppTheme.primary,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: AppTheme.primary.withOpacity(0.28),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Center(
          child: _isLoading
              ? const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  ),
                )
              : Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(icon, size: 20, color: Colors.white),
                    const SizedBox(width: 8),
                    Text(
                      label,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }

  Widget _buildErrorBadge(String message) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFECACA)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline_rounded, size: 15, color: Color(0xFFEF4444)),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              message,
              style: const TextStyle(
                color: Color(0xFFEF4444),
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    ).animate().shakeX(amount: 6, duration: 400.ms);
  }
}
