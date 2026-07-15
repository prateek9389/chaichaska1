import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'order_detail_screen.dart';

class ThankYouScreen extends StatefulWidget {
  const ThankYouScreen({super.key});

  @override
  State<ThankYouScreen> createState() => _ThankYouScreenState();
}

class _ThankYouScreenState extends State<ThankYouScreen> with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    );
    _scaleAnimation = CurvedAnimation(parent: _animController, curve: Curves.elasticOut);
    _animController.forward();
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),

              // Success Icon Checkmark
              ScaleTransition(
                scale: _scaleAnimation,
                child: Container(
                  width: 100,
                  height: 100,
                  decoration: const BoxDecoration(
                    color: Color(0xFFE8F1ED),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.check_circle_rounded,
                    color: Color(0xFF2E7D32),
                    size: 64,
                  ),
                ),
              ),
              const SizedBox(height: 28),

              Text(
                'Order Placed Successfully!',
                textAlign: TextAlign.center,
                style: GoogleFonts.sora(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: Colors.black,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Your delicious brew and selected munchies are registered and will be delivered shortly.',
                textAlign: TextAlign.center,
                style: GoogleFonts.outfit(
                  fontSize: 14,
                  color: Colors.grey.shade500,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Order ID: #CHAI-78401',
                style: GoogleFonts.sora(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF8B6B58),
                ),
              ),

              const Spacer(),

              // Buttons
              GestureDetector(
                onTap: () {
                  // Direct to OrderDetailScreen tracking
                  Navigator.of(context).pushReplacement(
                    MaterialPageRoute(
                      builder: (context) => const OrderDetailScreen(orderId: '#CHAI-78401'),
                    ),
                  );
                },
                child: Container(
                  width: double.infinity,
                  height: 54,
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E1E1E),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    'Track Order',
                    style: GoogleFonts.sora(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              GestureDetector(
                onTap: () {
                  // Pop back to home screen
                  Navigator.of(context).popUntil((route) => route.isFirst);
                },
                child: Container(
                  width: double.infinity,
                  height: 54,
                  decoration: BoxDecoration(
                    color: const Color(0xFFFAF7F4),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFF1EDE9), width: 1.5),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    'Continue Shopping',
                    style: GoogleFonts.sora(
                      color: const Color(0xFF2D1E18),
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
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
