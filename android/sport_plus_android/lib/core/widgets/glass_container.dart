import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/app_theme.dart';

class GlassContainer extends StatefulWidget {
  final Widget child;
  final double borderRadius;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final double blur;
  final double opacity;

  const GlassContainer({
    super.key,
    required this.child,
    this.borderRadius = 24.0,
    this.padding = const EdgeInsets.all(20.0),
    this.onTap,
    this.blur = 16.0,
    this.opacity = 0.65,
  });

  @override
  State<GlassContainer> createState() => _GlassContainerState();
}

class _GlassContainerState extends State<GlassContainer> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    Widget content = Container(
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(widget.opacity),
        borderRadius: BorderRadius.circular(widget.borderRadius),
        border: Border.all(
          color: Colors.white.withOpacity(0.85),
          width: 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: AppTheme.glassShadow,
            blurRadius: 20.0,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      padding: widget.padding,
      child: widget.child,
    );

    // Apply BackdropFilter blur
    Widget blurredContent = ClipRRect(
      borderRadius: BorderRadius.circular(widget.borderRadius),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: widget.blur, sigmaY: widget.blur),
        child: content,
      ),
    );

    if (widget.onTap != null) {
      return GestureDetector(
        onTapDown: (_) {
          setState(() => _isPressed = true);
          HapticFeedback.lightImpact();
        },
        onTapUp: (_) => setState(() => _isPressed = false),
        onTapCancel: () => setState(() => _isPressed = false),
        onTap: widget.onTap,
        child: AnimatedScale(
          scale: _isPressed ? 0.97 : 1.0,
          duration: const Duration(milliseconds: 140),
          curve: Curves.easeOutCubic,
          child: blurredContent,
        ),
      );
    }

    return blurredContent;
  }
}

class GlassPillButton extends StatefulWidget {
  final String title;
  final IconData? icon;
  final VoidCallback onTap;
  final bool isPrimary;
  final bool isLoading;

  const GlassPillButton({
    super.key,
    required this.title,
    this.icon,
    required this.onTap,
    this.isPrimary = true,
    this.isLoading = false,
  });

  @override
  State<GlassPillButton> createState() => _GlassPillButtonState();
}

class _GlassPillButtonState extends State<GlassPillButton> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) {
        setState(() => _isPressed = true);
        HapticFeedback.mediumImpact();
      },
      onTapUp: (_) => setState(() => _isPressed = false),
      onTapCancel: () => setState(() => _isPressed = false),
      onTap: widget.isLoading ? null : widget.onTap,
      child: AnimatedScale(
        scale: _isPressed ? 0.96 : 1.0,
        duration: const Duration(milliseconds: 150),
        curve: Curves.easeOutCubic,
        child: Container(
          height: 52,
          width: double.infinity,
          decoration: BoxDecoration(
            gradient: widget.isPrimary
                ? const LinearGradient(
                    colors: [AppTheme.primaryLight, AppTheme.primary],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  )
                : null,
            color: widget.isPrimary ? null : Colors.white.withOpacity(0.8),
            borderRadius: BorderRadius.circular(16.0),
            border: Border.all(
              color: widget.isPrimary
                  ? Colors.white.withOpacity(0.25)
                  : Colors.white.withOpacity(0.9),
              width: 1.0,
            ),
            boxShadow: [
              BoxShadow(
                color: widget.isPrimary
                    ? AppTheme.primary.withOpacity(0.25)
                    : AppTheme.glassShadow,
                blurRadius: 14.0,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Center(
            child: widget.isLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (widget.icon != null) ...[
                        Icon(
                          widget.icon,
                          size: 18,
                          color: widget.isPrimary
                              ? Colors.white
                              : AppTheme.textPrimary,
                        ),
                        const SizedBox(width: 8),
                      ],
                      Text(
                        widget.title,
                        style: TextStyle(
                          color: widget.isPrimary
                              ? Colors.white
                              : AppTheme.textPrimary,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
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
