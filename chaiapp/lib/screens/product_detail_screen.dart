import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'checkout_screen.dart';

class ProductDetailScreen extends StatefulWidget {
  final Map<String, dynamic> product;
  final Function(dynamic) onAddToCart;

  const ProductDetailScreen({
    super.key,
    required this.product,
    required this.onAddToCart,
  });

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> with SingleTickerProviderStateMixin {
  bool _isFavourite = false;
  int _quantity = 1;
  String _selectedSugar = 'Regular Sugar';
  final List<String> _sugarOptions = ['No Sugar', 'Less Sugar', 'Regular Sugar'];
  String? _selectedImageUrl;

  late AnimationController _favController;
  late Animation<double> _favScale;

  @override
  void initState() {
    super.initState();
    _selectedImageUrl = widget.product['imagePath'];
    _favController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _favScale = TweenSequence([
      TweenSequenceItem(tween: Tween<double>(begin: 1.0, end: 1.3), weight: 50),
      TweenSequenceItem(tween: Tween<double>(begin: 1.3, end: 1.0), weight: 50),
    ]).animate(_favController);
    _checkIfFavourite();
  }

  Future<void> _checkIfFavourite() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user != null) {
      final docId = widget.product['name']?.toString().replaceAll('/', '_');
      if (docId == null || docId.isEmpty) return;
      try {
        final doc = await FirebaseFirestore.instance
            .collection('users')
            .doc(user.uid)
            .collection('favorites')
            .doc(docId)
            .get();
        if (doc.exists && mounted) {
          setState(() {
            _isFavourite = true;
          });
        }
      } catch (e) {
        debugPrint('Error checking favorite: $e');
      }
    }
  }

  @override
  void dispose() {
    _favController.dispose();
    super.dispose();
  }

  void _toggleFavourite() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please log in to save favourites!')),
      );
      return;
    }

    final docId = widget.product['name']?.toString().replaceAll('/', '_');
    if (docId == null || docId.isEmpty) return;

    final favRef = FirebaseFirestore.instance
        .collection('users')
        .doc(user.uid)
        .collection('favorites')
        .doc(docId);

    setState(() {
      _isFavourite = !_isFavourite;
    });

    try {
      if (_isFavourite) {
        _favController.forward(from: 0.0);
        // Save Map instead of direct assignment if any weird objects exist, but from(...) ensures string dynamic map
        final Map<String, dynamic> dataToSave = Map<String, dynamic>.from(widget.product);
        // Ensure color is not saved since it's a Color object which Firestore can't serialize
        dataToSave.remove('bgColor'); 
        dataToSave.remove('cardBgColor');
        
        await favRef.set(dataToSave);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Added to Favourites!'), duration: Duration(seconds: 1)),
          );
        }
      } else {
        await favRef.delete();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Removed from Favourites!'), duration: Duration(seconds: 1)),
          );
        }
      }
    } catch (e) {
      debugPrint('Error toggling favorite: $e');
      // Revert state on error
      if (mounted) {
        setState(() {
          _isFavourite = !_isFavourite;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final imagePath = widget.product['imagePath'] ?? 'assets/images/adrak_chai.png';
    final bgColor = widget.product['bgColor'] ?? const Color(0xFFFAF7F4);
    final name = widget.product['name'] ?? 'Fresh Brew';
    final category = widget.product['category'] ?? 'Fresh Tea';
    final priceString = widget.product['price'] ?? '₹45.00';

    return Scaffold(
      backgroundColor: Colors.white,
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
          'Detail',
          style: GoogleFonts.sora(
            color: Colors.black,
            fontSize: 18,
            fontWeight: FontWeight.w700,
          ),
        ),
        centerTitle: true,
        actions: [
          ScaleTransition(
            scale: _favScale,
            child: Padding(
              padding: const EdgeInsets.only(right: 16.0),
              child: GestureDetector(
                onTap: _toggleFavourite,
                child: Icon(
                  _isFavourite ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                  color: _isFavourite ? Colors.redAccent : Colors.black,
                  size: 24,
                ),
              ),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Main Large Product Image
                    AspectRatio(
                      aspectRatio: 1.0,
                      child: Container(
                        decoration: BoxDecoration(
                          color: bgColor,
                          borderRadius: BorderRadius.circular(32),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(32),
                          child: (_selectedImageUrl ?? imagePath).toString().startsWith('http')
                              ? Image.network((_selectedImageUrl ?? imagePath), fit: BoxFit.cover, cacheWidth: 800)
                              : Image.asset((_selectedImageUrl ?? imagePath), fit: BoxFit.cover),
                        ),
                      ),
                    ),
                    if (widget.product['gallery'] != null && widget.product['gallery'].isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 16),
                        child: SizedBox(
                          height: 70,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            itemCount: 1 + (widget.product['gallery'] as List).length,
                            separatorBuilder: (context, index) => const SizedBox(width: 12),
                            itemBuilder: (context, index) {
                              final imgUrl = index == 0 ? imagePath : widget.product['gallery'][index - 1];
                              final isSelected = (_selectedImageUrl ?? imagePath) == imgUrl;
                              return GestureDetector(
                                onTap: () {
                                  setState(() {
                                    _selectedImageUrl = imgUrl;
                                  });
                                },
                                child: Container(
                                  width: 70,
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(
                                      color: isSelected ? const Color(0xFF8A583C) : Colors.transparent,
                                      width: 2,
                                    ),
                                  ),
                                  child: ClipRRect(
                                    borderRadius: BorderRadius.circular(14),
                                    child: imgUrl.toString().startsWith('http')
                                        ? Image.network(imgUrl, fit: BoxFit.cover, cacheWidth: 200)
                                        : Image.asset(imgUrl, fit: BoxFit.cover),
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                      ),
                    const SizedBox(height: 24),

                    // Category & Product Title & Rating
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                name,
                                style: GoogleFonts.sora(
                                  fontSize: 22,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.black,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                category,
                                style: GoogleFonts.outfit(
                                  fontSize: 14,
                                  color: Colors.grey.shade400,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFAF7F4),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.star_rounded, color: Colors.amber, size: 18),
                              const SizedBox(width: 4),
                              Text(
                                '4.9',
                                style: GoogleFonts.sora(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.black,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // Description text
                    Text(
                      'Description',
                      style: GoogleFonts.sora(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: Colors.black,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      widget.product['description'] ?? 'Indulge in our carefully selected ingredients brewed to perfection. This authentic beverage gives you a perfect kick start to your day with clean, rich flavor notes and cute aesthetic vibes.',
                      style: GoogleFonts.outfit(
                        fontSize: 13,
                        color: Colors.grey.shade500,
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Wrap(
                      spacing: 8.0,
                      runSpacing: 8.0,
                      children: [
                        if (widget.product['caffeine'] != null && widget.product['caffeine'] != '')
                          _buildInfoBadge(Icons.bolt, 'Caffeine: ${widget.product['caffeine']}'),
                        if (widget.product['steepTime'] != null && widget.product['steepTime'] != '')
                          _buildInfoBadge(Icons.timer_outlined, 'Steep: ${widget.product['steepTime']}'),
                        if (widget.product['sweetness'] != null && widget.product['sweetness'] != '')
                          _buildInfoBadge(Icons.opacity, 'Sweetness: ${widget.product['sweetness']}'),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // Sugar Selection option
                    Text(
                      'Sugar Level',
                      style: GoogleFonts.sora(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: Colors.black,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: _sugarOptions.map((option) {
                        bool isSelected = option == _selectedSugar;
                        return Expanded(
                          child: GestureDetector(
                            onTap: () {
                              setState(() {
                                _selectedSugar = option;
                              });
                            },
                            child: Container(
                              margin: const EdgeInsets.symmetric(horizontal: 4),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              decoration: BoxDecoration(
                                color: isSelected ? const Color(0xFF1E1E1E) : Colors.white,
                                border: Border.all(
                                  color: isSelected ? Colors.transparent : Colors.grey.shade200,
                                  width: 1.5,
                                ),
                                borderRadius: BorderRadius.circular(14),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                option.split(' ')[0],
                                style: GoogleFonts.sora(
                                  color: isSelected ? Colors.white : Colors.grey.shade500,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 24),

                    // Quantity Counter option
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Quantity',
                          style: GoogleFonts.sora(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: Colors.black,
                      ),
                    ),
                    Row(
                      children: [
                        GestureDetector(
                          onTap: () {
                            if (_quantity > 1) {
                              setState(() {
                                _quantity--;
                              });
                            }
                          },
                          child: Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.grey.shade200, width: 1.5),
                            ),
                            child: const Icon(Icons.remove, size: 18, color: Colors.black),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 20.0),
                          child: Text(
                            '$_quantity',
                            style: GoogleFonts.sora(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                              color: Colors.black,
                            ),
                          ),
                        ),
                        GestureDetector(
                          onTap: () {
                            setState(() {
                              _quantity++;
                            });
                          },
                          child: Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.grey.shade200, width: 1.5),
                            ),
                            child: const Icon(Icons.add, size: 18, color: Colors.black),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),

        // Bottom Add to Cart Button bar with System Safety Margins
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
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'Price',
                        style: GoogleFonts.outfit(
                          fontSize: 13,
                          color: Colors.grey.shade400,
                        ),
                      ),
                      Text(
                        priceString,
                        style: GoogleFonts.sora(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF8B6B58),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 24),
                Expanded(
                  flex: 2,
                  child: GestureDetector(
                    onTap: () {
                      final itemToAdd = {
                        'name': name,
                        'category': category,
                        'price': priceString,
                        'imagePath': imagePath,
                        'bgColor': bgColor,
                        'quantity': _quantity,
                        'sugar': _selectedSugar,
                      };
                      widget.onAddToCart(itemToAdd);
                      Navigator.of(context).pop();
                    },
                    child: Container(
                      height: 56,
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E1E1E),
                        borderRadius: BorderRadius.circular(18),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        'Add to Cart',
                        style: GoogleFonts.sora(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
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

  Widget _buildInfoBadge(IconData icon, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: Colors.grey.shade600),
          const SizedBox(width: 4),
          Text(
            label,
            style: GoogleFonts.outfit(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: Colors.grey.shade700,
            ),
          ),
        ],
      ),
    );
  }
}
