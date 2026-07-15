import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../state/wallet_state.dart';

class WalletScreen extends StatefulWidget {
  final double? deductAmount;
  final String? orderDetails;

  const WalletScreen({
    super.key,
    this.deductAmount,
    this.orderDetails,
  });

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  final TextEditingController _rechargeAmountController = TextEditingController();

  @override
  void initState() {
    super.initState();
    // If an order deduction is passed from checkout
    if (widget.deductAmount != null) {
      final orderCost = widget.deductAmount!;
      if (WalletState.balance.value >= orderCost) {
        WalletState.balance.value -= orderCost;
        WalletState.addTransaction(
          title: widget.orderDetails ?? 'Chai Order placed',
          amount: orderCost,
          isCredit: false,
        );
      } else {
        // Insufficient balance warning
        WidgetsBinding.instance.addPostFrameCallback((_) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Insufficient balance! Please recharge to complete order.'),
              backgroundColor: Colors.redAccent,
            ),
          );
        });
      }
    }
  }

  @override
  void dispose() {
    _rechargeAmountController.dispose();
    super.dispose();
  }

  void _triggerQRRecharge(double rechargeAmount) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return _QRRechargeDialog(
          amount: rechargeAmount,
          onSuccess: () async {
            setState(() {
              WalletState.balance.value += rechargeAmount;
              WalletState.addTransaction(
                title: 'Wallet Recharge Credit ⚡',
                amount: rechargeAmount,
                isCredit: true,
              );
            });
            
            final user = FirebaseAuth.instance.currentUser;
            if (user != null) {
              try {
                final dt = DateTime.now();
                final dateString = "${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}";
                
                // Update the user's wallet balance in Firestore
                await FirebaseFirestore.instance.collection('users').doc(user.uid).set({
                  'wallet': FieldValue.increment(rechargeAmount)
                }, SetOptions(merge: true));

                // Log the recharge
                await FirebaseFirestore.instance.collection('recharges').add({
                  'userId': user.uid,
                  'customer': user.displayName ?? "App User",
                  'amount': rechargeAmount,
                  'status': 'Success',
                  'createdAt': dt.millisecondsSinceEpoch,
                  'date': dateString,
                });
              } catch (e) {
                debugPrint("Failed to record recharge in Firebase: $e");
              }
            }
          },
        );
      },
    );
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
            onTap: () {
              Navigator.of(context).pop();
            },
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
          'My Wallet',
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
              // ValueListenableBuilder listening to shared WalletState.balance
              ValueListenableBuilder<double>(
                valueListenable: WalletState.balance,
                builder: (context, currentBalance, child) {
                  return TweenAnimationBuilder<double>(
                    tween: Tween<double>(begin: 0.0, end: currentBalance),
                    duration: const Duration(milliseconds: 1000),
                    curve: Curves.easeOutCubic,
                    builder: (context, animatedValue, child) {
                      return Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF8B6B58), Color(0xFF5C4033)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(28),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF5C4033).withAlpha(30),
                              blurRadius: 16,
                              offset: const Offset(0, 8),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'Chai Coins Card',
                                  style: GoogleFonts.outfit(
                                    color: Colors.white.withAlpha(200),
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                const Icon(Icons.stars_rounded, color: Colors.amber, size: 24),
                              ],
                            ),
                            const SizedBox(height: 24),
                            Text(
                              '${animatedValue.toStringAsFixed(0)} Coins',
                              style: GoogleFonts.sora(
                                color: Colors.white,
                                fontSize: 32,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '1 Coin = ₹1.00  •  Available: ₹${animatedValue.toStringAsFixed(2)}',
                              style: GoogleFonts.outfit(
                                color: Colors.white.withAlpha(160),
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  );
                },
              ),
              const SizedBox(height: 28),

              // Recharge Section with Input Fields
              Text(
                'Recharge Wallet',
                style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.black),
              ),
              const SizedBox(height: 12),
              Container(
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
                child: Column(
                  children: [
                    Row(
                      children: [
                        _buildQuickAmountBtn(100),
                        _buildQuickAmountBtn(200),
                        _buildQuickAmountBtn(500),
                      ],
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _rechargeAmountController,
                      keyboardType: TextInputType.number,
                      style: GoogleFonts.outfit(color: Colors.black, fontSize: 14),
                      decoration: InputDecoration(
                        hintText: 'Enter custom amount (₹)',
                        hintStyle: GoogleFonts.outfit(color: Colors.grey.shade400),
                        prefixIcon: const Icon(Icons.account_balance_wallet_outlined, size: 18),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: Colors.grey.shade200),
                        ),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 14),
                    GestureDetector(
                      onTap: () {
                        final val = double.tryParse(_rechargeAmountController.text) ?? 0.0;
                        if (val > 0) {
                          _triggerQRRecharge(val);
                        } else {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Please enter a valid amount to recharge')),
                          );
                        }
                      },
                      child: Container(
                        width: double.infinity,
                        height: 48,
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E1E1E),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          'Recharge Now',
                          style: GoogleFonts.sora(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // Recent Transactions Feed
              Text(
                'Recent Transactions',
                style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.black),
              ),
              const SizedBox(height: 12),
              ...WalletState.transactions.map((tx) {
                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: Colors.grey.shade100),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            tx['title'],
                            style: GoogleFonts.sora(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.black),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            tx['date'],
                            style: GoogleFonts.outfit(fontSize: 11, color: Colors.grey.shade400),
                          ),
                        ],
                      ),
                      Text(
                        tx['amount'],
                        style: GoogleFonts.sora(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: tx['isCredit'] ? Colors.green.shade700 : Colors.redAccent.shade700,
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQuickAmountBtn(double amount) {
    return Expanded(
      child: GestureDetector(
        onTap: () {
          setState(() {
            _rechargeAmountController.text = amount.toStringAsFixed(0);
          });
        },
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 4),
          height: 40,
          decoration: BoxDecoration(
            color: const Color(0xFFFAF7F4),
            border: Border.all(color: const Color(0xFFF1EDE9), width: 1.5),
            borderRadius: BorderRadius.circular(10),
          ),
          alignment: Alignment.center,
          child: Text(
            '+₹${amount.toInt()}',
            style: GoogleFonts.sora(
              color: const Color(0xFF2D1E18),
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ),
    );
  }
}

// Stateful Dialog representing the UPI Scan QR Code and Animation
class _QRRechargeDialog extends StatefulWidget {
  final double amount;
  final VoidCallback onSuccess;

  const _QRRechargeDialog({
    required this.amount,
    required this.onSuccess,
  });

  @override
  State<_QRRechargeDialog> createState() => _QRRechargeDialogState();
}

class _QRRechargeDialogState extends State<_QRRechargeDialog> with SingleTickerProviderStateMixin {
  int _rechargeState = 0; // 0 for Loading/QR code display, 1 for Payment Success checkmark
  Timer? _simulatedPaymentTimer;

  late AnimationController _checkAnimController;
  late Animation<double> _checkScale;

  @override
  void initState() {
    super.initState();
    _checkAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _checkScale = CurvedAnimation(parent: _checkAnimController, curve: Curves.elasticOut);

    // Simulate standard UPI QR payment response time
    _simulatedPaymentTimer = Timer(const Duration(milliseconds: 3200), () {
      if (mounted) {
        setState(() {
          _rechargeState = 1;
        });
        _checkAnimController.forward();
        widget.onSuccess();
      }
    });
  }

  @override
  void dispose() {
    _simulatedPaymentTimer?.cancel();
    _checkAnimController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      backgroundColor: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(28.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (_rechargeState == 0) ...[
              Text(
                'Scan QR to Pay',
                style: GoogleFonts.sora(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.black),
              ),
              const SizedBox(height: 6),
              Text(
                'Amount: ₹${widget.amount.toStringAsFixed(2)}',
                style: GoogleFonts.outfit(fontSize: 13, color: const Color(0xFF8B6B58), fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 24),

              // Mock UPI QR code UI illustration
              Container(
                width: 170,
                height: 170,
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.shade200, width: 1.5),
                ),
                child: const Icon(Icons.qr_code_2_rounded, size: 150, color: Colors.black),
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF8B6B58)),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    'Awaiting payment verification...',
                    style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey.shade500),
                  ),
                ],
              ),
            ] else ...[
              // Checkmark animation
              ScaleTransition(
                scale: _checkScale,
                child: const CircleAvatar(
                  radius: 36,
                  backgroundColor: Color(0xFFE8F1ED),
                  child: Icon(Icons.check_rounded, color: Color(0xFF2E7D32), size: 40),
                ),
              ),
              const SizedBox(height: 20),
              Text(
                'Payment Done!',
                style: GoogleFonts.sora(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.black),
              ),
              const SizedBox(height: 6),
              Text(
                'Added ${widget.amount.toStringAsFixed(0)} Coins to Wallet',
                style: GoogleFonts.outfit(fontSize: 13, color: Colors.grey.shade500),
              ),
              const SizedBox(height: 24),
              GestureDetector(
                onTap: () => Navigator.of(context).pop(),
                child: Container(
                  width: double.infinity,
                  height: 48,
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E1E1E),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    'Done',
                    style: GoogleFonts.sora(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
