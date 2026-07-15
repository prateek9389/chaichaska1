import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'wallet_screen.dart';
import 'thank_you_screen.dart';
import 'addresses_screen.dart';
import '../state/wallet_state.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../state/cart_state.dart';

class CheckoutScreen extends StatefulWidget {
  final List<CartItemData> cartItems;

  const CheckoutScreen({
    super.key,
    required this.cartItems,
  });

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _formKey = GlobalKey<FormState>();
  final _customTimeController = TextEditingController();

  // Address form controllers (for first-time users)
  final _labelController = TextEditingController();
  final _officeNumberController = TextEditingController();
  final _officeNameController = TextEditingController();
  final _floorController = TextEditingController();
  final _addressController = TextEditingController();

  int _selectedAddressIndex = 0;
  int _selectedPurchaseType = 0; // 0 for Buy One-time, 1 for Subscription

  // Subscription Slot states
  bool _slotMorningSelected = false;
  bool _slotEveningSelected = false;
  bool _slotCustomSelected = false;

  // 6 Add-ons including Namkeen, Biscuits, and Toast
  List<Map<String, dynamic>> _addons = [];
  bool _isLoadingAddons = true;

  final List<String> _selectedAddons = [];

  @override
  void initState() {
    super.initState();
    _fetchAddons();
    _fetchAddresses();
  }

