import 'dart:async';
import 'package:flutter/material.dart';
import '../theme/kinetic_obsidian_theme.dart';

/// Screen 1 & 2: SPORT+ Auth & Welcome + Core Auth & Fluid Motion
class AuthWelcomeScreen extends StatefulWidget {
  final VoidCallback onAuthenticated;

  const AuthWelcomeScreen({super.key, required this.onAuthenticated});

  @override
  State<AuthWelcomeScreen> createState() => _AuthWelcomeScreenState();
}

class _AuthWelcomeScreenState extends State<AuthWelcomeScreen> {
  final TextEditingController _phoneController = TextEditingController(text: '+998 ');
  final List<TextEditingController> _otpControllers = List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _otpFocusNodes = List.generate(6, (_) => FocusNode());

  bool _isOtpSent = false;
  bool _isLoading = false;
  int _countdown = 60;
  Timer? _timer;

  @override
  void dispose() {
    _phoneController.dispose();
    for (var c in _otpControllers) {
      c.dispose();
    }
    for (var f in _otpFocusNodes) {
      f.dispose();
    }
    _timer?.cancel();
    super.dispose();
  }

  void _sendOtp() {
    setState(() => _isLoading = true);
    Future.delayed(const Duration(milliseconds: 600), () {
      setState(() {
        _isLoading = false;
        _isOtpSent = true;
        _countdown = 60;
      });
      _startTimer();
      _otpFocusNodes[0].requestFocus();
    });
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_countdown > 0) {
        setState(() => _countdown--);
      } else {
        timer.cancel();
      }
    });
  }

  void _verifyOtp() {
    final code = _otpControllers.map((c) => c.text).join();
    if (code.length == 6) {
      setState(() => _isLoading = true);
      Future.delayed(const Duration(milliseconds: 700), () {
        setState(() => _isLoading = false);
        widget.onAuthenticated();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: KineticObsidianTheme.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: 20),
              // ─── Kinetic Brand Header ──────────────────────────────────────
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: KineticObsidianTheme.surfaceHigh,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: KineticObsidianTheme.neonTurf.withOpacity(0.4), width: 1.5),
                  boxShadow: [
                    BoxShadow(
                      color: KineticObsidianTheme.neonTurf.withOpacity(0.3),
                      blurRadius: 30,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: const Center(
                  child: Icon(Icons.sports_soccer, color: KineticObsidianTheme.neonTurf, size: 36),
                ),
              ),
              const SizedBox(height: 20),
              const Text('SPORT+', style: KineticObsidianTheme.headlineXl),
              const SizedBox(height: 6),
              const Text(
                'Toshkent & Jizzax futbol maydonlari ekotizimi',
                textAlign: TextAlign.center,
                style: KineticObsidianTheme.bodyMd,
              ),

              const SizedBox(height: 40),

              // ─── Glassmorphism Card ─────────────────────────────────────────
              Container(
                decoration: KineticObsidianTheme.glassCardDecoration(isActive: true),
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          _isOtpSent ? 'OTP TASDIQLASH' : 'KIRISH VA RO\'YXATDAN O\'TISH',
                          style: KineticObsidianTheme.telemetryLabel,
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: KineticObsidianTheme.badgeDecoration(),
                          child: const Text('TELEGRAM AUTH', style: TextStyle(color: KineticObsidianTheme.neonTurf, fontSize: 10, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    if (!_isOtpSent) ...[
                      const Text('Telefon raqamingiz', style: TextStyle(color: KineticObsidianTheme.textMuted, fontSize: 13)),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _phoneController,
                        keyboardType: TextInputType.phone,
                        style: const TextStyle(color: Colors.white, fontSize: 16, fontFamily: 'JetBrainsMono'),
                        decoration: InputDecoration(
                          filled: true,
                          fillColor: KineticObsidianTheme.surfaceLowest.withOpacity(0.8),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: KineticObsidianTheme.borderSubtle)),
                          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: KineticObsidianTheme.neonTurf, width: 1.5)),
                          prefixIcon: const Icon(Icons.phone_iphone, color: KineticObsidianTheme.neonTurf),
                        ),
                      ),
                      const SizedBox(height: 24),
                      GestureDetector(
                        onTap: _isLoading ? null : _sendOtp,
                        child: Container(
                          width: double.infinity,
                          height: 52,
                          decoration: KineticObsidianTheme.primaryButtonDecoration(),
                          child: Center(
                            child: _isLoading
                                ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2))
                                : const Text('OTP KODNI TELEGRAMGA OLISH', style: TextStyle(color: Colors.black, fontSize: 14, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
                          ),
                        ),
                      ),
                    ] else ...[
                      Text('Telegram @sport_plus_uz_bot orqali yuborilgan 6 xonali kodni kiriting', style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 13)),
                      const SizedBox(height: 20),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: List.generate(6, (index) {
                          return SizedBox(
                            width: 44,
                            height: 52,
                            child: TextField(
                              controller: _otpControllers[index],
                              focusNode: _otpFocusNodes[index],
                              keyboardType: TextInputType.number,
                              textAlign: TextAlign.center,
                              maxLength: 1,
                              style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold, fontFamily: 'JetBrainsMono'),
                              decoration: InputDecoration(
                                counterText: '',
                                filled: true,
                                fillColor: KineticObsidianTheme.surfaceLowest,
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: KineticObsidianTheme.borderSubtle)),
                                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: KineticObsidianTheme.neonTurf, width: 2)),
                              ),
                              onChanged: (val) {
                                if (val.isNotEmpty && index < 5) {
                                  _otpFocusNodes[index + 1].requestFocus();
                                }
                                if (_otpControllers.every((c) => c.text.isNotEmpty)) {
                                  _verifyOtp();
                                }
                              },
                            ),
                          );
                        }),
                      ),
                      const SizedBox(height: 20),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Qayta yuborish: ${_countdown}s', style: KineticObsidianTheme.telemetryLabel),
                          if (_countdown == 0)
                            TextButton(onPressed: _sendOtp, child: const Text('Qayta yuborish', style: TextStyle(color: KineticObsidianTheme.neonTurfBright))),
                        ],
                      ),
                      const SizedBox(height: 16),
                      GestureDetector(
                        onTap: _isLoading ? null : _verifyOtp,
                        child: Container(
                          width: double.infinity,
                          height: 52,
                          decoration: KineticObsidianTheme.primaryButtonDecoration(),
                          child: Center(
                            child: _isLoading
                                ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2))
                                : const Text('TIZIMGA KIRISH', style: TextStyle(color: Colors.black, fontSize: 15, fontWeight: FontWeight.w800)),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
