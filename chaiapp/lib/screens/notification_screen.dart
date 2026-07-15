import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class NotificationScreen extends StatelessWidget {
  const NotificationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final List<Map<String, dynamic>> notifications = [
      {
        'title': 'Order Dispatched 🚚',
        'body': 'Your order #CHAI-78401 is out for delivery. Hot and fresh!',
        'time': 'Just now',
        'icon': Icons.delivery_dining_rounded,
        'color': Colors.green,
      },
      {
        'title': 'Subscription Renewed 🔄',
        'body': 'Your weekly "Daily Chai Pass" has been renewed automatically.',
        'time': '2 hours ago',
        'icon': Icons.autorenew_rounded,
        'color': Colors.blue,
      },
      {
        'title': 'Grab 20% Off! 🏷️',
        'body': 'Enjoy 20% discount on all custom tea and snacks orders today.',
        'time': '1 day ago',
        'icon': Icons.local_offer_outlined,
        'color': Colors.redAccent,
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
          'Notifications',
          style: GoogleFonts.sora(
            color: Colors.black,
            fontSize: 18,
            fontWeight: FontWeight.w700,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: notifications.isEmpty
            ? Center(
                child: Text(
                  'No notifications yet.',
                  style: GoogleFonts.outfit(color: Colors.grey.shade400, fontSize: 16),
                ),
              )
            : ListView.builder(
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.all(20.0),
                itemCount: notifications.length,
                itemBuilder: (context, index) {
                  final notif = notifications[index];
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
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        CircleAvatar(
                          radius: 20,
                          backgroundColor: notif['color'].withAlpha(20),
                          child: Icon(notif['icon'], color: notif['color'], size: 18),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    notif['title'],
                                    style: GoogleFonts.sora(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.black),
                                  ),
                                  Text(
                                    notif['time'],
                                    style: GoogleFonts.outfit(fontSize: 10, color: Colors.grey.shade400),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                notif['body'],
                                style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey.shade600, height: 1.3),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
      ),
    );
  }
}
