import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'order_detail_screen.dart';

class OrderScreen extends StatelessWidget {
  const OrderScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final List<Map<String, dynamic>> activeOrders = [
      {
        'orderId': '#CHAI-78401',
        'items': '2x Adrak Chai, 1x Elaichi Chai',
        'status': 'Preparing...',
        'date': 'Today, 02:30 PM',
        'price': '₹135.00',
        'icon': Icons.hourglass_empty_rounded,
        'color': Colors.orange,
      },
    ];

    final List<Map<String, dynamic>> pastOrders = [
      {
        'orderId': '#CHAI-76390',
        'items': '1x Special Cappuccino, 1x Biscuits stack',
        'status': 'Delivered',
        'date': 'Yesterday, 10:15 AM',
        'price': '₹170.00',
        'icon': Icons.check_circle_rounded,
        'color': Colors.green,
      },
      {
        'orderId': '#CHAI-72901',
        'items': '1x Masala Chai',
        'status': 'Delivered',
        'date': '10 July 2026',
        'price': '₹50.00',
        'icon': Icons.check_circle_rounded,
        'color': Colors.green,
      },
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFFDFDFD),
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'My Orders',
                style: GoogleFonts.sora(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: Colors.black,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Track current deliveries or view purchase logs.',
                style: GoogleFonts.outfit(
                  fontSize: 14,
                  color: Colors.grey.shade500,
                ),
              ),
              const SizedBox(height: 24),

              // Active Orders
              Text(
                'Active Orders',
                style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.black),
              ),
              const SizedBox(height: 12),
              ...activeOrders.map(
                (order) => GestureDetector(
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (context) => OrderDetailScreen(
                          orderId: order['orderId'],
                        ),
                      ),
                    );
                  },
                  child: _buildOrderTile(order),
                ),
              ),

              const SizedBox(height: 28),

              // Past Orders
              Text(
                'Past Orders',
                style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.black),
              ),
              const SizedBox(height: 12),
              ...pastOrders.map((order) => _buildOrderTile(order)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOrderTile(Map<String, dynamic> order) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
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
      child: Row(
        children: [
          CircleAvatar(
            radius: 22,
            backgroundColor: order['color'].withAlpha(20),
            child: Icon(order['icon'], color: order['color'], size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      order['orderId'],
                      style: GoogleFonts.sora(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.black),
                    ),
                    Text(
                      order['price'],
                      style: GoogleFonts.sora(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF8B6B58)),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  order['items'],
                  style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey.shade600),
                ),
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      order['date'],
                      style: GoogleFonts.outfit(fontSize: 11, color: Colors.grey.shade400),
                    ),
                    Text(
                      order['status'],
                      style: GoogleFonts.sora(fontSize: 11, fontWeight: FontWeight.w600, color: order['color']),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
