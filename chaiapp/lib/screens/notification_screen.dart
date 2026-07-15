import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'order_detail_screen.dart';

class NotificationScreen extends StatelessWidget {
  const NotificationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      return const Scaffold(body: Center(child: Text("Not logged in")));
    }

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
        child: StreamBuilder<QuerySnapshot>(
          stream: FirebaseFirestore.instance
              .collection('notifications')
              .where('userId', isEqualTo: user.uid)
              .orderBy('createdAt', descending: true)
              .snapshots(),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              // Firebase requires a composite index for where+orderBy. Show fallback if error
              return Center(child: Text('Requires Firestore Index. Please create it in console.'));
            }
            if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
              return Center(
                child: Text(
                  'No notifications yet.',
                  style: GoogleFonts.outfit(color: Colors.grey.shade400, fontSize: 16),
                ),
              );
            }

            final notifications = snapshot.data!.docs;

            return ListView.builder(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.all(20.0),
              itemCount: notifications.length,
              itemBuilder: (context, index) {
                final notifDoc = notifications[index];
                final notif = notifDoc.data() as Map<String, dynamic>;
                
                // parse time from Timestamp
                String timeAgo = 'Just now';
                if (notif['createdAt'] != null) {
                  final ts = notif['createdAt'] as Timestamp;
                  final diff = DateTime.now().difference(ts.toDate());
                  if (diff.inDays > 0) {
                    timeAgo = '${diff.inDays} days ago';
                  } else if (diff.inHours > 0) {
                    timeAgo = '${diff.inHours} hours ago';
                  } else if (diff.inMinutes > 0) {
                    timeAgo = '${diff.inMinutes} mins ago';
                  }
                }

                return GestureDetector(
                  onTap: () async {
                    if (notif['orderId'] != null && notif['orderId'].toString().isNotEmpty) {
                      showDialog(
                        context: context, 
                        barrierDismissible: false,
                        builder: (ctx) => const Center(child: CircularProgressIndicator())
                      );
                      
                      try {
                        final orderSnap = await FirebaseFirestore.instance.collection('orders').doc(notif['orderId']).get();
                        if (context.mounted) Navigator.pop(context);
                        if (orderSnap.exists && context.mounted) {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => OrderDetailScreen(orderData: {...orderSnap.data()!, 'id': orderSnap.id}),
                            ),
                          );
                          notifDoc.reference.update({'isRead': true});
                        }
                      } catch (e) {
                         if (context.mounted) Navigator.pop(context);
                      }
                    }
                  },
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: notif['isRead'] == true ? Colors.white : Colors.orange.shade50,
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
                          backgroundColor: Colors.orange.shade100,
                          child: const Icon(Icons.notifications_active, color: Colors.orange, size: 18),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Text(
                                      notif['title'] ?? 'Notification',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: GoogleFonts.sora(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.black),
                                    ),
                                  ),
                                  Text(
                                    timeAgo,
                                    style: GoogleFonts.outfit(fontSize: 10, color: Colors.grey.shade400),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                notif['body'] ?? '',
                                style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey.shade600, height: 1.3),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            );
          }
        ),
      ),
    );
  }
}
