import 'package:flutter/material.dart';
import 'map_tab.dart';

class ScanTab extends StatelessWidget {
  const ScanTab({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return const MapTab();
  }
}

class ModernScannerOverlayPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black.withOpacity(0.6)
      ..style = PaintingStyle.fill;

    final scanArea = Rect.fromCenter(
      center: Offset(size.width / 2, size.height / 2),
      width: size.width * 0.75,
      height: size.width * 0.75,
    );

    // Draw semi-transparent overlay
    canvas.drawPath(
      Path.combine(
        PathOperation.difference,
        Path()..addRect(Rect.fromLTWH(0, 0, size.width, size.height)),
        Path()
          ..addRRect(RRect.fromRectAndRadius(
            scanArea,
            const Radius.circular(20),
          )),
      ),
      paint,
    );

    // Draw animated scanning area border with gradient effect
    final borderPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3;

    // Create gradient for the border
    final gradient = LinearGradient(
      colors: [
        Colors.cyanAccent.withOpacity(0.8),
        Colors.purpleAccent.withOpacity(0.8),
        Colors.cyanAccent.withOpacity(0.8),
      ],
      stops: const [0.0, 0.5, 1.0],
    );

    final rect = Rect.fromLTWH(0, 0, scanArea.width, scanArea.height);
    borderPaint.shader = gradient.createShader(rect);

    canvas.drawRRect(
      RRect.fromRectAndRadius(scanArea, const Radius.circular(20)),
      borderPaint,
    );

    // Draw glowing corner markers
    const markerLength = 30.0;
    const markerThickness = 6.0;
    
    final cornerPaint = Paint()
      ..color = Colors.cyanAccent
      ..style = PaintingStyle.stroke
      ..strokeWidth = markerThickness
      ..strokeCap = StrokeCap.round;

    // Add glow effect for corners
    final glowPaint = Paint()
      ..color = Colors.cyanAccent.withOpacity(0.3)
      ..style = PaintingStyle.stroke
      ..strokeWidth = markerThickness + 4
      ..strokeCap = StrokeCap.round;

    // Top left corner
    canvas.drawLine(
      scanArea.topLeft.translate(0, 10),
      scanArea.topLeft.translate(markerLength, 10),
      glowPaint,
    );
    canvas.drawLine(
      scanArea.topLeft.translate(10, 0),
      scanArea.topLeft.translate(10, markerLength),
      glowPaint,
    );
    canvas.drawLine(
      scanArea.topLeft.translate(0, 10),
      scanArea.topLeft.translate(markerLength, 10),
      cornerPaint,
    );
    canvas.drawLine(
      scanArea.topLeft.translate(10, 0),
      scanArea.topLeft.translate(10, markerLength),
      cornerPaint,
    );

    // Top right corner
    canvas.drawLine(
      scanArea.topRight.translate(0, 10),
      scanArea.topRight.translate(-markerLength, 10),
      glowPaint,
    );
    canvas.drawLine(
      scanArea.topRight.translate(-10, 0),
      scanArea.topRight.translate(-10, markerLength),
      glowPaint,
    );
    canvas.drawLine(
      scanArea.topRight.translate(0, 10),
      scanArea.topRight.translate(-markerLength, 10),
      cornerPaint,
    );
    canvas.drawLine(
      scanArea.topRight.translate(-10, 0),
      scanArea.topRight.translate(-10, markerLength),
      cornerPaint,
    );

    // Bottom left corner
    canvas.drawLine(
      scanArea.bottomLeft.translate(0, -10),
      scanArea.bottomLeft.translate(markerLength, -10),
      glowPaint,
    );
    canvas.drawLine(
      scanArea.bottomLeft.translate(10, 0),
      scanArea.bottomLeft.translate(10, -markerLength),
      glowPaint,
    );
    canvas.drawLine(
      scanArea.bottomLeft.translate(0, -10),
      scanArea.bottomLeft.translate(markerLength, -10),
      cornerPaint,
    );
    canvas.drawLine(
      scanArea.bottomLeft.translate(10, 0),
      scanArea.bottomLeft.translate(10, -markerLength),
      cornerPaint,
    );

    // Bottom right corner
    canvas.drawLine(
      scanArea.bottomRight.translate(0, -10),
      scanArea.bottomRight.translate(-markerLength, -10),
      glowPaint,
    );
    canvas.drawLine(
      scanArea.bottomRight.translate(-10, 0),
      scanArea.bottomRight.translate(-10, -markerLength),
      glowPaint,
    );
    canvas.drawLine(
      scanArea.bottomRight.translate(0, -10),
      scanArea.bottomRight.translate(-markerLength, -10),
      cornerPaint,
    );
    canvas.drawLine(
      scanArea.bottomRight.translate(-10, 0),
      scanArea.bottomRight.translate(-10, -markerLength),
      cornerPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}