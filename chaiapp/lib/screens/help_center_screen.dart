import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class HelpCenterScreen extends StatelessWidget {
  const HelpCenterScreen({super.key});

  @override
  Widget build(BuildContext context) {
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
          'Help & Support',
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
              Text(
                'Frequently Asked Questions',
                style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.black),
              ),
              const SizedBox(height: 6),
              Text(
                'Find quick answers to common support questions below.',
                style: GoogleFonts.outfit(fontSize: 13, color: Colors.grey.shade500),
              ),
              const SizedBox(height: 24),

              _buildFaqSection(
                title: 'Delivery & Ordering',
                faqs: [
                  {
                    'q': 'How long does delivery take?',
                    'a': 'We deliver hot chai, coffee, and snacks within 10-15 minutes direct to your office floor.',
                  },
                  {
                    'q': 'What are the delivery charges?',
                    'a': 'Delivery is absolutely free on all subscription plans and orders above ₹200. Otherwise, a flat ₹15 fee applies.',
                  },
                ],
              ),
              const SizedBox(height: 20),

              _buildFaqSection(
                title: 'Wallet & Coins',
                faqs: [
                  {
                    'q': 'What is the Coin conversion rate?',
                    'a': '1 Coin equals ₹1.00. You can easily recharge your wallet using UPI, Credit Cards, or Netbanking.',
                  },
                  {
                    'q': 'Can I refund my wallet coins?',
                    'a': 'Wallet credits/coins are non-refundable but do not have an expiration date. You can use them anytime.',
                  },
                ],
              ),
              const SizedBox(height: 20),

              _buildFaqSection(
                title: 'Subscriptions',
                faqs: [
                  {
                    'q': 'How does the weekly/monthly plan work?',
                    'a': 'Subscriptions guarantee your selected slot delivery (Morning, Evening, or both) every weekday with a flat 10% discount on all orders.',
                  },
                  {
                    'q': 'How do I cancel or pause my subscription?',
                    'a': 'You can pause or stop your delivery slots directly under the active order details page at any time.',
                  },
                ],
              ),
              const SizedBox(height: 36),

              // Contact support card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: const Color(0xFFFAF7F4),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: const Color(0xFFF1EDE9), width: 1.5),
                ),
                child: Column(
                  children: [
                    const Icon(Icons.headset_mic_rounded, color: Color(0xFF8B6B58), size: 36),
                    const SizedBox(height: 12),
                    Text(
                      'Still need help?',
                      style: GoogleFonts.sora(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.black),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Our customer service tea captains are online 24/7.',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey.shade500),
                    ),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E1E1E),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Text(
                        'Start Live Chat',
                        style: GoogleFonts.sora(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w700),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFaqSection({
    required String title,
    required List<Map<String, String>> faqs,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4.0, bottom: 8),
          child: Text(
            title.toUpperCase(),
            style: GoogleFonts.sora(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF8B6B58),
            ),
          ),
        ),
        ...faqs.map((faq) {
          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.shade100),
            ),
            child: ExpansionTile(
              title: Text(
                faq['q']!,
                style: GoogleFonts.sora(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: Colors.black,
                ),
              ),
              iconColor: const Color(0xFF8B6B58),
              collapsedIconColor: Colors.grey.shade400,
              shape: const Border(), // Removes bottom/top lines when expanded
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  child: Text(
                    faq['a']!,
                    style: GoogleFonts.outfit(
                      fontSize: 12.5,
                      color: Colors.grey.shade600,
                      height: 1.4,
                    ),
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }
}
