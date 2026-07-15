import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../state/wallet_state.dart';
import 'update_profile_screen.dart';
import 'addresses_screen.dart';
import 'help_center_screen.dart';
import 'wallet_screen.dart';
import 'package:firebase_auth/firebase_auth.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  void _showAvatarPickerDialog() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
          title: Text(
            'Choose Cartoon Avatar',
            style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w700),
          ),
          content: SizedBox(
            width: double.maxFinite,
            child: GridView.builder(
              shrinkWrap: true,
              itemCount: WalletState.cartoonAvatars.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
              ),
              itemBuilder: (context, index) {
                final url = WalletState.cartoonAvatars[index];
                return GestureDetector(
                  onTap: () {
                    setState(() {
                      WalletState.avatarUrl.value = url;
                    });
                    Navigator.of(context).pop();
                  },
                  child: ValueListenableBuilder<String>(
                    valueListenable: WalletState.avatarUrl,
                    builder: (context, currentUrl, child) {
                      final isSelected = currentUrl == url;
                      return Container(
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: isSelected ? const Color(0xFF8B6B58) : Colors.grey.shade200,
                            width: isSelected ? 3 : 1.5,
                          ),
                        ),
                        padding: const EdgeInsets.all(4),
                        child: CircleAvatar(
                          backgroundColor: const Color(0xFFFAF7F4),
                          backgroundImage: NetworkImage(url),
                        ),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;
    final String displayName = user?.displayName ?? 'Guest User';
    final String email = user?.email ?? 'No email provided';
    final String defaultAvatar = user?.photoURL ?? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120';

    return Scaffold(
      backgroundColor: const Color(0xFFFDFDFD),
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Beautiful Gradient Top Profile Header Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFF8B6B58), Color(0xFF5C4033)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.only(
                    bottomLeft: Radius.circular(32),
                    bottomRight: Radius.circular(32),
                  ),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'My Profile',
                          style: GoogleFonts.sora(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.white.withAlpha(40),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.stars_rounded, color: Colors.amber, size: 16),
                              const SizedBox(width: 4),
                              Text(
                                'Gold Member',
                                style: GoogleFonts.sora(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // Reactive profile details
                    Row(
                      children: [
                        // Dynamic Profile Cartoon Avatar
                        GestureDetector(
                          onTap: _showAvatarPickerDialog,
                          child: Stack(
                            alignment: Alignment.bottomRight,
                            children: [
                              ValueListenableBuilder<String>(
                                valueListenable: WalletState.avatarUrl,
                                builder: (context, url, child) {
                                  return Container(
                                    width: 80,
                                    height: 80,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      image: DecorationImage(
                                        image: NetworkImage(url.isEmpty ? defaultAvatar : url),
                                        fit: BoxFit.cover,
                                      ),
                                      border: Border.all(color: Colors.white.withAlpha(200), width: 3),
                                      boxShadow: [
                                        BoxShadow(
                                          color: Colors.black.withAlpha(20),
                                          blurRadius: 12,
                                          offset: const Offset(0, 4),
                                        ),
                                      ],
                                    ),
                                  );
                                },
                              ),
                              Container(
                                padding: const EdgeInsets.all(4),
                                decoration: const BoxDecoration(
                                  color: Colors.white,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.edit_rounded, color: Color(0xFF8B6B58), size: 12),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 20),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                displayName,
                                style: GoogleFonts.sora(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                email,
                                style: GoogleFonts.outfit(
                                  fontSize: 13,
                                  color: Colors.white.withAlpha(180),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 28),

                    // Quick Stats Container
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
                      decoration: BoxDecoration(
                        color: Colors.white.withAlpha(25),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _buildHeaderStat('Total Orders', '158'),
                          Container(width: 1, height: 24, color: Colors.white.withAlpha(50)),
                          _buildHeaderStat('Cups Brewed', '342 ☕'),
                          Container(width: 1, height: 24, color: Colors.white.withAlpha(50)),
                          _buildHeaderStat('Save Rate', '15% Off'),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 28),

              // Category 1: Preferences & Accounts
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24.0),
                child: Text(
                  'Account Settings',
                  style: GoogleFonts.sora(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: Colors.grey.shade400,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 20),
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
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
                    _buildSettingTile(
                      icon: Icons.person_outline_rounded,
                      title: 'Personal Info',
                      subtitle: 'Edit Name and Password credentials',
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (context) => const UpdateProfileScreen()),
                      ),
                    ),
                    _buildSettingTile(
                      icon: Icons.location_on_outlined,
                      title: 'My Addresses',
                      subtitle: 'Manage saved office & home addresses',
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (context) => const AddressesScreen()),
                      ),
                    ),
                    // Wallet Tile showing dynamic coins (Payment and Preferences removed)
                    ValueListenableBuilder<double>(
                      valueListenable: WalletState.balance,
                      builder: (context, balance, child) {
                        return _buildSettingTile(
                          icon: Icons.account_balance_wallet_outlined,
                          title: 'My Wallet',
                          subtitle: 'Recharge & check statements',
                          trailingText: '${balance.toStringAsFixed(0)} Coins',
                          onTap: () => Navigator.of(context).push(
                            MaterialPageRoute(builder: (context) => const WalletScreen()),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 28),

              // Category 2: Support & Settings
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24.0),
                child: Text(
                  'Preferences & Help',
                  style: GoogleFonts.sora(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: Colors.grey.shade400,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 20),
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
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
                    _buildSettingTile(
                      icon: Icons.help_outline_rounded,
                      title: 'Help Center',
                      subtitle: 'FAQ list, customer support chats & logs',
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (context) => const HelpCenterScreen()),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 36),

              // Premium Log Out Button
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24.0),
                child: GestureDetector(
                  onTap: () {
                    Navigator.of(context).pushNamedAndRemoveUntil('/', (route) => false);
                  },
                  child: Container(
                    height: 54,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: const Color(0xFFFCE8E6),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: const Color(0xFFF9D1CE), width: 1),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      'Log Out Account',
                      style: GoogleFonts.sora(
                        color: Colors.redAccent.shade700,
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeaderStat(String title, String value) {
    return Column(
      children: [
        Text(
          value,
          style: GoogleFonts.sora(
            fontSize: 15,
            fontWeight: FontWeight.w800,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          title,
          style: GoogleFonts.outfit(
            fontSize: 11,
            color: Colors.white.withAlpha(160),
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildSettingTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    String? trailingText,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        color: Colors.transparent, // Makes the entire row clickable
        child: Row(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: const Color(0xFFFAF7F4),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: const Color(0xFF8B6B58), size: 18),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: GoogleFonts.sora(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.black),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: GoogleFonts.outfit(fontSize: 11, color: Colors.grey.shade400),
                  ),
                ],
              ),
            ),
            if (trailingText != null) ...[
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: const Color(0xFFE8F1ED),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  trailingText,
                  style: GoogleFonts.sora(
                    color: const Color(0xFF2E7D32),
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: 8),
            ],
            Icon(Icons.arrow_forward_ios_rounded, color: Colors.grey.shade300, size: 12),
          ],
        ),
      ),
    );
  }
}
