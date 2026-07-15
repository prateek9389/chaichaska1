import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class OrderDetailScreen extends StatefulWidget {
  final String orderId;

  const OrderDetailScreen({super.key, required this.orderId});

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> with SingleTickerProviderStateMixin {
  late AnimationController _timerController;
  late Animation<double> _progressAnimation;

  @override
  void initState() {
    super.initState();
    // Simulate a countdown timer animation (e.g. 10 seconds loop representing 10 minutes)
    _timerController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 15),
    )..repeat();

    _progressAnimation = Tween<double>(begin: 1.0, end: 0.0).animate(_timerController);
  }

  @override
  void dispose() {
    _timerController.dispose();
    super.dispose();
  }

  String _getCountdownText(double progressValue) {
    // Convert 0.0 - 1.0 progress to a 10-minute timer format, e.g. 09:59 down to 00:00
    int totalSeconds = (progressValue * 600).toInt();
    int minutes = totalSeconds ~/ 60;
    int seconds = totalSeconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  String _getStatusText(double progressValue) {
    if (progressValue > 0.66) {
      return 'Brewing your fresh tea... ☕';
    } else if (progressValue > 0.33) {
      return 'Packing snacks and drinks... 📦';
    } else {
      return 'Driver is heading your way! 🛵';
    }
  }

  @override
  Widget build(BuildContext context) {
    // Dummy products inside this order
    final List<Map<String, dynamic>> orderProducts = [
      {
        'name': 'Adrak Chai',
        'qty': 2,
        'details': 'Regular Sugar, Hot',
        'price': '₹90.00',
        'imagePath': 'assets/images/adrak_chai.png',
        'bgColor': const Color(0xFFF1F7F4),
      },
      {
        'name': 'Elaichi Chai',
        'qty': 1,
        'details': 'Less Sugar, Hot',
        'price': '₹45.00',
        'imagePath': 'assets/images/elaichi_chai.png',
        'bgColor': const Color(0xFFF1F7F4),
      },
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFFDFDFD),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: Padding(
          padding: const EdgeInsets.all(8.0),
          child: GestureDetector(
            onTap: () => Navigator.of(context).pop(),
            child: Container(
              decoration: const BoxDecoration(
                color: Color(0xFFF5F5F5),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.arrow_back_ios_new_rounded,
                size: 16,
                color: Colors.black,
              ),
            ),
          ),
        ),
        title: Text(
          'Track Order',
          style: GoogleFonts.sora(
            color: Colors.black,
            fontSize: 18,
            fontWeight: FontWeight.w700,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Beautiful Top Timer Animation section
              Center(
                child: Column(
                  children: [
                    Text(
                      'Estimated Delivery',
                      style: GoogleFonts.outfit(fontSize: 14, color: Colors.grey.shade400, fontWeight: FontWeight.w500),
                    ),
                    const SizedBox(height: 16),
                    AnimatedBuilder(
                      animation: _timerController,
                      builder: (context, child) {
                        return Stack(
                          alignment: Alignment.center,
                          children: [
                            SizedBox(
                              width: 140,
                              height: 140,
                              child: CircularProgressIndicator(
                                value: _progressAnimation.value,
                                strokeWidth: 8,
                                backgroundColor: const Color(0xFFFAF7F4),
                                valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF8B6B58)),
                              ),
                            ),
                            Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  _getCountdownText(_progressAnimation.value),
                                  style: GoogleFonts.sora(
                                    fontSize: 24,
                                    fontWeight: FontWeight.w800,
                                    color: Colors.black,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'Minutes Left',
                                  style: GoogleFonts.outfit(
                                    fontSize: 11,
                                    color: Colors.grey.shade500,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        );
                      },
                    ),
                    const SizedBox(height: 16),
                    AnimatedBuilder(
                      animation: _timerController,
                      builder: (context, child) {
                        return Text(
                          _getStatusText(_progressAnimation.value),
                          style: GoogleFonts.sora(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF2D1E18),
                          ),
                          textAlign: TextAlign.center,
                        );
                      },
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 36),

              // Items Ordered Header
              Text(
                'Items Ordered',
                style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.black),
              ),
              const SizedBox(height: 12),

              // Products list inside order
              ...orderProducts.map((product) {
                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.grey.shade100),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withAlpha(4),
                        blurRadius: 8,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: Container(
                          width: 54,
                          height: 54,
                          color: product['bgColor'],
                          padding: const EdgeInsets.all(4),
                          child: Image.asset(product['imagePath'], fit: BoxFit.contain),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              product['name'],
                              style: GoogleFonts.sora(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.black),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '${product['qty']}x • ${product['details']}',
                              style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey.shade500),
                            ),
                          ],
                        ),
                      ),
                      Text(
                        product['price'],
                        style: GoogleFonts.sora(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF8B6B58)),
                      ),
                    ],
                  ),
                );
              }),

              const SizedBox(height: 28),

              // Pricing Details section
              Text(
                'Payment Summary',
                style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.black),
              ),
              const SizedBox(height: 12),

              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.grey.shade100),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withAlpha(4),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    _buildPricingRow('Subtotal', '₹135.00'),
                    const SizedBox(height: 8),
                    _buildPricingRow('Delivery Fee', '₹30.00'),
                    const SizedBox(height: 8),
                    _buildPricingRow('Discount', '-₹15.00', isDiscount: true),
                    const Divider(height: 24, thickness: 1),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Total Paid',
                          style: GoogleFonts.sora(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.black),
                        ),
                        Text(
                          '₹150.00',
                          style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w800, color: const Color(0xFF2D1E18)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPricingRow(String label, String value, {bool isDiscount = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: GoogleFonts.outfit(fontSize: 13, color: Colors.grey.shade500),
        ),
        Text(
          value,
          style: GoogleFonts.sora(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: isDiscount ? Colors.green.shade700 : Colors.black,
          ),
        ),
      ],
    );
  }
}
