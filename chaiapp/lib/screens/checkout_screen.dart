import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'wallet_screen.dart';
import 'thank_you_screen.dart';
import 'addresses_screen.dart';
import '../state/wallet_state.dart';

class CheckoutScreen extends StatefulWidget {
  final String productName;
  final String productPrice; // e.g. "₹45.00"
  final String sugarOption;
  final int quantity;

  const CheckoutScreen({
    super.key,
    required this.productName,
    required this.productPrice,
    required this.sugarOption,
    required this.quantity,
  });

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _formKey = GlobalKey<FormState>();
  final _customTimeController = TextEditingController();

  int _selectedAddressIndex = 0;
  int _selectedPurchaseType = 0; // 0 for Buy One-time, 1 for Subscription

  // Subscription Slot states
  bool _slotMorningSelected = false;
  bool _slotEveningSelected = false;
  bool _slotCustomSelected = false;

  // 6 Add-ons including Namkeen, Biscuits, and Toast
  final List<Map<String, dynamic>> _addons = [
    {
      'name': 'Choco Cookies',
      'price': 20.00,
      'imagePath': 'assets/images/biscuits_cookies.png',
    },
    {
      'name': 'Crispy Sev',
      'price': 15.00,
      'imagePath': 'assets/images/namkeen_mix.png',
    },
    {
      'name': 'Toast Rusk',
      'price': 12.00,
      'imagePath': 'assets/images/toast_rusk.png',
    },
    {
      'name': 'Oatmeal Biscuit',
      'price': 25.00,
      'imagePath': 'assets/images/biscuits_cookies.png',
    },
    {
      'name': 'Masala Peanuts',
      'price': 18.00,
      'imagePath': 'assets/images/namkeen_mix.png',
    },
    {
      'name': 'Butter Toast',
      'price': 15.00,
      'imagePath': 'assets/images/toast_rusk.png',
    },
  ];

  final List<String> _selectedAddons = [];

  @override
  void dispose() {
    _customTimeController.dispose();
    super.dispose();
  }

  double _calculateTotal() {
    final priceStr = widget.productPrice.replaceAll('₹', '').trim();
    final price = double.tryParse(priceStr) ?? 0.0;
    double baseTotal = price * widget.quantity;

    // Add selected Add-ons prices
    double addonsTotal = 0.0;
    for (var addonName in _selectedAddons) {
      final addon = _addons.firstWhere((a) => a['name'] == addonName);
      addonsTotal += (addon['price'] as double);
    }

    if (_selectedPurchaseType == 1) {
      // 10% discount on base total + addons total for subscriptions
      return (baseTotal + addonsTotal) * 0.9;
    }
    return baseTotal + addonsTotal;
  }

