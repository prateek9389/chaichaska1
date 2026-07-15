import 'package:flutter/material.dart';

class WalletState {
  // Global wallet balance value notifier, starting at 0 Coins
  static final ValueNotifier<double> balance = ValueNotifier<double>(0.0);

  // Profile data
  static final ValueNotifier<String> profileName = ValueNotifier<String>('Maverick Elias');
  static final ValueNotifier<String> avatarUrl = ValueNotifier<String>('');
  static String password = 'Password123';

  // Pre-configured cartoon avatars (Dicebear PNGs)
  static final List<String> cartoonAvatars = [
    'https://api.dicebear.com/7.x/adventurer/png?seed=Felix',
    'https://api.dicebear.com/7.x/fun-emoji/png?seed=Oliver',
    'https://api.dicebear.com/7.x/lorelei/png?seed=Bella',
    'https://api.dicebear.com/7.x/personas/png?seed=Jack',
    'https://api.dicebear.com/7.x/adventurer/png?seed=Aneka',
    'https://api.dicebear.com/7.x/fun-emoji/png?seed=Milo',
  ];

  // Saved Addresses list ValueNotifier
  static final ValueNotifier<List<Map<String, String>>> savedAddresses = ValueNotifier<List<Map<String, String>>>([]);

  // Global transaction log shared across screens
  static final List<Map<String, dynamic>> transactions = [
    {
      'title': 'Wallet Welcome Bonus 🎁',
      'date': '10 July 2026',
      'amount': '+₹50.00',
      'isCredit': true,
    },
    {
      'title': 'Chai Order - #CHAI-69021',
      'date': '08 July 2026',
      'amount': '-₹45.00',
      'isCredit': false,
    },
  ];

  static void addTransaction({
    required String title,
    required double amount,
    required bool isCredit,
  }) {
    transactions.insert(0, {
      'title': title,
      'date': 'Just now',
      'amount': '${isCredit ? "+" : "-"}₹${amount.toStringAsFixed(2)}',
      'isCredit': isCredit,
    });
  }
}
