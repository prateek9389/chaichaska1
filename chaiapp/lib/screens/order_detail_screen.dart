import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class OrderDetailScreen extends StatefulWidget {
  final Map<String, dynamic> orderData;

  const OrderDetailScreen({super.key, required this.orderData});

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> with SingleTickerProviderStateMixin {
  late AnimationController _timerController;
  late Animation<double> _progressAnimation;
  
  bool _isDeliveredOrCancelled = false;

  @override
  void initState() {
    super.initState();
    final status = widget.orderData['status']?.toString().toLowerCase() ?? '';
    _isDeliveredOrCancelled = status == 'delivered' || status == 'cancelled';
    
    // Parse allocated time (default to 15 mins if not present or unparseable)
    final String allocatedTimeStr = widget.orderData['allocatedTime']?.toString() ?? '';
    int allocatedMinutes = 15;
    final RegExp regExp = RegExp(r'\d+');
    final match = regExp.firstMatch(allocatedTimeStr);
    if (match != null) {
      allocatedMinutes = int.tryParse(match.group(0) ?? '15') ?? 15;
    }

    // Parse createdAt timestamp
    final int createdAt = int.tryParse(widget.orderData['createdAt']?.toString() ?? '') 
        ?? DateTime.now().millisecondsSinceEpoch;
    
    int totalSeconds = allocatedMinutes * 60;
    int elapsedSeconds = (DateTime.now().millisecondsSinceEpoch - createdAt) ~/ 1000;
    int remainingSeconds = totalSeconds - elapsedSeconds;
    if (remainingSeconds < 0) remainingSeconds = 0;

    _timerController = AnimationController(
      vsync: this,
      duration: Duration(seconds: totalSeconds),
    );
    
    if (!_isDeliveredOrCancelled && remainingSeconds > 0) {
      // Start reversing from the current remaining proportion
      _timerController.reverse(from: remainingSeconds / totalSeconds);
    } else {
      _timerController.value = 0.0;
    }
    
    _progressAnimation = Tween<double>(
      begin: 0.0, 
      end: 1.0
    ).animate(_timerController);
  }

  @override
  void dispose() {
    _timerController.dispose();
    super.dispose();
  }

  String _getCountdownText(double progressValue) {
    if (_isDeliveredOrCancelled || progressValue <= 0.0) return "00:00";
    
    // progressValue is 0.0 to 1.0. Multiply by the total duration to get remaining seconds.
    int totalSecs = (_timerController.duration!.inSeconds * progressValue).toInt();
    int minutes = totalSecs ~/ 60;
    int seconds = totalSecs % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  String _getStatusText(double progressValue) {
    final status = widget.orderData['status']?.toString() ?? '';
    if (status.toLowerCase() == 'delivered') return 'Order Delivered! 🎉';
    if (status.toLowerCase() == 'cancelled') return 'Order Cancelled ❌';
    if (status.toLowerCase() == 'out for delivery') return 'Driver is heading your way! 🛵';
    
    if (progressValue <= 0.0 && !_isDeliveredOrCancelled) {
      return 'Driver is heading your way! 🛵';
    }

    if (progressValue > 0.66) {
      return 'Brewing your fresh tea... ☕';
    } else if (progressValue > 0.33) {
      return 'Packing snacks and drinks... 📦';
    } else {
      return 'Preparing for dispatch... ⏳';
    }
  }

  Widget _buildImage(String imgUrl) {
    if (imgUrl.isEmpty) {
      return Image.asset('assets/images/tea_icon.png', fit: BoxFit.cover);
    }
    if (imgUrl.startsWith('data:image')) {
      try {
        final base64String = imgUrl.split(',').last;
        final bytes = base64Decode(base64String);
        return Image.memory(bytes, fit: BoxFit.cover, errorBuilder: (c,e,s) => Image.asset('assets/images/tea_icon.png', fit: BoxFit.cover));
      } catch (e) {
        return Image.asset('assets/images/tea_icon.png', fit: BoxFit.cover);
      }
    }
    if (imgUrl.startsWith('http')) {
      return Image.network(imgUrl, fit: BoxFit.cover, errorBuilder: (c,e,s) => Image.asset('assets/images/tea_icon.png', fit: BoxFit.cover));
    }
    return Image.asset(imgUrl, fit: BoxFit.cover, errorBuilder: (c,e,s) => Image.asset('assets/images/tea_icon.png', fit: BoxFit.cover));
  }

  @override
  Widget build(BuildContext context) {
    final order = widget.orderData;
    final String itemSummary = order['item']?.toString() ?? 'Items';
    final String addons = order['addons']?.toString() ?? '';
    final String total = order['total']?.toString() ?? '₹0.00';
    final String imgUrl = order['img']?.toString() ?? '';
    final String sugar = order['sugar']?.toString() ?? '';
    final String allocatedTime = order['allocatedTime']?.toString() ?? '';

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
              child: const Icon(Icons.arrow_back_ios_new_rounded, size: 16, color: Colors.black),
            ),
          ),
        ),
        title: Text(
          'Track Order',
          style: GoogleFonts.sora(color: Colors.black, fontSize: 18, fontWeight: FontWeight.w700),
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
              // Timer Animation section
              Center(
                child: Column(
                  children: [
                    Text(
                      _isDeliveredOrCancelled ? 'Status' : 'Estimated Delivery',
                      style: GoogleFonts.outfit(fontSize: 14, color: Colors.grey.shade400, fontWeight: FontWeight.w500),
                    ),
                    if (allocatedTime.isNotEmpty && !_isDeliveredOrCancelled)
                      Padding(
                        padding: const EdgeInsets.only(top: 8.0),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFDE8E1),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            'Time Allocated: $allocatedTime',
                            style: GoogleFonts.outfit(
                              fontSize: 13,
                              color: const Color(0xFFD35400),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
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
                                value: _progressAnimation.value == 0.0 && !_isDeliveredOrCancelled ? null : _progressAnimation.value,
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
                                  _isDeliveredOrCancelled ? 'Completed' : 'Minutes Left',
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

              Text(
                'Items Ordered',
                style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.black),
              ),
              const SizedBox(height: 12),

              // Item Display (Single rich card showing summary since we stored it as string)
              Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.grey.shade100),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withAlpha(4), blurRadius: 8, offset: const Offset(0, 3)),
                  ],
                ),
                child: Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(14),
                      child: Container(
                        width: 54,
                        height: 54,
                        color: const Color(0xFFF1F7F4),
                        padding: const EdgeInsets.all(4),
                        child: _buildImage(imgUrl),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            itemSummary,
                            style: GoogleFonts.sora(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.black),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            sugar.isNotEmpty ? 'Sugar: $sugar' : 'Standard',
                            style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey.shade500),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              if (addons.isNotEmpty)
                Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.grey.shade100),
                    boxShadow: [
                      BoxShadow(color: Colors.black.withAlpha(4), blurRadius: 8, offset: const Offset(0, 3)),
                    ],
                  ),
                  child: Row(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: Container(
                          width: 54,
                          height: 54,
                          color: const Color(0xFFFAF7F4),
                          padding: const EdgeInsets.all(12),
                          child: const Icon(Icons.cookie, color: Color(0xFF8B6B58)),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Add-ons',
                              style: GoogleFonts.sora(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.black),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              addons,
                              style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey.shade500),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

              const SizedBox(height: 28),

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
                    BoxShadow(color: Colors.black.withAlpha(4), blurRadius: 10, offset: const Offset(0, 4)),
                  ],
                ),
                child: Column(
                  children: [
                    _buildPricingRow('Total Paid', total, isTotal: true),
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

  Widget _buildPricingRow(String label, String value, {bool isTotal = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: GoogleFonts.sora(fontSize: isTotal ? 14 : 13, fontWeight: isTotal ? FontWeight.w700 : FontWeight.w500, color: Colors.black),
        ),
        Text(
          value,
          style: GoogleFonts.sora(
            fontSize: isTotal ? 16 : 13,
            fontWeight: isTotal ? FontWeight.w800 : FontWeight.w600,
            color: const Color(0xFF2D1E18),
          ),
        ),
      ],
    );
  }
}
