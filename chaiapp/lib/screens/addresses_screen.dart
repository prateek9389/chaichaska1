import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../state/wallet_state.dart';

class AddressesScreen extends StatefulWidget {
  const AddressesScreen({super.key});

  @override
  State<AddressesScreen> createState() => _AddressesScreenState();
}

class _AddressesScreenState extends State<AddressesScreen> {
  final _formKey = GlobalKey<FormState>();
  final _labelController = TextEditingController();
  final _officeNumberController = TextEditingController();
  final _officeNameController = TextEditingController();
  final _floorController = TextEditingController();
  final _addressController = TextEditingController();

  void _showAddAddressDialog() {
    _labelController.clear();
    _officeNumberController.clear();
    _officeNameController.clear();
    _floorController.clear();
    _addressController.clear();

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          title: Text(
            'Add Delivery Address',
            style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w700),
          ),
          content: SingleChildScrollView(
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
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
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text(
                'Cancel',
                style: GoogleFonts.sora(color: Colors.grey, fontWeight: FontWeight.w600),
              ),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1E1E1E),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: () async {
                if (_formKey.currentState!.validate()) {
                  final newAddress = {
                    'id': DateTime.now().millisecondsSinceEpoch.toString(),
                    'label': _labelController.text,
                    'officeNumber': _officeNumberController.text,
                    'officeName': _officeNameController.text,
                    'floor': _floorController.text,
                    'address': _addressController.text,
                  };
                  
                  // Save to Firebase
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
                      debugPrint('Error saving address to Firebase: $e');
                    }
                  }

                  if (mounted) {
                    setState(() {
                      final currentList = List<Map<String, String>>.from(WalletState.savedAddresses.value);
                      currentList.add(newAddress);
                      WalletState.savedAddresses.value = currentList;
                    });
                    Navigator.of(context).pop();
                  }
                }
              },
              child: Text(
                'Add Address',
                style: GoogleFonts.sora(color: Colors.white, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        );
      },
    );
  }

  InputDecoration _inputDecoration(String hintText) {
    return InputDecoration(
      hintText: hintText,
      hintStyle: GoogleFonts.outfit(color: Colors.grey.shade400, fontSize: 13),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      filled: true,
      fillColor: const Color(0xFFFAF7F4),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide(color: Colors.grey.shade100),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: Color(0xFF8B6B58)),
      ),
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
          'My Addresses',
          style: GoogleFonts.sora(
            color: Colors.black,
            fontSize: 18,
            fontWeight: FontWeight.w700,
          ),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.add_location_alt_rounded, color: Color(0xFF8B6B58)),
            onPressed: _showAddAddressDialog,
          ),
        ],
      ),
      body: SafeArea(
        child: ValueListenableBuilder<List<Map<String, String>>>(
          valueListenable: WalletState.savedAddresses,
          builder: (context, addressesList, child) {
            if (addressesList.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.location_off_rounded, size: 64, color: Colors.grey.shade300),
                    const SizedBox(height: 16),
                    Text(
                      'No saved addresses',
                      style: GoogleFonts.sora(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.black),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Tap "+" at top right to add a delivery address',
                      style: GoogleFonts.outfit(fontSize: 12, color: Colors.grey.shade400),
                    ),
                  ],
                ),
              );
            }

            return ListView.builder(
              padding: const EdgeInsets.all(24),
              physics: const BouncingScrollPhysics(),
              itemCount: addressesList.length,
              itemBuilder: (context, index) {
                final item = addressesList[index];
                return Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.all(18),
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
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: const Color(0xFFFAF7F4),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.business_rounded, color: Color(0xFF8B6B58), size: 20),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item['label'] ?? '',
                              style: GoogleFonts.sora(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.black),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${item['officeNumber']}, ${item['officeName']}, Floor ${item['floor']}',
                              style: GoogleFonts.outfit(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.grey.shade600),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              item['address'] ?? '',
                              style: GoogleFonts.outfit(fontSize: 11, color: Colors.grey.shade400),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete_outline_rounded, color: Colors.redAccent, size: 20),
                        onPressed: () {
                          setState(() {
                            final currentList = List<Map<String, String>>.from(WalletState.savedAddresses.value);
                            currentList.removeWhere((addr) => addr['id'] == item['id']);
                            WalletState.savedAddresses.value = currentList;
                          });
                        },
                      ),
                    ],
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