  void _onPlaceOrder() {
    if (WalletState.savedAddresses.value.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please add a delivery address to place your order.'),
          backgroundColor: Colors.redAccent,
        ),
      );
      return;
    }

    if (_formKey.currentState!.validate()) {
      final orderCost = _calculateTotal();
      final orderTitle = _selectedPurchaseType == 1
          ? 'Sub: ${widget.productName} 🔄'
          : 'Buy: ${widget.productName} ☕';

      if (WalletState.balance.value >= orderCost) {
        // Sufficient Balance -> Deduct & Route to ThankYouScreen
        WalletState.balance.value -= orderCost;
        WalletState.addTransaction(
          title: orderTitle,
          amount: orderCost,
          isCredit: false,
        );

        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (context) => const ThankYouScreen(),
          ),
        );
      } else {
        // Insufficient Balance -> Redirect to WalletScreen to Recharge
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (context) => WalletScreen(
              deductAmount: orderCost,
              orderDetails: orderTitle,
            ),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final double totalAmount = _calculateTotal();

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
          'Checkout',
          style: GoogleFonts.sora(
            color: Colors.black,
            fontSize: 18,
            fontWeight: FontWeight.w700,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Order Summary Section
                      Text(
                        'Order Summary',
                        style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.black),
                      ),
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: Colors.grey.shade100),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    widget.productName,
                                    style: GoogleFonts.sora(fontSize: 15, fontWeight: FontWeight.w600),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Sugar: ${widget.sugarOption}  •  Qty: ${widget.quantity}',
                                    style: GoogleFonts.outfit(fontSize: 13, color: Colors.grey.shade500),
                                  ),
                                ],
                              ),
                            ),
                            Text(
                              '₹${(widget.quantity * (double.tryParse(widget.productPrice.replaceAll('₹', '').trim()) ?? 0.0)).toStringAsFixed(2)}',
                              style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.black),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Office details Address Section
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Delivery Address',
                            style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.black),
                          ),
                          TextButton.icon(
                            onPressed: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(builder: (context) => const AddressesScreen()),
                              ).then((_) {
                                setState(() {
                                  // Clamp index in case address list changed
                                  if (_selectedAddressIndex >= WalletState.savedAddresses.value.length) {
                                    _selectedAddressIndex = 0;
                                  }
                                });
                              });
                            },
                            icon: const Icon(Icons.edit_location_alt_rounded, size: 16, color: Color(0xFF8B6B58)),
                            label: Text(
                              'Manage',
                              style: GoogleFonts.sora(color: const Color(0xFF8B6B58), fontSize: 12, fontWeight: FontWeight.w600),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),

                      ValueListenableBuilder<List<Map<String, String>>>(
                        valueListenable: WalletState.savedAddresses,
                        builder: (context, addressesList, child) {
                          if (addressesList.isEmpty) {
                            return GestureDetector(
                              onTap: () {
                                Navigator.of(context).push(
                                  MaterialPageRoute(builder: (context) => const AddressesScreen()),
                                );
                              },
                              child: Container(
                                width: double.infinity,
                                padding: const EdgeInsets.symmetric(vertical: 20),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFAF7F4),
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(color: const Color(0xFFF1EDE9), width: 1.5),
                                ),
                                child: Column(
                                  children: [
                                    const Icon(Icons.add_location_alt_rounded, color: Color(0xFF8B6B58), size: 28),
                                    const SizedBox(height: 8),
                                    Text(
                                      'Add Delivery Address to Proceed',
                                      style: GoogleFonts.sora(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.black),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          }

                          return SizedBox(
                            height: 105,
                            child: ListView.builder(
                              scrollDirection: Axis.horizontal,
                              physics: const BouncingScrollPhysics(),
                              itemCount: addressesList.length,
                              itemBuilder: (context, idx) {
                                final addr = addressesList[idx];
                                final isSelected = _selectedAddressIndex == idx;
                                return GestureDetector(
                                  onTap: () {
                                    setState(() {
                                      _selectedAddressIndex = idx;
                                    });
                                  },
                                  child: AnimatedContainer(
                                    duration: const Duration(milliseconds: 200),
                                    width: 250,
                                    margin: const EdgeInsets.only(right: 12, bottom: 8),
                                    padding: const EdgeInsets.all(14),
                                    decoration: BoxDecoration(
                                      color: isSelected ? const Color(0xFFFAF7F4) : Colors.white,
                                      borderRadius: BorderRadius.circular(18),
                                      border: Border.all(
                                        color: isSelected ? const Color(0xFF8B6B58) : Colors.grey.shade200,
                                        width: isSelected ? 2 : 1.5,
                                      ),
                                      boxShadow: [
                                        BoxShadow(
                                          color: Colors.black.withAlpha(3),
                                          blurRadius: 6,
                                          offset: const Offset(0, 3),
                                        ),
                                      ],
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Row(
                                          children: [
                                            Icon(
                                              Icons.business_rounded,
                                              size: 16,
                                              color: isSelected ? const Color(0xFF8B6B58) : Colors.grey,
                                            ),
                                            const SizedBox(width: 6),
                                            Text(
                                              addr['label'] ?? '',
                                              style: GoogleFonts.sora(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.black),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          '${addr['officeNumber']}, ${addr['officeName']}, Floor ${addr['floor']}',
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: GoogleFonts.outfit(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.grey.shade600),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                          );
                        },
                      ),
                      const SizedBox(height: 24),

                      // Add-ons Carousel Section (Shown on Top / Both selections)
                      Text(
                        'Add Extra Munchies (Add-ons)',
                        style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.black),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        height: 100,
                        child: ListView.builder(
                          scrollDirection: Axis.horizontal,
                          physics: const BouncingScrollPhysics(),
                          itemCount: _addons.length,
                          itemBuilder: (context, index) {
                            final addon = _addons[index];
                            final isSelected = _selectedAddons.contains(addon['name']);
                            return GestureDetector(
                              onTap: () {
                                setState(() {
                                  if (isSelected) {
                                    _selectedAddons.remove(addon['name']);
                                  } else {
                                    _selectedAddons.add(addon['name']);
                                  }
                                });
                              },
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 200),
                                width: 140,
                                margin: const EdgeInsets.only(right: 12, bottom: 6),
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: isSelected ? const Color(0xFFFAF7F4) : Colors.white,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: isSelected ? const Color(0xFF8B6B58) : Colors.grey.shade200,
                                    width: isSelected ? 2 : 1.5,
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withAlpha(4),
                                      blurRadius: 6,
                                      offset: const Offset(0, 3),
                                    ),
                                  ],
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 32,
                                      height: 32,
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFFAF7F4),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: ClipRRect(
                                        borderRadius: BorderRadius.circular(8),
                                        child: Image.asset(
                                          addon['imagePath'],
                                          fit: BoxFit.cover,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Text(
                                            addon['name'],
                                            style: GoogleFonts.sora(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.black),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            '+₹${addon['price']}',
                                            style: GoogleFonts.outfit(fontSize: 10, fontWeight: FontWeight.w600, color: const Color(0xFF8B6B58)),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Purchase Types Section (One-Time vs Subscription)
                      Text(
                        'Purchase Type',
                        style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.black),
                      ),
                      const SizedBox(height: 12),

                      Row(
                        children: [
                          // Buy One-Time Card
                          Expanded(
                            child: GestureDetector(
                              onTap: () {
                                setState(() {
                                  _selectedPurchaseType = 0;
                                });
                              },
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 250),
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                                decoration: BoxDecoration(
                                  color: _selectedPurchaseType == 0 ? const Color(0xFFFDE8E1) : Colors.white,
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(
                                    color: _selectedPurchaseType == 0 ? const Color(0xFF8B6B58) : Colors.grey.shade200,
                                    width: 2,
                                  ),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Icon(
                                      Icons.shopping_basket_outlined,
                                      color: _selectedPurchaseType == 0 ? const Color(0xFF8B6B58) : Colors.grey.shade400,
                                      size: 24,
                                    ),
                                    const SizedBox(height: 12),
                                    Text(
                                      'One-Time Buy',
                                      style: GoogleFonts.sora(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.black),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'Order just for today',
                                      style: GoogleFonts.outfit(fontSize: 11, color: Colors.grey.shade500),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 16),

                          // Get Subscription Card
                          Expanded(
                            child: GestureDetector(
                              onTap: () {
                                setState(() {
                                  _selectedPurchaseType = 1;
                                });
                              },
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 250),
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                                decoration: BoxDecoration(
                                  color: _selectedPurchaseType == 1 ? const Color(0xFFE8F1ED) : Colors.white,
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(
                                    color: _selectedPurchaseType == 1 ? const Color(0xFF2E7D32) : Colors.grey.shade200,
                                    width: 2,
                                  ),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Icon(
                                      Icons.autorenew_rounded,
                                      color: _selectedPurchaseType == 1 ? const Color(0xFF2E7D32) : Colors.grey.shade400,
                                      size: 24,
                                    ),
                                    const SizedBox(height: 12),
                                    Text(
                                      'Subscription',
                                      style: GoogleFonts.sora(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.black),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'Save 10% on weekly/monthly plan',
                                      style: GoogleFonts.outfit(fontSize: 11, color: Colors.grey.shade500),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),

                      // Dynamic Subscription Settings Section
                      if (_selectedPurchaseType == 1) ...[
                        Text(
                          'Select Delivery Slots',
                          style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.black),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            // Morning slot
                            Expanded(
                              child: GestureDetector(
                                onTap: () {
                                  setState(() {
                                    _slotMorningSelected = !_slotMorningSelected;
                                  });
                                },
                                child: AnimatedContainer(
                                  duration: const Duration(milliseconds: 200),
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: _slotMorningSelected ? const Color(0xFFE8F1ED) : Colors.white,
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(
                                      color: _slotMorningSelected ? const Color(0xFF2E7D32) : Colors.grey.shade200,
                                      width: 1.5,
                                    ),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Icon(Icons.wb_sunny_outlined, color: _slotMorningSelected ? const Color(0xFF2E7D32) : Colors.grey.shade400, size: 20),
                                      const SizedBox(height: 8),
                                      Text(
                                        'Morning',
                                        style: GoogleFonts.sora(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.black),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        '8AM - 11AM',
                                        style: GoogleFonts.outfit(fontSize: 10, color: Colors.grey.shade500),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),

                            // Evening slot
                            Expanded(
                              child: GestureDetector(
                                onTap: () {
                                  setState(() {
                                    _slotEveningSelected = !_slotEveningSelected;
                                  });
                                },
                                child: AnimatedContainer(
                                  duration: const Duration(milliseconds: 200),
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: _slotEveningSelected ? const Color(0xFFFAF2EE) : Colors.white,
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(
                                      color: _slotEveningSelected ? const Color(0xFF8B6B58) : Colors.grey.shade200,
                                      width: 1.5,
                                    ),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Icon(Icons.wb_twilight_rounded, color: _slotEveningSelected ? const Color(0xFF8B6B58) : Colors.grey.shade400, size: 20),
                                      const SizedBox(height: 8),
                                      Text(
                                        'Evening',
                                        style: GoogleFonts.sora(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.black),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        '4PM - 7PM',
                                        style: GoogleFonts.outfit(fontSize: 10, color: Colors.grey.shade500),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),

                            // Custom slot
                            Expanded(
                              child: GestureDetector(
                                onTap: () {
                                  setState(() {
                                    _slotCustomSelected = !_slotCustomSelected;
                                  });
                                },
                                child: AnimatedContainer(
                                  duration: const Duration(milliseconds: 200),
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: _slotCustomSelected ? const Color(0xFFFAF6F2) : Colors.white,
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(
                                      color: _slotCustomSelected ? const Color(0xFF5C4033) : Colors.grey.shade200,
                                      width: 1.5,
                                    ),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Icon(Icons.alarm_rounded, color: _slotCustomSelected ? const Color(0xFF5C4033) : Colors.grey.shade400, size: 20),
                                      const SizedBox(height: 8),
                                      Text(
                                        'Custom',
                                        style: GoogleFonts.sora(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.black),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        'Add delivery time',
                                        style: GoogleFonts.outfit(fontSize: 10, color: Colors.grey.shade500),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),

                        // Custom Time slot input field if Custom Slot is active
                        if (_slotCustomSelected) ...[
                          TextFormField(
                            controller: _customTimeController,
                            style: GoogleFonts.outfit(color: Colors.black),
                            decoration: _inputDecoration('e.g., 2:30 PM'),
                            validator: (value) {
                              if (_slotCustomSelected && (value == null || value.isEmpty)) {
                                return 'Enter custom delivery time';
                              }
                              return null;
                            },
                          ),
                        ],
                      ],
                      const SizedBox(height: 20),
                    ],
                  ),
                ),
              ),
            ),

            // Fixed Bottom Pricing and Place Order Section with System Safety Margins
            SafeArea(
              top: false,
              bottom: true,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withAlpha(8),
                      blurRadius: 16,
                      offset: const Offset(0, -4),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'Total Price',
                          style: GoogleFonts.outfit(fontSize: 14, color: Colors.grey.shade500),
                        ),
                        Text(
                          '₹${totalAmount.toStringAsFixed(2)}',
                          style: GoogleFonts.sora(fontSize: 22, fontWeight: FontWeight.w800, color: Colors.black),
                        ),
                      ],
                    ),
                    GestureDetector(
                      onTap: _onPlaceOrder,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 16),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E1E1E),
                          borderRadius: BorderRadius.circular(18),
                        ),
                        child: Text(
                          'Place Order',
                          style: GoogleFonts.sora(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  InputDecoration _inputDecoration(String hintText) {
    return InputDecoration(
      hintText: hintText,
      hintStyle: GoogleFonts.outfit(color: Colors.grey.shade400),
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
      filled: true,
      fillColor: Colors.white,
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: Colors.grey.shade200, width: 1.5),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Color(0xFF8B6B58), width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Colors.redAccent, width: 1.5),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Colors.redAccent, width: 1.5),
      ),
    );
  }
}
