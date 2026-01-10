import 'package:flutter/material.dart';
import 'dart:ui';
import 'dart:math' as math;

/// Ultra-modern glassmorphism container with futuristic effects
class GlassmorphismContainer extends StatefulWidget {
  final Widget child;
  final double? width;
  final double? height;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final BorderRadius? borderRadius;
  final Color? backgroundColor;
  final Border? border;
  final List<BoxShadow>? boxShadow;
  final bool isInteractive;

  const GlassmorphismContainer({
    Key? key,
    required this.child,
    this.width,
    this.height,
    this.padding,
    this.margin,
    this.borderRadius,
    this.backgroundColor,
    this.border,
    this.boxShadow,
    this.isInteractive = false,
  }) : super(key: key);

  @override
  _GlassmorphismContainerState createState() => _GlassmorphismContainerState();
}

class _GlassmorphismContainerState extends State<GlassmorphismContainer>
    with TickerProviderStateMixin {
  late AnimationController _glowController;
  late Animation<double> _glowAnimation;
  bool _isHovered = false;

  @override
  void initState() {
    super.initState();
    _glowController = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    );
    _glowAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _glowController,
      curve: Curves.easeInOut,
    ));
    
    if (widget.isInteractive) {
      _glowController.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _glowController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: AnimatedBuilder(
        animation: _glowAnimation,
        builder: (context, child) {
          return Container(
            width: widget.width,
            height: widget.height,
            margin: widget.margin,
            child: ClipRRect(
              borderRadius: widget.borderRadius ?? BorderRadius.circular(28),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                child: Container(
                  padding: widget.padding ?? const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        const Color(0xFF1A1A1A).withOpacity(0.7),
                        const Color(0xFF0F0F0F).withOpacity(0.8),
                      ],
                    ),
                    borderRadius: widget.borderRadius ?? BorderRadius.circular(28),
                    border: Border.all(
                      color: _isHovered 
                          ? const Color(0xFF00E676).withOpacity(0.8)
                          : const Color(0xFF00E676).withOpacity(0.3),
                      width: _isHovered ? 2.0 : 1.5,
                    ),
                    boxShadow: [
                      // Inner glow effect
                      BoxShadow(
                        color: const Color(0xFF00E676).withOpacity(
                          widget.isInteractive ? 0.2 + (_glowAnimation.value * 0.3) : 0.2
                        ),
                        blurRadius: 30,
                        offset: const Offset(0, 0),
                        spreadRadius: -5,
                        blurStyle: BlurStyle.inner,
                      ),
                      // Outer glow effect
                      BoxShadow(
                        color: const Color(0xFF00E676).withOpacity(
                          _isHovered ? 0.4 : 0.2
                        ),
                        blurRadius: _isHovered ? 40 : 25,
                        offset: const Offset(0, 8),
                        spreadRadius: _isHovered ? 5 : 0,
                      ),
                      // Deep shadow
                      BoxShadow(
                        color: Colors.black.withOpacity(0.6),
                        blurRadius: 20,
                        offset: const Offset(0, 12),
                      ),
                    ],
                  ),
                  child: widget.child,
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

/// Ultra-modern futuristic button with advanced effects
class ModernGradientButton extends StatefulWidget {
  final String text;
  final VoidCallback? onPressed;
  final IconData? icon;
  final Color? primaryColor;
  final Color? secondaryColor;
  final double? width;
  final double? height;
  final bool isLoading;
  final bool isPrimary;

  const ModernGradientButton({
    Key? key,
    required this.text,
    this.onPressed,
    this.icon,
    this.primaryColor,
    this.secondaryColor,
    this.width,
    this.height,
    this.isLoading = false,
    this.isPrimary = true,
  }) : super(key: key);

  @override
  _ModernGradientButtonState createState() => _ModernGradientButtonState();
}

class _ModernGradientButtonState extends State<ModernGradientButton>
    with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late AnimationController _pressController;
  late Animation<double> _pulseAnimation;
  late Animation<double> _scaleAnimation;
  bool _isPressed = false;

  @override
  void initState() {
    super.initState();
    
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    );
    
    _pressController = AnimationController(
      duration: const Duration(milliseconds: 150),
      vsync: this,
    );
    
    _pulseAnimation = Tween<double>(
      begin: 1.0,
      end: 1.1,
    ).animate(CurvedAnimation(
      parent: _pulseController,
      curve: Curves.easeInOut,
    ));
    
    _scaleAnimation = Tween<double>(
      begin: 1.0,
      end: 0.95,
    ).animate(CurvedAnimation(
      parent: _pressController,
      curve: Curves.easeInOut,
    ));
    
    _pulseController.repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _pressController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final primaryColor = widget.primaryColor ?? const Color(0xFF00E676);
    final secondaryColor = widget.secondaryColor ?? const Color(0xFF4CAF50);
    
    return AnimatedBuilder(
      animation: Listenable.merge([_pulseAnimation, _scaleAnimation]),
      builder: (context, child) {
        return Transform.scale(
          scale: _scaleAnimation.value,
          child: Container(
            width: widget.width,
            height: widget.height ?? 64,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                // Outer glow
                BoxShadow(
                  color: primaryColor.withOpacity(0.4),
                  blurRadius: 25 * _pulseAnimation.value,
                  offset: const Offset(0, 8),
                  spreadRadius: 2 * _pulseAnimation.value,
                ),
                // Inner shadow for depth
                BoxShadow(
                  color: Colors.black.withOpacity(0.3),
                  blurRadius: 15,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
                child: Container(
                  decoration: BoxDecoration(
                    gradient: widget.isPrimary
                        ? LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [
                              primaryColor,
                              secondaryColor,
                            ],
                          )
                        : LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [
                              Colors.transparent,
                              primaryColor.withOpacity(0.1),
                            ],
                          ),
                    border: widget.isPrimary
                        ? null
                        : Border.all(
                            color: primaryColor,
                            width: 2,
                          ),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: widget.onPressed,
                      onTapDown: (_) {
                        setState(() => _isPressed = true);
                        _pressController.forward();
                      },
                      onTapUp: (_) {
                        setState(() => _isPressed = false);
                        _pressController.reverse();
                      },
                      onTapCancel: () {
                        setState(() => _isPressed = false);
                        _pressController.reverse();
                      },
                      borderRadius: BorderRadius.circular(20),
                      splashColor: Colors.white.withOpacity(0.2),
                      highlightColor: Colors.white.withOpacity(0.1),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 18),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (widget.isLoading)
                              SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.5,
                                  valueColor: AlwaysStoppedAnimation<Color>(
                                    widget.isPrimary ? Colors.black : primaryColor,
                                  ),
                                ),
                              )
                            else if (widget.icon != null)
                              Icon(
                                widget.icon,
                                color: widget.isPrimary ? Colors.black : primaryColor,
                                size: 22,
                              ),
                            if ((widget.icon != null || widget.isLoading) && widget.text.isNotEmpty)
                              const SizedBox(width: 12),
                            if (widget.text.isNotEmpty)
                              Text(
                                widget.text,
                                style: TextStyle(
                                  color: widget.isPrimary ? Colors.black : primaryColor,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 1.0,
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

/// Ultra-modern holographic card with advanced 3D effects
class HolographicCard extends StatefulWidget {
  final Widget child;
  final double? width;
  final double? height;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final VoidCallback? onTap;
  final bool isInteractive;

  const HolographicCard({
    Key? key,
    required this.child,
    this.width,
    this.height,
    this.padding,
    this.margin,
    this.onTap,
    this.isInteractive = true,
  }) : super(key: key);

  @override
  _HolographicCardState createState() => _HolographicCardState();
}

class _HolographicCardState extends State<HolographicCard>
    with TickerProviderStateMixin {
  late AnimationController _hoverController;
  late AnimationController _pressController;
  late AnimationController _glowController;
  late Animation<double> _scaleAnimation;
  late Animation<double> _rotationAnimation;
  late Animation<double> _glowAnimation;
  
  bool _isHovered = false;
  Offset _localPosition = Offset.zero;

  @override
  void initState() {
    super.initState();
    
    _hoverController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    
    _pressController = AnimationController(
      duration: const Duration(milliseconds: 150),
      vsync: this,
    );
    
    _glowController = AnimationController(
      duration: const Duration(milliseconds: 3000),
      vsync: this,
    );

    _scaleAnimation = Tween<double>(
      begin: 1.0,
      end: 1.05,
    ).animate(CurvedAnimation(
      parent: _hoverController,
      curve: Curves.easeOutCubic,
    ));

    _rotationAnimation = Tween<double>(
      begin: 0.0,
      end: 0.02,
    ).animate(CurvedAnimation(
      parent: _hoverController,
      curve: Curves.easeOutCubic,
    ));

    _glowAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _glowController,
      curve: Curves.easeInOut,
    ));

    if (widget.isInteractive) {
      _glowController.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _hoverController.dispose();
    _pressController.dispose();
    _glowController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge([
        _scaleAnimation,
        _rotationAnimation,
        _glowAnimation,
      ]),
      builder: (context, child) {
        return MouseRegion(
          onEnter: (_) {
            setState(() => _isHovered = true);
            _hoverController.forward();
          },
          onExit: (_) {
            setState(() => _isHovered = false);
            _hoverController.reverse();
          },
          onHover: (event) {
            setState(() {
              _localPosition = event.localPosition;
            });
          },
          child: Transform.scale(
            scale: _scaleAnimation.value,
            child: Transform(
              alignment: Alignment.center,
              transform: Matrix4.identity()
                ..setEntry(3, 2, 0.001)
                ..rotateX(_isHovered ? (_localPosition.dy / 300 - 0.5) * 0.1 : 0)
                ..rotateY(_isHovered ? (_localPosition.dx / 300 - 0.5) * 0.1 : 0),
              child: Container(
                width: widget.width,
                height: widget.height,
                margin: widget.margin,
                child: GestureDetector(
                  onTapDown: (_) => _pressController.forward(),
                  onTapUp: (_) {
                    _pressController.reverse();
                    widget.onTap?.call();
                  },
                  onTapCancel: () => _pressController.reverse(),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(24),
                    child: BackdropFilter(
                      filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
                      child: Container(
                        padding: widget.padding ?? const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [
                              const Color(0xFF1A1A1A).withOpacity(0.8),
                              const Color(0xFF0F0F0F).withOpacity(0.9),
                            ],
                          ),
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(
                            color: _isHovered
                                ? const Color(0xFF00E676).withOpacity(0.8)
                                : const Color(0xFF00E676).withOpacity(0.3),
                            width: _isHovered ? 2.5 : 1.5,
                          ),
                          boxShadow: [
                            // Holographic glow
                            BoxShadow(
                              color: const Color(0xFF00E676).withOpacity(
                                widget.isInteractive 
                                  ? 0.3 + (_glowAnimation.value * 0.4)
                                  : _isHovered ? 0.6 : 0.3
                              ),
                              blurRadius: _isHovered ? 40 : 25,
                              offset: const Offset(0, 10),
                              spreadRadius: _isHovered ? 8 : 2,
                            ),
                            // Inner glow
                            BoxShadow(
                              color: const Color(0xFF00E676).withOpacity(0.2),
                              blurRadius: 15,
                              offset: const Offset(0, 0),
                              spreadRadius: -5,
                              blurStyle: BlurStyle.inner,
                            ),
                            // Deep shadow
                            BoxShadow(
                              color: Colors.black.withOpacity(0.7),
                              blurRadius: 30,
                              offset: const Offset(0, 15),
                            ),
                          ],
                        ),
                        child: widget.child,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

/// Futuristic neon text with advanced glow effects
class NeonText extends StatefulWidget {
  final String text;
  final double fontSize;
  final Color color;
  final FontWeight? fontWeight;
  final bool isAnimated;
  final TextAlign? textAlign;

  const NeonText({
    Key? key,
    required this.text,
    this.fontSize = 16,
    this.color = const Color(0xFF00E676),
    this.fontWeight,
    this.isAnimated = false,
    this.textAlign,
  }) : super(key: key);

  @override
  _NeonTextState createState() => _NeonTextState();
}

class _NeonTextState extends State<NeonText>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _glowAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    );
    _glowAnimation = Tween<double>(
      begin: 0.5,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeInOut,
    ));

    if (widget.isAnimated) {
      _controller.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _glowAnimation,
      builder: (context, child) {
        return Text(
          widget.text,
          textAlign: widget.textAlign,
          style: TextStyle(
            fontSize: widget.fontSize,
            fontWeight: widget.fontWeight ?? FontWeight.w600,
            color: widget.color,
            letterSpacing: 1.2,
            shadows: [
              Shadow(
                offset: const Offset(0, 0),
                blurRadius: 20 * (widget.isAnimated ? _glowAnimation.value : 1.0),
                color: widget.color.withOpacity(0.8),
              ),
              Shadow(
                offset: const Offset(0, 0),
                blurRadius: 40 * (widget.isAnimated ? _glowAnimation.value : 0.5),
                color: widget.color.withOpacity(0.4),
              ),
              Shadow(
                offset: const Offset(0, 2),
                blurRadius: 8,
                color: Colors.black.withOpacity(0.3),
              ),
            ],
          ),
        );
      },
    );
  }
}

/// Ultra-modern futuristic background with particle effects
class ModernBackground extends StatefulWidget {
  final Widget child;
  final bool showParticles;

  const ModernBackground({
    Key? key, 
    required this.child,
    this.showParticles = true,
  }) : super(key: key);

  @override
  _ModernBackgroundState createState() => _ModernBackgroundState();
}

class _ModernBackgroundState extends State<ModernBackground>
    with TickerProviderStateMixin {
  late AnimationController _particleController;
  late List<Particle> _particles;

  @override
  void initState() {
    super.initState();
    _particleController = AnimationController(
      duration: const Duration(seconds: 10),
      vsync: this,
    );

    if (widget.showParticles) {
      _generateParticles();
      _particleController.repeat();
    }
  }

  void _generateParticles() {
    _particles = List.generate(20, (index) => Particle());
  }

  @override
  void dispose() {
    _particleController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF000000), // Pure black
            Color(0xFF0A0A0A), // Very dark
            Color(0xFF1A1A1A), // Dark gray
          ],
          stops: [0.0, 0.5, 1.0],
        ),
      ),
      child: Stack(
        children: [
          // Particle animation layer
          if (widget.showParticles)
            AnimatedBuilder(
              animation: _particleController,
              builder: (context, child) {
                return CustomPaint(
                  painter: ParticlePainter(_particles, _particleController.value),
                  size: Size.infinite,
                );
              },
            ),
          // Gradient overlay for depth
          Container(
            decoration: BoxDecoration(
              gradient: RadialGradient(
                center: Alignment.center,
                radius: 1.5,
                colors: [
                  const Color(0xFF00E676).withOpacity(0.03),
                  Colors.transparent,
                ],
              ),
            ),
          ),
          // Main content
          widget.child,
        ],
      ),
    );
  }
}

/// Particle data class
class Particle {
  late double x;
  late double y;
  late double vx;
  late double vy;
  late double size;
  late Color color;

  Particle() {
    final random = math.Random();
    x = (random.nextDouble() * 2 - 1);
    y = (random.nextDouble() * 2 - 1);
    vx = (random.nextDouble() - 0.5) * 0.02;
    vy = (random.nextDouble() - 0.5) * 0.02;
    size = random.nextDouble() * 3 + 1;
    color = const Color(0xFF00E676).withOpacity(random.nextDouble() * 0.3 + 0.1);
  }
}

/// Custom painter for particles
class ParticlePainter extends CustomPainter {
  final List<Particle> particles;
  final double animationValue;

  ParticlePainter(this.particles, this.animationValue);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint();

    for (final particle in particles) {
      // Update particle position
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Wrap around screen
      if (particle.x > 1) particle.x = -1;
      if (particle.x < -1) particle.x = 1;
      if (particle.y > 1) particle.y = -1;
      if (particle.y < -1) particle.y = 1;

      // Convert to screen coordinates
      final screenX = (particle.x + 1) * size.width / 2;
      final screenY = (particle.y + 1) * size.height / 2;

      paint.color = particle.color;
      paint.maskFilter = MaskFilter.blur(BlurStyle.normal, particle.size);

      canvas.drawCircle(
        Offset(screenX, screenY),
        particle.size,
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}

/// Futuristic loading indicator
class FuturisticLoader extends StatefulWidget {
  final Color? color;
  final double size;

  const FuturisticLoader({
    Key? key,
    this.color,
    this.size = 50.0,
  }) : super(key: key);

  @override
  _FuturisticLoaderState createState() => _FuturisticLoaderState();
}

class _FuturisticLoaderState extends State<FuturisticLoader>
    with TickerProviderStateMixin {
  late AnimationController _rotationController;
  late AnimationController _pulseController;
  late Animation<double> _rotationAnimation;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    
    _rotationController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );
    
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    );

    _rotationAnimation = Tween<double>(
      begin: 0,
      end: 2 * math.pi,
    ).animate(_rotationController);

    _pulseAnimation = Tween<double>(
      begin: 0.8,
      end: 1.2,
    ).animate(CurvedAnimation(
      parent: _pulseController,
      curve: Curves.easeInOut,
    ));

    _rotationController.repeat();
    _pulseController.repeat(reverse: true);
  }

  @override
  void dispose() {
    _rotationController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final color = widget.color ?? const Color(0xFF00E676);
    
    return AnimatedBuilder(
      animation: Listenable.merge([_rotationAnimation, _pulseAnimation]),
      builder: (context, child) {
        return Transform.scale(
          scale: _pulseAnimation.value,
          child: Transform.rotate(
            angle: _rotationAnimation.value,
            child: SizedBox(
              width: widget.size,
              height: widget.size,
              child: CustomPaint(
                painter: FuturisticLoaderPainter(color),
              ),
            ),
          ),
        );
      },
    );
  }
}

class FuturisticLoaderPainter extends CustomPainter {
  final Color color;

  FuturisticLoaderPainter(this.color);

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2;
    
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round;

    // Outer ring
    paint.color = color;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius * 0.9),
      0,
      math.pi * 1.5,
      false,
      paint,
    );

    // Inner ring
    paint.color = color.withOpacity(0.5);
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius * 0.6),
      0,
      math.pi,
      false,
      paint,
    );

    // Center dot
    paint.style = PaintingStyle.fill;
    paint.color = color;
    canvas.drawCircle(center, radius * 0.15, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Futuristic status indicator
class StatusIndicator extends StatefulWidget {
  final bool isOnline;
  final String label;
  final double size;

  const StatusIndicator({
    Key? key,
    required this.isOnline,
    required this.label,
    this.size = 12.0,
  }) : super(key: key);

  @override
  _StatusIndicatorState createState() => _StatusIndicatorState();
}

class _StatusIndicatorState extends State<StatusIndicator>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    );
    _pulseAnimation = Tween<double>(
      begin: 0.8,
      end: 1.2,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeInOut,
    ));

    if (widget.isOnline) {
      _controller.repeat(reverse: true);
    }
  }

  @override
  void didUpdateWidget(StatusIndicator oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isOnline != oldWidget.isOnline) {
      if (widget.isOnline) {
        _controller.repeat(reverse: true);
      } else {
        _controller.stop();
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        AnimatedBuilder(
          animation: _pulseAnimation,
          builder: (context, child) {
            return Transform.scale(
              scale: widget.isOnline ? _pulseAnimation.value : 1.0,
              child: Container(
                width: widget.size,
                height: widget.size,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: widget.isOnline 
                      ? const Color(0xFF00E676)
                      : Colors.red,
                  boxShadow: [
                    BoxShadow(
                      color: (widget.isOnline 
                          ? const Color(0xFF00E676)
                          : Colors.red).withOpacity(0.5),
                      blurRadius: widget.isOnline ? 10 : 5,
                      spreadRadius: widget.isOnline ? 2 : 0,
                    ),
                  ],
                ),
              ),
            );
          },
        ),
        const SizedBox(width: 8),
        Text(
          widget.label,
          style: TextStyle(
            color: Colors.white.withOpacity(0.8),
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

/// Futuristic progress bar
class FuturisticProgressBar extends StatefulWidget {
  final double progress;
  final Color? color;
  final double height;
  final String? label;

  const FuturisticProgressBar({
    Key? key,
    required this.progress,
    this.color,
    this.height = 8.0,
    this.label,
  }) : super(key: key);

  @override
  _FuturisticProgressBarState createState() => _FuturisticProgressBarState();
}

class _FuturisticProgressBarState extends State<FuturisticProgressBar>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _glowAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );
    _glowAnimation = Tween<double>(
      begin: 0.5,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeInOut,
    ));

    _controller.repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final color = widget.color ?? const Color(0xFF00E676);
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (widget.label != null) ...[
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                widget.label!,
                style: TextStyle(
                  color: Colors.white.withOpacity(0.8),
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              Text(
                '${(widget.progress * 100).toInt()}%',
                style: TextStyle(
                  color: color,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
        ],
        AnimatedBuilder(
          animation: _glowAnimation,
          builder: (context, child) {
            return Container(
              height: widget.height,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(widget.height / 2),
                boxShadow: [
                  BoxShadow(
                    color: color.withOpacity(0.3 * _glowAnimation.value),
                    blurRadius: 10 * _glowAnimation.value,
                    spreadRadius: 1,
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(widget.height / 2),
                child: Stack(
                  children: [
                    Container(
                      width: double.infinity,
                      height: widget.height,
                      color: Colors.white.withOpacity(0.1),
                    ),
                    FractionallySizedBox(
                      widthFactor: widget.progress.clamp(0.0, 1.0),
                      child: Container(
                        height: widget.height,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              color,
                              color.withOpacity(0.7),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }
}

/// Futuristic notification badge
class FuturisticBadge extends StatefulWidget {
  final Widget child;
  final String? value;
  final Color? backgroundColor;
  final bool showBadge;

  const FuturisticBadge({
    Key? key,
    required this.child,
    this.value,
    this.backgroundColor,
    this.showBadge = true,
  }) : super(key: key);

  @override
  _FuturisticBadgeState createState() => _FuturisticBadgeState();
}

class _FuturisticBadgeState extends State<FuturisticBadge>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    );
    _scaleAnimation = Tween<double>(
      begin: 1.0,
      end: 1.2,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeInOut,
    ));

    if (widget.showBadge && widget.value != null) {
      _controller.repeat(reverse: true);
    }
  }

  @override
  void didUpdateWidget(FuturisticBadge oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.showBadge != oldWidget.showBadge ||
        widget.value != oldWidget.value) {
      if (widget.showBadge && widget.value != null) {
        _controller.repeat(reverse: true);
      } else {
        _controller.stop();
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        widget.child,
        if (widget.showBadge && widget.value != null)
          Positioned(
            right: -8,
            top: -8,
            child: AnimatedBuilder(
              animation: _scaleAnimation,
              builder: (context, child) {
                return Transform.scale(
                  scale: _scaleAnimation.value,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 6,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: widget.backgroundColor ?? const Color(0xFF00E676),
                      borderRadius: BorderRadius.circular(10),
                      boxShadow: [
                        BoxShadow(
                          color: (widget.backgroundColor ?? const Color(0xFF00E676))
                              .withOpacity(0.5),
                          blurRadius: 8,
                          spreadRadius: 1,
                        ),
                      ],
                    ),
                    constraints: const BoxConstraints(
                      minWidth: 16,
                      minHeight: 16,
                    ),
                    child: Text(
                      widget.value!,
                      style: const TextStyle(
                        color: Colors.black,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                );
              },
            ),
          ),
      ],
    );
  }
}
