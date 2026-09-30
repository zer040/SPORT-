import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/glass_container.dart';

class MatchTicketScreen extends StatelessWidget {
  const MatchTicketScreen({super.key});

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
                'Match Pass & Chiptalar',
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Maydonga kirish uchun QR passni ko‘rsating',
                style: TextStyle(
                  fontSize: 14,
                  color: AppTheme.textSecondary,
                ),
              ),
              const SizedBox(height: 24),

              // Wallet Ticket Pass
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: Colors.white.withOpacity(0.9)),
                    boxShadow: [
                      BoxShadow(
                        color: AppTheme.glassShadow,
                        blurRadius: 24,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      // Header & Info
                      Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: const [
                                    Icon(Icons.sports_soccer, color: AppTheme.primary, size: 20),
                                    SizedBox(width: 6),
                                    Text(
                                      'SPORT+ PASS',
                                      style: TextStyle(
                                        color: AppTheme.primary,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: AppTheme.success.withOpacity(0.12),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Text(
                                    'TASDIQLANGAN',
                                    style: TextStyle(
                                      color: AppTheme.success,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 11,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            const Text(
                              'Bunyodkor Arena',
                              style: TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              'Maydon №2 • Sun‘iy maysazor',
                              style: TextStyle(
                                fontSize: 14,
                                color: AppTheme.textSecondary,
                              ),
                            ),
                            const SizedBox(height: 20),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: const [
                                _TicketInfoCol(title: 'SANA', value: 'Bugun, 20:00'),
                                _TicketInfoCol(title: 'DAVOMIYLIGI', value: '1.5 soat'),
                                _TicketInfoCol(title: 'TO‘LANGAN', value: '250,000 so‘m'),
                              ],
                            ),
                          ],
                        ),
                      ),

                      // Perforated Notches & Line
                      Row(
                        children: [
                          Container(
                            width: 14,
                            height: 24,
                            decoration: const BoxDecoration(
                              color: AppTheme.background,
                              borderRadius: BorderRadius.only(
                                topRight: Radius.circular(12),
                                bottomRight: Radius.circular(12),
                              ),
                            ),
                          ),
                          Expanded(
                            child: LayoutBuilder(
                              builder: (context, constraints) {
                                return Flex(
                                  direction: Axis.horizontal,
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: List.generate(
                                    (constraints.constrainWidth() / 10).floor(),
                                    (_) => const SizedBox(
                                      width: 5,
                                      height: 1.5,
                                      child: DecoratedBox(
                                        decoration: BoxDecoration(color: Color(0x33000000)),
                                      ),
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
                          Container(
                            width: 14,
                            height: 24,
                            decoration: const BoxDecoration(
                              color: AppTheme.background,
                              borderRadius: BorderRadius.only(
                                topLeft: Radius.circular(12),
                                bottomLeft: Radius.circular(12),
                              ),
                            ),
                          ),
                        ],
                      ),

                      // QR Code Stub
                      Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          children: [
                            Container(
                              width: 130,
                              height: 130,
                              decoration: BoxDecoration(
                                color: AppTheme.surfaceSecondary,
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: const Icon(
                                Icons.qr_code_2_rounded,
                                size: 100,
                                color: AppTheme.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 10),
                            const Text(
                              'KOD: SP-9842-PASS',
                              style: TextStyle(
                                fontFamily: 'monospace',
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
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

              const SizedBox(height: 28),

              // Booking history title
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 20),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'O‘tgan o‘yinlar tarixi',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),

              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: GlassContainer(
                  borderRadius: 18,
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text(
                            'Jar Stadium',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                              color: AppTheme.textPrimary,
                            ),
                          ),
                          SizedBox(height: 4),
                          Text(
                            '24-Sentyabr, 19:00',
                            style: TextStyle(
                              color: AppTheme.textSecondary,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: const [
                          Text(
                            '220,000 so‘m',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: AppTheme.primary,
                              fontSize: 14,
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'YAKUNLANDI',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.textMuted,
                            ),
                          ),
                        ],
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
}

class _TicketInfoCol extends StatelessWidget {
  final String title;
  final String value;

  const _TicketInfoCol({required this.title, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 10,
            color: AppTheme.textMuted,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: AppTheme.textPrimary,
          ),
        ),
      ],
    );
  }
}
