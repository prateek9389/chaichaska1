import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../state/wallet_state.dart';

class UpdateProfileScreen extends StatefulWidget {
  const UpdateProfileScreen({super.key});

  @override
  State<UpdateProfileScreen> createState() => _UpdateProfileScreenState();
}

class _UpdateProfileScreenState extends State<UpdateProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameController;
  late TextEditingController _passwordController;
  late String _tempAvatarUrl;
  bool _obscurePassword = true;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: WalletState.profileName.value);
    _passwordController = TextEditingController(text: WalletState.password);
    _tempAvatarUrl = WalletState.avatarUrl.value;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

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
                      _tempAvatarUrl = url;
                    });
                    Navigator.of(context).pop();
                  },
                  child: Container(
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: _tempAvatarUrl == url ? const Color(0xFF8B6B58) : Colors.grey.shade200,
                        width: _tempAvatarUrl == url ? 3 : 1.5,
                      ),
                    ),
                    padding: const EdgeInsets.all(4),
                    child: CircleAvatar(
                      backgroundColor: const Color(0xFFFAF7F4),
                      backgroundImage: NetworkImage(url),
                    ),
                  ),
                );
              },
            ),
          ),
        );
      },
    );
  }

  void _onSave() {
    if (_formKey.currentState!.validate()) {
      WalletState.profileName.value = _nameController.text;
      WalletState.password = _passwordController.text;
      WalletState.avatarUrl.value = _tempAvatarUrl;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Profile updated successfully!'),
          backgroundColor: Colors.green,
        ),
      );
      Navigator.of(context).pop();
    }
  }

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
          'Edit Profile',
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
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Form(
            key: _formKey,
            child: Column(
              children: [
                const SizedBox(height: 20),

                // Avatar Editor Widget
                GestureDetector(
                  onTap: _showAvatarPickerDialog,
                  child: Stack(
                    alignment: Alignment.bottomRight,
                    children: [
                      Container(
                        width: 110,
                        height: 110,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: const Color(0xFF8B6B58), width: 3),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withAlpha(12),
                              blurRadius: 12,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: CircleAvatar(
                          backgroundColor: const Color(0xFFFAF7F4),
                          backgroundImage: NetworkImage(_tempAvatarUrl),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: const BoxDecoration(
                          color: Color(0xFF8B6B58),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.camera_alt_rounded,
                          color: Colors.white,
                          size: 16,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Tap avatar to choose character',
                  style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey.shade400),
                ),
                const SizedBox(height: 36),

                // Name field
                TextFormField(
                  controller: _nameController,
                  style: GoogleFonts.outfit(color: Colors.black),
                  decoration: InputDecoration(
                    labelText: 'Full Name',
                    labelStyle: GoogleFonts.outfit(color: Colors.grey.shade500),
                    prefixIcon: const Icon(Icons.person_outline_rounded, size: 20),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: Color(0xFF8B6B58), width: 1.5),
                    ),
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) return 'Full Name is required';
                    return null;
                  },
                ),
                const SizedBox(height: 20),

                // Password field
                TextFormField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  style: GoogleFonts.outfit(color: Colors.black),
                  decoration: InputDecoration(
                    labelText: 'Password',
                    labelStyle: GoogleFonts.outfit(color: Colors.grey.shade500),
                    prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20),
                    suffixIcon: GestureDetector(
                      onTap: () {
                        setState(() {
                          _obscurePassword = !_obscurePassword;
                        });
                      },
                      child: Icon(
                        _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                        size: 20,
                      ),
                    ),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: Color(0xFF8B6B58), width: 1.5),
                    ),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) return 'Password is required';
                    if (value.length < 6) return 'Password must be at least 6 characters';
                    return null;
                  },
                ),
                const SizedBox(height: 48),

                // Save button
                GestureDetector(
                  onTap: _onSave,
                  child: Container(
                    height: 52,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E1E1E),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      'Save Changes',
                      style: GoogleFonts.sora(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
