import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'order_detail_screen.dart';
import 'subscription_detail_screen.dart';

class OrderScreen extends StatelessWidget {
  const OrderScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      return Scaffold(
        body: Center(
          child: Text("Please log in to view orders.", style: GoogleFonts.outfit()),
        ),
      );
    }

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: const Color(0xFFFDFDFD),
        appBar: AppBar(
          backgroundColor: const Color(0xFFFDFDFD),
          elevation: 0,
          toolbarHeight: 0, // hide main appbar since we use SafeArea
        ),
        body: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
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
                  ],
                ),
              ),
              TabBar(
                labelColor: const Color(0xFF8B6B58),
                unselectedLabelColor: Colors.grey,
                indicatorColor: const Color(0xFF8B6B58),
                labelStyle: GoogleFonts.sora(fontWeight: FontWeight.w600),
                unselectedLabelStyle: GoogleFonts.sora(fontWeight: FontWeight.w500),
                tabs: const [
                  Tab(text: 'One-Time'),
                  Tab(text: 'Subscriptions'),
                ],
              ),
              Expanded(
                child: TabBarView(
                  children: [
                    _buildOneTimeOrders(user),
                    _buildSubscriptions(user),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOneTimeOrders(User user) {
    return StreamBuilder<QuerySnapshot>(
      stream: FirebaseFirestore.instance
          .collection('orders')
          .where('userId', isEqualTo: user.uid)
          .orderBy('createdAt', descending: true)
          .snapshots(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator(color: Color(0xFF8B6B58)));
        }
        if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
          return Center(
            child: Text(
              "No orders found.",
              style: GoogleFonts.outfit(fontSize: 16, color: Colors.grey),
            ),
          );
        }

        final docs = snapshot.data!.docs;
        final List<Map<String, dynamic>> activeOrders = [];
        final List<Map<String, dynamic>> pastOrders = [];

        for (var doc in docs) {
          final data = doc.data() as Map<String, dynamic>;
          final priority = data['priority']?.toString() ?? '';
          if (priority == 'Subscription') {
            continue; // Skip subscriptions, they are in the other tab
          }

          final status = data['status']?.toString().toLowerCase() ?? '';
          if (status == 'delivered' || status == 'cancelled') {
            pastOrders.add(data);
          } else {
            activeOrders.add(data);
          }
        }

        return SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 16),
              if (activeOrders.isNotEmpty) ...[
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
                            orderData: order,
                          ),
                        ),
                      );
                    },
                    child: _buildOrderTile(order),
                  ),
                ),
                const SizedBox(height: 28),
              ],
              if (pastOrders.isNotEmpty) ...[
                Text(
                  'Past Orders',
                  style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.black),
                ),
                const SizedBox(height: 12),
                ...pastOrders.map(
                  (order) => GestureDetector(
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (context) => OrderDetailScreen(
                            orderData: order,
                          ),
                        ),
                      );
                    },
                    child: _buildOrderTile(order),
                  ),
                ),
                const SizedBox(height: 24),
              ],
            ],
          ),
        );
      },
    );
  }

  Widget _buildSubscriptions(User user) {
    return StreamBuilder<QuerySnapshot>(
      stream: FirebaseFirestore.instance
          .collection('subscriptions')
          .where('userId', isEqualTo: user.uid)
          .orderBy('createdAt', descending: true)
          .snapshots(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator(color: Color(0xFF8B6B58)));
        }
        if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
          return Center(
            child: Text(
              "No subscriptions found.",
              style: GoogleFonts.outfit(fontSize: 16, color: Colors.grey),
            ),
          );
        }

        final docs = snapshot.data!.docs;
        return ListView.builder(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.all(20.0),
          itemCount: docs.length,
          itemBuilder: (context, index) {
            final sub = docs[index].data() as Map<String, dynamic>;
            final subId = docs[index].id;
            return GestureDetector(
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (context) => SubscriptionDetailScreen(
                      subscriptionData: sub,
                      subscriptionId: subId,
                    ),
                  ),
                );
              },
              child: _buildSubscriptionTile(sub),
            );
          },
        );
      },
    );
  }

  Widget _buildSubscriptionTile(Map<String, dynamic> sub) {
    final status = sub['status']?.toString() ?? 'Unknown';
    Color statusColor = status == 'Active' ? Colors.green : Colors.orange;
    
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
            backgroundColor: statusColor.withAlpha(20),
            child: Icon(Icons.autorenew_rounded, color: statusColor, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        sub['item']?.toString() ?? 'Subscription',
                        style: GoogleFonts.sora(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.black),
                        maxLines: 1, overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Text(
                      '₹${sub['total']}',
                      style: GoogleFonts.sora(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF8B6B58)),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  sub['items']?.toString() ?? 'Items',
                  style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey.shade600),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '${sub['frequency']} | ${sub['timeSlot']}',
                      style: GoogleFonts.outfit(fontSize: 11, color: Colors.grey.shade400),
                    ),
                    Text(
                      status,
                      style: GoogleFonts.sora(fontSize: 11, fontWeight: FontWeight.w600, color: statusColor),
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

  Widget _buildOrderTile(Map<String, dynamic> order) {
    final status = order['status']?.toString() ?? 'Unknown';
    Color statusColor = Colors.orange;
    IconData statusIcon = Icons.hourglass_empty_rounded;

    if (status.toLowerCase() == 'delivered') {
      statusColor = Colors.green;
      statusIcon = Icons.check_circle_rounded;
    } else if (status.toLowerCase() == 'cancelled') {
      statusColor = Colors.red;
      statusIcon = Icons.cancel_rounded;
    } else if (status.toLowerCase() == 'out for delivery') {
      statusColor = Colors.blue;
      statusIcon = Icons.local_shipping_rounded;
    }

    final createdAt = order['createdAt'];
    String dateStr = '';
    if (createdAt is int) {
      final dt = DateTime.fromMillisecondsSinceEpoch(createdAt);
      final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      final hour = dt.hour > 12 ? dt.hour - 12 : (dt.hour == 0 ? 12 : dt.hour);
      final amPm = dt.hour >= 12 ? 'PM' : 'AM';
      final min = dt.minute.toString().padLeft(2, '0');
      dateStr = '${dt.day} ${months[dt.month - 1]} ${dt.year}, $hour:$min $amPm';
    }

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
            backgroundColor: statusColor.withAlpha(20),
            child: Icon(statusIcon, color: statusColor, size: 20),
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
                      order['orderId']?.toString() ?? '#UNKNOWN',
                      style: GoogleFonts.sora(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.black),
                    ),
                    Text(
                      order['total']?.toString() ?? '₹0.00',
                      style: GoogleFonts.sora(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF8B6B58)),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  order['item']?.toString() ?? 'Items',
                  style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey.shade600),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      dateStr,
                      style: GoogleFonts.outfit(fontSize: 11, color: Colors.grey.shade400),
                    ),
                    Text(
                      status,
                      style: GoogleFonts.sora(fontSize: 11, fontWeight: FontWeight.w600, color: statusColor),
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
