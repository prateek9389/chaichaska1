import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class SubscriptionDetailScreen extends StatefulWidget {
  final Map<String, dynamic> subscriptionData;
  final String subscriptionId;

  const SubscriptionDetailScreen({
    super.key,
    required this.subscriptionData,
    required this.subscriptionId,
  });

  @override
  State<SubscriptionDetailScreen> createState() => _SubscriptionDetailScreenState();
}

class _SubscriptionDetailScreenState extends State<SubscriptionDetailScreen> {
  late Map<String, dynamic> _data;

  @override
  void initState() {
    super.initState();
    _data = widget.subscriptionData;
  }

  Future<void> _togglePauseResume() async {
    final newStatus = _data['status'] == 'Active' ? 'Paused' : 'Active';
    try {
      await FirebaseFirestore.instance
          .collection('subscriptions')
          .doc(widget.subscriptionId)
          .update({'status': newStatus});
      setState(() {
        _data['status'] = newStatus;
      });
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Subscription $newStatus')));
    } catch (e) {
      debugPrint('Error toggling subscription: $e');
    }
  }

  Future<void> _deleteSubscription() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Delete Subscription', style: GoogleFonts.sora(fontWeight: FontWeight.bold)),
        content: Text('Are you sure you want to permanently delete this subscription?', style: GoogleFonts.outfit()),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text('Cancel', style: GoogleFonts.outfit(color: Colors.grey)),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text('Delete', style: GoogleFonts.outfit(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await FirebaseFirestore.instance
            .collection('subscriptions')
            .doc(widget.subscriptionId)
            .delete();
        if (mounted) {
          Navigator.of(context).pop();
        }
      } catch (e) {
        debugPrint('Error deleting subscription: $e');
      }
    }
  }

  void _editSubscription() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => EditSubscriptionSheet(
        subscriptionId: widget.subscriptionId,
        currentData: _data,
        onUpdated: (newData) {
          setState(() {
            _data = newData;
          });
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final status = _data['status'] ?? 'Unknown';
    Color statusColor = status == 'Active' ? Colors.green : Colors.orange;

    return Scaffold(
      backgroundColor: const Color(0xFFFDFDFD),
      appBar: AppBar(
        backgroundColor: const Color(0xFFFDFDFD),
        elevation: 0,
        centerTitle: true,
        title: Text(
          'Subscription Details',
          style: GoogleFonts.sora(color: Colors.black, fontSize: 18, fontWeight: FontWeight.w600),
        ),
        iconTheme: const IconThemeData(color: Colors.black),
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_outline_rounded, color: Colors.redAccent),
            onPressed: _deleteSubscription,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.grey.shade200),
                boxShadow: [
                  BoxShadow(color: Colors.black.withAlpha(5), blurRadius: 10, offset: const Offset(0, 4)),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Status', style: GoogleFonts.outfit(color: Colors.grey.shade600, fontSize: 14)),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: statusColor.withAlpha(20),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          status,
                          style: GoogleFonts.sora(color: statusColor, fontSize: 12, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text('Item', style: GoogleFonts.outfit(color: Colors.grey.shade600, fontSize: 14)),
                  const SizedBox(height: 4),
                  Text(
                    _data['item'] ?? 'Item Name',
                    style: GoogleFonts.sora(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black),
                  ),
                  const SizedBox(height: 16),
                  Text('Details', style: GoogleFonts.outfit(color: Colors.grey.shade600, fontSize: 14)),
                  const SizedBox(height: 4),
                  Text(
                    _data['items'] ?? '...',
                    style: GoogleFonts.outfit(fontSize: 14, color: Colors.black87),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Time Slot', style: GoogleFonts.outfit(color: Colors.grey.shade600, fontSize: 14)),
                            const SizedBox(height: 4),
                            Text(
                              _data['timeSlot'] ?? '--:--',
                              style: GoogleFonts.sora(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.black),
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Frequency', style: GoogleFonts.outfit(color: Colors.grey.shade600, fontSize: 14)),
                            const SizedBox(height: 4),
                            Text(
                              _data['frequency'] ?? 'MONTHLY',
                              style: GoogleFonts.sora(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.black),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _togglePauseResume,
                    icon: Icon(status == 'Active' ? Icons.pause_rounded : Icons.play_arrow_rounded, color: Colors.white),
                    label: Text(status == 'Active' ? 'Pause' : 'Resume', style: GoogleFonts.sora(color: Colors.white)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.orange,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      elevation: 0,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _editSubscription,
                    icon: const Icon(Icons.edit_rounded, color: Colors.white),
                    label: Text('Edit', style: GoogleFonts.sora(color: Colors.white)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1E1E1E),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      elevation: 0,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}


class EditSubscriptionSheet extends StatefulWidget {
  final String subscriptionId;
  final Map<String, dynamic> currentData;
  final Function(Map<String, dynamic>) onUpdated;

  const EditSubscriptionSheet({
    super.key,
    required this.subscriptionId,
    required this.currentData,
    required this.onUpdated,
  });

  @override
  State<EditSubscriptionSheet> createState() => _EditSubscriptionSheetState();
}

class _EditSubscriptionSheetState extends State<EditSubscriptionSheet> {
  int _step = 0; // 0: Select Product, 1: Select Addons & Time

  List<Map<String, dynamic>> _products = [];
  bool _isLoadingProducts = true;

  List<Map<String, dynamic>> _addons = [];
  bool _isLoadingAddons = true;

  Map<String, dynamic>? _selectedProduct;
  List<String> _selectedAddons = [];
  
  bool _slotMorningSelected = false;
  bool _slotEveningSelected = false;
  bool _slotCustomSelected = false;
  final _customTimeController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchProducts();
    _fetchAddons();
  }

  Future<void> _fetchProducts() async {
    try {
      final snap = await FirebaseFirestore.instance.collection('products').get();
      setState(() {
        _products = snap.docs.map((doc) => doc.data()).toList();
        _isLoadingProducts = false;
      });
    } catch (e) {
      debugPrint('Error fetching products: ');
      setState(() => _isLoadingProducts = false);
    }
  }

  Future<void> _fetchAddons() async {
    try {
      final snap = await FirebaseFirestore.instance.collection('addons').get();
      setState(() {
        _addons = snap.docs.map((doc) => doc.data()).toList();
        _isLoadingAddons = false;
      });
    } catch (e) {
      debugPrint('Error fetching addons: $e');
      setState(() => _isLoadingAddons = false);
    }
  }

  Future<void> _updateSubscription() async {
    if (_slotCustomSelected && _customTimeController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter custom time')));
      return;
    }

    final pPriceStr = _selectedProduct?['price']?.toString().replaceAll('₹', '').trim() ?? '0';
    final pPrice = double.tryParse(pPriceStr) ?? 0.0;
    
    double addonsPrice = 0.0;
    for (var aName in _selectedAddons) {
      final a = _addons.firstWhere((element) => element['name'] == aName, orElse: () => {});
      final ap = a['price']?.toString().replaceAll(RegExp(r'[^0-9.]'), '') ?? '0';
      addonsPrice += double.tryParse(ap) ?? 0.0;
    }

    // Subs get 10% off
    final total = (pPrice + addonsPrice) * 0.9;
    
    String timeSlot = _slotMorningSelected ? '09:00' : (_slotEveningSelected ? '16:00' : _customTimeController.text);
    if (!_slotMorningSelected && !_slotEveningSelected && !_slotCustomSelected) {
       timeSlot = widget.currentData['timeSlot'] ?? '09:00';
    }

    final String addonsParam = _selectedAddons.join(' + ');
    final String pName = _selectedProduct?['name'] ?? 'Unknown';
    final itemsStr = '$pName x1 ${addonsParam.isNotEmpty ? " + " + addonsParam : ""}';

    final newData = {
      ...widget.currentData,
      'item': pName,
      'items': itemsStr,
      'total': total,
      'cost': total,
      'price': total,
      'timeSlot': timeSlot,
      'updatedAt': DateTime.now().millisecondsSinceEpoch,
    };

    try {
      await FirebaseFirestore.instance.collection('subscriptions').doc(widget.subscriptionId).update(newData);
      widget.onUpdated(newData);
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      debugPrint('Error updating: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: Color(0xFFFDFDFD),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          const SizedBox(height: 12),
          Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2))),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: [
                if (_step == 1)
                  IconButton(
                    icon: const Icon(Icons.arrow_back_rounded, color: Colors.black),
                    onPressed: () => setState(() => _step = 0),
                  ),
                Expanded(
                  child: Text(
                    _step == 0 ? 'Select Product' : 'Configure Subscription',
                    style: GoogleFonts.sora(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.black),
                    textAlign: _step == 0 ? TextAlign.center : TextAlign.left,
                  ),
                ),
                if (_step == 0) const SizedBox(width: 48), // balance center
              ],
            ),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: _step == 0 ? _buildProductSelection() : _buildConfigSelection(),
          ),
        ],
      ),
    );
  }

  Widget _buildProductSelection() {
    if (_isLoadingProducts) return const Center(child: CircularProgressIndicator(color: Color(0xFF8B6B58)));
    
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      itemCount: _products.length,
      itemBuilder: (context, index) {
        final p = _products[index];
        return GestureDetector(
          onTap: () {
            setState(() {
              _selectedProduct = p;
              _step = 1;
            });
          },
          child: Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Row(
              children: [
                Container(
                  width: 50, height: 50,
                  decoration: BoxDecoration(
                    color: const Color(0xFFFAF7F4),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.local_cafe_rounded, color: Color(0xFF8B6B58)), // Placeholder
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(p['name'] ?? 'Product', style: GoogleFonts.sora(fontWeight: FontWeight.w600, color: Colors.black)),
                      Text(p['price']?.toString() ?? '₹0', style: GoogleFonts.outfit(color: const Color(0xFF8B6B58))),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right_rounded, color: Colors.grey),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildConfigSelection() {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Selected Product', style: GoogleFonts.sora(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Text(_selectedProduct?['name'] ?? '', style: GoogleFonts.outfit(fontSize: 16, color: Colors.black87)),
          const SizedBox(height: 24),
          Text('Add-ons (Optional)', style: GoogleFonts.sora(fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          if (_isLoadingAddons) const Center(child: CircularProgressIndicator())
          else Wrap(
            spacing: 10,
            runSpacing: 10,
            children: _addons.map((a) {
              final isSel = _selectedAddons.contains(a['name']);
              return ChoiceChip(
                label: Text('${a['name']} (+₹${a['price']})', style: GoogleFonts.outfit(color: isSel ? Colors.white : Colors.black)),
                selected: isSel,
                selectedColor: const Color(0xFF8B6B58),
                backgroundColor: Colors.white,
                onSelected: (val) {
                  setState(() {
                    if (val) _selectedAddons.add(a['name']);
                    else _selectedAddons.remove(a['name']);
                  });
                },
              );
            }).toList(),
          ),
          const SizedBox(height: 24),
          Text('Delivery Time Slot', style: GoogleFonts.sora(fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _buildTimeSlotCard('Morning', '8 AM - 11 AM', Icons.wb_sunny_rounded, _slotMorningSelected, () {
                setState(() { _slotMorningSelected = true; _slotEveningSelected = false; _slotCustomSelected = false; });
              })),
              const SizedBox(width: 10),
              Expanded(child: _buildTimeSlotCard('Evening', '4 PM - 7 PM', Icons.wb_twilight_rounded, _slotEveningSelected, () {
                setState(() { _slotMorningSelected = false; _slotEveningSelected = true; _slotCustomSelected = false; });
              })),
            ],
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: _buildTimeSlotCard('Custom', 'Choose time', Icons.access_time_rounded, _slotCustomSelected, () {
              setState(() { _slotMorningSelected = false; _slotEveningSelected = false; _slotCustomSelected = true; });
            }),
          ),
          if (_slotCustomSelected) ...[
            const SizedBox(height: 12),
            TextField(
              controller: _customTimeController,
              decoration: InputDecoration(
                hintText: 'e.g., 2:30 PM',
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
          const SizedBox(height: 32),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _updateSubscription,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1E1E1E),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: Text('Update Subscription', style: GoogleFonts.sora(color: Colors.white, fontWeight: FontWeight.w600)),
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildTimeSlotCard(String title, String sub, IconData icon, bool isSel, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSel ? const Color(0xFFFAF2EE) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: isSel ? const Color(0xFF8B6B58) : Colors.grey.shade200, width: 1.5),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: isSel ? const Color(0xFF8B6B58) : Colors.grey, size: 20),
            const SizedBox(height: 8),
            Text(title, style: GoogleFonts.sora(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.black)),
            Text(sub, style: GoogleFonts.outfit(fontSize: 10, color: Colors.grey.shade600)),
          ],
        ),
      ),
    );
  }
}