  Future<void> _fetchAddresses() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;
    try {
      final snap = await FirebaseFirestore.instance
          .collection('users')
          .doc(user.uid)
          .collection('addresses')
          .get();
      if (snap.docs.isNotEmpty) {
        final List<Map<String, String>> fetched = snap.docs.map((doc) {
          final data = doc.data();
          return {
            'id': doc.id,
            'label': data['label']?.toString() ?? '',
            'officeNumber': data['officeNumber']?.toString() ?? '',
            'officeName': data['officeName']?.toString() ?? '',
            'floor': data['floor']?.toString() ?? '',
            'address': data['address']?.toString() ?? '',
          };
        }).toList();
        WalletState.savedAddresses.value = fetched;
        if (_selectedAddressIndex >= fetched.length) {
          if (mounted) setState(() { _selectedAddressIndex = 0; });
        }
      }
    } catch (e) {
      debugPrint("Error fetching addresses: $e");
    }
  }

  Future<void> _fetchAddons() async {
    try {
      final snap = await FirebaseFirestore.instance.collection('addons').get();
      final fetchedAddons = snap.docs.map((doc) => doc.data()).toList();
      if (mounted) {
        setState(() {
          _addons = fetchedAddons;
          _isLoadingAddons = false;
        });
      }
    } catch (e) {
      debugPrint("Error fetching addons: $e");
      if (mounted) {
        setState(() {
          _isLoadingAddons = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _customTimeController.dispose();
    _labelController.dispose();
    _officeNumberController.dispose();
    _officeNameController.dispose();
    _floorController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  Widget _buildImage(String imgUrl) {
    if (imgUrl.isEmpty) {
      return Image.asset('assets/images/tea_icon.png', fit: BoxFit.cover);
    }
    
    // Handle Base64 Uploaded images from Web Admin
    if (imgUrl.startsWith('data:image')) {
      try {
        final base64String = imgUrl.split(',').last;
        final bytes = base64Decode(base64String);
        return Image.memory(
          bytes,
          fit: BoxFit.cover,
          errorBuilder: (c, e, s) => Image.asset('assets/images/tea_icon.png', fit: BoxFit.cover),
        );
      } catch (e) {
        return Image.asset('assets/images/tea_icon.png', fit: BoxFit.cover);
      }
    }

    if (imgUrl.startsWith('http')) {
      return Image.network(
        imgUrl,
        fit: BoxFit.cover,
        cacheWidth: 200,
        errorBuilder: (c, e, s) => Image.asset('assets/images/tea_icon.png', fit: BoxFit.cover),
      );
    } else {
      return Image.asset(
        imgUrl,
        fit: BoxFit.cover,
        errorBuilder: (c, e, s) => Image.asset('assets/images/tea_icon.png', fit: BoxFit.cover),
      );
    }
  }

  double _calculateTotal() {
    double baseTotal = 0.0;
    for (var item in widget.cartItems) {
      final priceStr = item.price.replaceAll('₹', '').trim();
      final price = double.tryParse(priceStr) ?? 0.0;
      baseTotal += (price * item.quantity);
    }

    // Add selected Add-ons prices
    double addonsTotal = 0.0;
    for (var addonName in _selectedAddons) {
      final addon = _addons.firstWhere((a) => a['name'] == addonName);
      final dynamic p = addon['price'];
      double addonPrice = 0.0;
      if (p is int) addonPrice = p.toDouble();
      else if (p is double) addonPrice = p;
      else if (p is String) addonPrice = double.tryParse(p.replaceAll(RegExp(r'[^0-9.]'), '')) ?? 0.0;
      addonsTotal += addonPrice;
    }

    if (_selectedPurchaseType == 1) {
      // 10% discount on base total + addons total for subscriptions
      return (baseTotal + addonsTotal) * 0.9;
    }
    return baseTotal + addonsTotal;
  }

  Future<void> _onPlaceOrder() async {
    if (_formKey.currentState!.validate()) {
      if (WalletState.savedAddresses.value.isEmpty) {
        // Save the inline address to Firebase & WalletState
        final newAddress = {
          'id': DateTime.now().millisecondsSinceEpoch.toString(),
          'label': _labelController.text,
          'officeNumber': _officeNumberController.text,
          'officeName': _officeNameController.text,
          'floor': _floorController.text,
          'address': _addressController.text,
        };
        final user = FirebaseAuth.instance.currentUser;
        if (user != null) {
          try {
            await FirebaseFirestore.instance
                .collection('users')
                .doc(user.uid)
                .collection('addresses')
                .doc(newAddress['id'])
                .set(newAddress);
          } catch (e) {
            debugPrint('Error saving inline address to Firebase: $e');
          }
        }
        final currentList = List<Map<String, String>>.from(WalletState.savedAddresses.value);
        currentList.add(newAddress);
        WalletState.savedAddresses.value = currentList;
        if (mounted) setState(() { _selectedAddressIndex = 0; });
      }
      final orderCost = _calculateTotal();
      
      final String itemsSummary = widget.cartItems.map((e) => '${e.name} x${e.quantity}').join(', ');
      
      final orderTitle = _selectedPurchaseType == 1
          ? 'Sub: ${widget.cartItems.first.name} 🔄'
          : 'Buy: $itemsSummary ☕';

      if (WalletState.balance.value >= orderCost) {
        // Sufficient Balance -> Deduct & Route to ThankYouScreen
        WalletState.balance.value -= orderCost;
        WalletState.addTransaction(
          title: orderTitle,
          amount: orderCost,
          isCredit: false,
        );

        final user = FirebaseAuth.instance.currentUser;
        final selectedAddr = WalletState.savedAddresses.value[_selectedAddressIndex];
        final formattedAddress = '${selectedAddr['officeNumber']}, ${selectedAddr['officeName']}, Floor ${selectedAddr['floor']}, ${selectedAddr['address']}';

        try {
          if (user != null) {
            await FirebaseFirestore.instance.collection('users').doc(user.uid).set({
              'wallet': FieldValue.increment(-orderCost)
            }, SetOptions(merge: true));
          }

          if (_selectedPurchaseType == 1) {
            // SUBSCRIPTION
            final startDate = DateTime.now();
            final endDate = startDate.add(const Duration(days: 30));
            final String addonsParam = _selectedAddons.join(" + ");
            
            final String itemsListForSub = widget.cartItems.map((e) => '${e.name} (${e.sugar}) x${e.quantity}').join(', ');
            
            final subData = {
              'userId': user?.uid ?? "guest",
              'customer': user?.displayName ?? "App User",
              'phone': selectedAddr['officeNumber'] ?? "0000000000",
              'office': formattedAddress,
              'item': widget.cartItems.first.name,
              'items': '$itemsListForSub ${addonsParam.isNotEmpty ? " + " + addonsParam : ""}',
              'sugar': widget.cartItems.map((e) => e.sugar).toSet().join(', '),
              'milk': "Whole Milk",
              'total': orderCost,
              'cost': orderCost,
              'price': orderCost,
              'timeSlot': _slotMorningSelected ? "09:00" : (_slotEveningSelected ? "16:00" : _customTimeController.text),
              'frequency': "MONTHLY",
              'startDate': "${startDate.day}/${startDate.month}/${startDate.year}",
              'endDateIso': endDate.toIso8601String(),
              'endDate': "${endDate.day}/${endDate.month}/${endDate.year}",
              'status': "Active",
              'image': widget.cartItems.first.imagePath.isNotEmpty ? widget.cartItems.first.imagePath : "assets/images/tea_icon.png",
              'img': widget.cartItems.first.imagePath.isNotEmpty ? widget.cartItems.first.imagePath : "assets/images/tea_icon.png",
              'createdAt': DateTime.now().millisecondsSinceEpoch,
            };
            
            await FirebaseFirestore.instance.collection('subscriptions').add(subData);

            // ALSO Save in Orders collection so it appears in One-Time tab / admin dashboard
            final orderId = 'CHAI-SUB-${100000 + DateTime.now().millisecondsSinceEpoch % 900000}';
            final String dateString = "${DateTime.now().day.toString().padLeft(2, '0')}/${DateTime.now().month.toString().padLeft(2, '0')}/${DateTime.now().year} ${DateTime.now().hour.toString().padLeft(2, '0')}:${DateTime.now().minute.toString().padLeft(2, '0')}";

            final orderData = {
              'orderId': orderId,
              'userId': user?.uid ?? "guest",
              'customer': user?.displayName ?? "App User",
              'phone': selectedAddr['officeNumber'] ?? "0000000000",
              'pincode': "122001",
              'office': formattedAddress,
              'item': 'Subscription: $itemsSummary',
              'sugar': widget.cartItems.map((e) => e.sugar).toSet().join(', ') == "" ? "Normal Sugar" : widget.cartItems.map((e) => e.sugar).toSet().join(', '),
              'milk': "Whole Milk",
              'image': widget.cartItems.first.imagePath.isNotEmpty ? widget.cartItems.first.imagePath : "assets/images/tea_icon.png",
              'img': widget.cartItems.first.imagePath.isNotEmpty ? widget.cartItems.first.imagePath : "assets/images/tea_icon.png",
              'priority': "Subscription",
              'total': '₹$orderCost',
              'priceNum': orderCost,
              'addons': addonsParam,
              'coupon': "None",
              'status': "Received",
              'date': dateString,
              'createdAt': DateTime.now().millisecondsSinceEpoch,
              'updatedAt': DateTime.now().millisecondsSinceEpoch,
            };
            
            await FirebaseFirestore.instance.collection('orders').doc(orderId).set(orderData);
          } else {
            // ONE-TIME ORDER
            final orderId = 'CHAI-ORD-${100000 + DateTime.now().millisecondsSinceEpoch % 900000}';
            final addonsParam = _selectedAddons.join(", ");
            
            final String dateString = "${DateTime.now().day.toString().padLeft(2, '0')}/${DateTime.now().month.toString().padLeft(2, '0')}/${DateTime.now().year} ${DateTime.now().hour.toString().padLeft(2, '0')}:${DateTime.now().minute.toString().padLeft(2, '0')}";

            final orderData = {
              'orderId': orderId,
              'userId': user?.uid ?? "guest",
              'customer': user?.displayName ?? "App User",
              'phone': selectedAddr['officeNumber'] ?? "0000000000",
              'pincode': "122001",
              'office': formattedAddress,
              'item': itemsSummary,
              'sugar': widget.cartItems.map((e) => e.sugar).toSet().join(', ') == "" ? "Normal Sugar" : widget.cartItems.map((e) => e.sugar).toSet().join(', '),
              'milk': "Whole Milk",
              'image': widget.cartItems.first.imagePath.isNotEmpty ? widget.cartItems.first.imagePath : "assets/images/tea_icon.png",
              'img': widget.cartItems.first.imagePath.isNotEmpty ? widget.cartItems.first.imagePath : "assets/images/tea_icon.png",
              'priority': "Normal",
              'total': '₹$orderCost',
              'priceNum': orderCost,
              'addons': addonsParam,
              'coupon': "None",
              'status': "Received",
              'date': dateString,
              'createdAt': DateTime.now().millisecondsSinceEpoch,
              'updatedAt': DateTime.now().millisecondsSinceEpoch,
            };
            
            await FirebaseFirestore.instance.collection('orders').doc(orderId).set(orderData);
          }
        } catch (e) {
          debugPrint("Failed to place order in Firebase: $e");
        }

        if (mounted) {
          // Clear cart on successful order
          CartState.clearCart();
          
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
              builder: (context) => const ThankYouScreen(),
            ),
          );
        }
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
                      ...widget.cartItems.map((item) {
                        return Container(
                          padding: const EdgeInsets.all(12),
                          margin: const EdgeInsets.only(bottom: 12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: Colors.grey.shade100),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withAlpha(5),
                                blurRadius: 10,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 50,
                                height: 50,
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFAF7F4),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(12),
                                  child: _buildImage(item.imagePath),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      item.name,
                                      style: GoogleFonts.sora(fontSize: 14, fontWeight: FontWeight.w600),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'Sugar: ${item.sugar}  •  Qty: ${item.quantity}',
                                      style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey.shade500),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                '₹${(item.quantity * (double.tryParse(item.price.replaceAll('₹', '').trim()) ?? 0.0)).toStringAsFixed(2)}',
                                style: GoogleFonts.sora(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.black),
                              ),
                            ],
                          ),
                        );
                      }),
                      ..._selectedAddons.map((addonName) {
                        final addon = _addons.firstWhere((a) => a['name'] == addonName);
                        final dynamic p = addon['price'];
                        double addonPrice = 0.0;
                        if (p is int) addonPrice = p.toDouble();
                        else if (p is double) addonPrice = p;
                        else if (p is String) addonPrice = double.tryParse(p.replaceAll(RegExp(r'[^0-9.]'), '')) ?? 0.0;
                        
                        String imgUrl = (addon['image'] ?? addon['imagePath'] ?? '').toString();
                        
                        return Container(
                          padding: const EdgeInsets.all(12),
                          margin: const EdgeInsets.only(bottom: 12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: Colors.grey.shade100),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withAlpha(5),
                                blurRadius: 10,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 50,
                                height: 50,
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFAF7F4),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(12),
                                  child: _buildImage(imgUrl),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      addonName,
                                      style: GoogleFonts.sora(fontSize: 14, fontWeight: FontWeight.w600),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'Add-on  •  Qty: 1',
                                      style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey.shade500),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                '+₹${addonPrice.toStringAsFixed(2)}',
                                style: GoogleFonts.sora(fontSize: 15, fontWeight: FontWeight.w700, color: const Color(0xFF8B6B58)),
                              ),
                            ],
                          ),
                        );
                      }),
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
                            return Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Add New Address', style: GoogleFonts.sora(fontWeight: FontWeight.w600, fontSize: 14)),
                                const SizedBox(height: 12),
                                TextFormField(
                                  controller: _labelController,
                                  style: GoogleFonts.outfit(color: Colors.black, fontSize: 13),
                                  decoration: _inputDecoration('Label (e.g. Gurugram Office)'),
                                  validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                                ),
                                const SizedBox(height: 10),
                                TextFormField(
                                  controller: _officeNumberController,
                                  style: GoogleFonts.outfit(color: Colors.black, fontSize: 13),
                                  decoration: _inputDecoration('Office / Room Number'),
                                  validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                                ),
                                const SizedBox(height: 10),
                                TextFormField(
                                  controller: _officeNameController,
                                  style: GoogleFonts.outfit(color: Colors.black, fontSize: 13),
                                  decoration: _inputDecoration('Office / Company Name'),
                                  validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                                ),
                                const SizedBox(height: 10),
                                TextFormField(
                                  controller: _floorController,
                                  style: GoogleFonts.outfit(color: Colors.black, fontSize: 13),
                                  decoration: _inputDecoration('Floor Level'),
                                  validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                                ),
                                const SizedBox(height: 10),
                                TextFormField(
                                  controller: _addressController,
                                  maxLines: 2,
                                  style: GoogleFonts.outfit(color: Colors.black, fontSize: 13),
                                  decoration: _inputDecoration('Street Address'),
                                  validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                                ),
                              ],
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
                      _isLoadingAddons
                          ? const Padding(
                              padding: EdgeInsets.all(20.0),
                              child: Center(child: CircularProgressIndicator(color: Color(0xFF1E1E1E))),
                            )
                          : _addons.isEmpty
                              ? Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 8.0),
                                  child: Text('No add-ons available.', style: GoogleFonts.outfit(color: Colors.grey.shade400)),
                                )
                              : SizedBox(
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
                                          child: _buildImage((addon['image'] ?? addon['imagePath'] ?? '').toString()),
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
