import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'home_screen.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _isGoogleSignedUp = false;
  bool _isSimulatingGoogle = false;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _simulateGoogleSignUp() {
    setState(() {
      _isSimulatingGoogle = true;
    });

    Future.delayed(const Duration(milliseconds: 1200), () {
      if (mounted) {
        setState(() {
          _isSimulatingGoogle = false;
          _isGoogleSignedUp = true;
          _emailController.text = 'maverickelias@gmail.com';
        });
      }
    });
  }

  void _onSignUp() {
    if (_formKey.currentState!.validate()) {
      // Simulate registration completion
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Account created successfully!')),
      );
      Future.delayed(const Duration(milliseconds: 800), () {
        if (mounted) {
          Navigator.of(context).pushAndRemoveUntil(
            MaterialPageRoute(builder: (context) => const HomeScreen()),
            (route) => false,
          );
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: Padding(
          padding: const EdgeInsets.all(8.0),
          child: GestureDetector(
            onTap: () => Navigator.of(context).maybePop(),
            child: Container(
              decoration: BoxDecoration(
                color: const Color(0xFFF5F5F5),
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
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 20),
                Text(
                  'Hey,\nSign Up Now',
                  style: GoogleFonts.sora(
                    fontSize: 32,
                    fontWeight: FontWeight.w700,
                    color: Colors.black,
                    height: 1.2,
                  ),
                ),
                const SizedBox(height: 32),

                if (!_isGoogleSignedUp) ...[
                  // Prompt to Sign Up with Google first
                  Center(
                    child: Column(
                      children: [
                        const SizedBox(height: 40),
                        Icon(
                          Icons.mail_lock_outlined,
                          size: 72,
                          color: Colors.grey.shade300,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Google Sign-Up Required',
                          style: GoogleFonts.sora(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                            color: Colors.black,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'To secure your account, please verify via Google.',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.outfit(
                            fontSize: 14,
                            color: Colors.grey.shade500,
                          ),
                        ),
                        const SizedBox(height: 32),
                        GestureDetector(
                          onTap: _isSimulatingGoogle ? null : _simulateGoogleSignUp,
                          child: Container(
                            height: 56,
                            decoration: BoxDecoration(
                              border: Border.all(color: Colors.grey.shade200, width: 1.5),
                              borderRadius: BorderRadius.circular(16),
                              color: Colors.white,
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                if (_isSimulatingGoogle)
                                  const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF8B6B58)),
                                    ),
                                  )
                                else ...[
                                  Image.network(
                                    'https://developers.google.com/static/identity/images/g-logo.png',
                                    height: 20,
                                    errorBuilder: (context, error, stackTrace) => const Icon(Icons.g_mobiledata),
                                  ),
                                  const SizedBox(width: 12),
                                  Text(
                                    'Sign Up with Google',
                                    style: GoogleFonts.sora(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                      color: Colors.black,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ] else ...[
                  // Full Name
                  TextFormField(
                    controller: _nameController,
                    style: GoogleFonts.outfit(color: Colors.black),
                    decoration: InputDecoration(
                      hintText: 'Full Name',
                      hintStyle: GoogleFonts.outfit(color: Colors.grey.shade400),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                      filled: true,
                      fillColor: Colors.white,
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: BorderSide(color: Colors.grey.shade200, width: 1.5),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: const BorderSide(color: Color(0xFF8B6B58), width: 1.5),
                      ),
                      errorBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: const BorderSide(color: Colors.redAccent, width: 1.5),
                      ),
                      focusedErrorBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: const BorderSide(color: Colors.redAccent, width: 1.5),
                      ),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Please enter your name';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),

                  // Pre-filled Email field (Disabled / Read-Only)
                  TextFormField(
                    controller: _emailController,
                    readOnly: true,
                    enabled: false,
                    style: GoogleFonts.outfit(color: Colors.grey.shade600),
                    decoration: InputDecoration(
                      hintText: 'Email',
                      hintStyle: GoogleFonts.outfit(color: Colors.grey.shade400),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                      filled: true,
                      fillColor: const Color(0xFFFAFAFA),
                      prefixIcon: const Icon(Icons.lock_outline, color: Colors.grey, size: 20),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: BorderSide(color: Colors.grey.shade200, width: 1.5),
                      ),
                      disabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: BorderSide(color: Colors.grey.shade100, width: 1.5),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Password
                  TextFormField(
                    controller: _passwordController,
                    obscureText: _obscurePassword,
                    style: GoogleFonts.outfit(color: Colors.black),
                    decoration: InputDecoration(
                      hintText: 'Password',
                      hintStyle: GoogleFonts.outfit(color: Colors.grey.shade400),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                      filled: true,
                      fillColor: Colors.white,
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                          color: Colors.grey.shade600,
                        ),
                        onPressed: () {
                          setState(() {
                            _obscurePassword = !_obscurePassword;
                          });
                        },
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: BorderSide(color: Colors.grey.shade200, width: 1.5),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: const BorderSide(color: Color(0xFF8B6B58), width: 1.5),
                      ),
                      errorBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: const BorderSide(color: Colors.redAccent, width: 1.5),
                      ),
                      focusedErrorBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: const BorderSide(color: Colors.redAccent, width: 1.5),
                      ),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Please enter password';
                      }
                      if (value.length < 8) {
                        return 'Password must be at least 8 characters';
                      }
                      return null;
                    },
                  ),
                  Padding(
                    padding: const EdgeInsets.only(left: 8.0, top: 4.0),
                    child: Text(
                      'Must be at least 8 characters.',
                      style: GoogleFonts.outfit(color: Colors.grey.shade400, fontSize: 12),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Repeat Password
                  TextFormField(
                    controller: _confirmPasswordController,
                    obscureText: _obscureConfirmPassword,
                    style: GoogleFonts.outfit(color: Colors.black),
                    decoration: InputDecoration(
                      hintText: 'Repeat Password',
                      hintStyle: GoogleFonts.outfit(color: Colors.grey.shade400),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                      filled: true,
                      fillColor: Colors.white,
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscureConfirmPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                          color: Colors.grey.shade600,
                        ),
                        onPressed: () {
                          setState(() {
                            _obscureConfirmPassword = !_obscureConfirmPassword;
                          });
                        },
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: BorderSide(color: Colors.grey.shade200, width: 1.5),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: const BorderSide(color: Color(0xFF8B6B58), width: 1.5),
                      ),
                      errorBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: const BorderSide(color: Colors.redAccent, width: 1.5),
                      ),
                      focusedErrorBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: const BorderSide(color: Colors.redAccent, width: 1.5),
                      ),
                    ),
                    validator: (value) {
                      if (value != _passwordController.text) {
                        return 'Passwords do not match';
                      }
                      return null;
                    },
                  ),
                  Padding(
                    padding: const EdgeInsets.only(left: 8.0, top: 4.0),
                    child: Text(
                      'Both passwords must match.',
                      style: GoogleFonts.outfit(color: Colors.grey.shade400, fontSize: 12),
                    ),
                  ),

                  const SizedBox(height: 32),

                  // Sign Up Button
                  GestureDetector(
                    onTap: _onSignUp,
                    child: Container(
                      width: double.infinity,
                      height: 56,
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E1E1E),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        'Sign Up',
                        style: GoogleFonts.sora(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ],

                const SizedBox(height: 48),

                // Bottom login link
                Center(
                  child: GestureDetector(
                    onTap: () {
                      Navigator.of(context).maybePop();
                    },
                    child: RichText(
                      text: TextSpan(
                        text: 'If you are olden, ',
                        style: GoogleFonts.outfit(color: Colors.grey.shade500, fontSize: 14),
                        children: [
                          TextSpan(
                            text: 'Login',
                            style: GoogleFonts.outfit(
                              color: Colors.black,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
