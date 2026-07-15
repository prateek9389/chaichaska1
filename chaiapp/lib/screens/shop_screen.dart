import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'product_detail_screen.dart';

class ShopScreen extends StatefulWidget {
  final Function(dynamic) onAddToCart;
  final bool focusSearch;
  final VoidCallback onSearchFocusedHandled;

  const ShopScreen({
    super.key,
    required this.onAddToCart,
    required this.focusSearch,
    required this.onSearchFocusedHandled,
  });

  @override
  State<ShopScreen> createState() => _ShopScreenState();
}

class _ShopScreenState extends State<ShopScreen> {
  int _activeCategoryIndex = 0;
  final List<String> _categories = ['All', 'Chai', 'Coffee', 'Masala', 'Cardamom', 'Ginger', 'Saffron', 'Organic Greens', 'Herbal Infusions'];

  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocusNode = FocusNode();
  String _searchQuery = '';
  StreamSubscription? _productsSubscription;

  final List<Map<String, dynamic>> _allProducts = [];

  @override
  void initState() {
    super.initState();
    _listenToProducts();
    if (widget.focusSearch) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _searchFocusNode.requestFocus();
        widget.onSearchFocusedHandled();
      });
    }
  }

  void _listenToProducts() {
    _productsSubscription = FirebaseFirestore.instance.collection('products').snapshots().listen((snapshot) {
      if (mounted) {
        setState(() {
          _allProducts.clear();
          for (var doc in snapshot.docs) {
            final data = doc.data() as Map<String, dynamic>? ?? {};
            _allProducts.add({
              'name': data['name'] ?? 'Unknown',
              'category': data['category'] ?? 'Uncategorized',
              'price': data['price'] ?? '₹0.00',
              'imagePath': data['image'] ?? 'assets/images/placeholder.png',
              'bgColor': const Color(0xFFF1F7F4),
              'description': data['description'] ?? 'No description provided.',
              'caffeine': data['caffeine'] ?? 'Medium',
              'sweetness': data['sweetness'] ?? 'Medium',
              'steepTime': data['steepTime'] ?? '5 mins',
              'gallery': (data['gallery'] is List) ? (data['gallery'] as List).map((e) => e.toString()).toList() : <String>[],
            });
          }
        });
      }
    });
  }

  @override
  void didUpdateWidget(covariant ShopScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.focusSearch && !oldWidget.focusSearch) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _searchFocusNode.requestFocus();
        widget.onSearchFocusedHandled();
      });
    }
  }

  @override
  void dispose() {
    _productsSubscription?.cancel();
    _searchController.dispose();
    _searchFocusNode.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> _getFilteredProducts() {
    List<Map<String, dynamic>> products = _allProducts;
    if (_activeCategoryIndex != 0) {
      final selectedCategory = _categories[_activeCategoryIndex];
      products = products.where((p) => p['category'] == selectedCategory).toList();
    }
    if (_searchQuery.isNotEmpty) {
      products = products.where((p) => p['name'].toLowerCase().contains(_searchQuery.toLowerCase())).toList();
    }
    return products;
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _getFilteredProducts();

    return Scaffold(
      backgroundColor: const Color(0xFFFDFDFD),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Chai Shop',
                style: GoogleFonts.sora(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: Colors.black,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Explore hot tea, aromatic coffee, fresh namkeen snacks, and cookies.',
                style: GoogleFonts.outfit(
                  fontSize: 14,
                  color: Colors.grey.shade500,
                ),
              ),
              const SizedBox(height: 20),

              // Beautiful Top Search Bar
              Container(
                height: 52,
                decoration: BoxDecoration(
                  color: const Color(0xFFFAF7F4),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFF1EDE9), width: 1.5),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    Icon(Icons.search_rounded, color: Colors.grey.shade400, size: 20),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        controller: _searchController,
                        focusNode: _searchFocusNode,
                        style: GoogleFonts.outfit(color: Colors.black, fontSize: 14),
                        decoration: InputDecoration(
                          hintText: 'Search tea, coffee, sev namkeen...',
                          hintStyle: GoogleFonts.outfit(color: Colors.grey.shade400, fontSize: 14),
                          border: InputBorder.none,
                          isDense: true,
                        ),
                        onChanged: (val) {
                          setState(() {
                            _searchQuery = val;
                          });
                        },
                      ),
                    ),
                    if (_searchQuery.isNotEmpty)
                      GestureDetector(
                        onTap: () {
                          _searchController.clear();
                          setState(() {
                            _searchQuery = '';
                          });
                        },
                        child: Icon(Icons.close_rounded, color: Colors.grey.shade600, size: 18),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Horizontal Category List Bar
              SizedBox(
                height: 38,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  itemCount: _categories.length,
                  itemBuilder: (context, index) {
                    bool isActive = _activeCategoryIndex == index;
                    return GestureDetector(
                      onTap: () {
                        setState(() {
                          _activeCategoryIndex = index;
                        });
                      },
                      child: Container(
                        margin: const EdgeInsets.only(right: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        decoration: BoxDecoration(
                          color: isActive ? const Color(0xFF1E1E1E) : const Color(0xFFFAF7F4),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isActive ? Colors.transparent : const Color(0xFFF1EDE9),
                            width: 1,
                          ),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          _categories[index],
                          style: GoogleFonts.sora(
                            color: isActive ? Colors.white : Colors.grey.shade600,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 20),

              // 2-Column Grid of Products
              Expanded(
                child: filtered.isEmpty
                    ? Center(
                        child: Text(
                          'No products found.',
                          style: GoogleFonts.outfit(color: Colors.grey.shade400, fontSize: 15),
                        ),
                      )
                    : GridView.builder(
                        physics: const BouncingScrollPhysics(),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          mainAxisSpacing: 16,
                          crossAxisSpacing: 16,
                          childAspectRatio: 0.66, // 4:6 aspect ratio
                        ),
                        itemCount: filtered.length,
                        itemBuilder: (context, index) {
                          final product = filtered[index];
                          return GestureDetector(
                            onTap: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (context) => ProductDetailScreen(
                                    product: product,
                                    onAddToCart: widget.onAddToCart,
                                  ),
                                ),
                              );
                            },
                            child: Container(
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(24),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withAlpha(6),
                                    blurRadius: 12,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  ClipRRect(
                                    borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                                    child: AspectRatio(
                                      aspectRatio: 1.0, // 1:1 image aspect ratio
                                      child: Container(
                                        color: product['bgColor'],
                                        child: product['imagePath'].toString().startsWith('http')
                                            ? Image.network(
                                                product['imagePath'],
                                                fit: BoxFit.cover,
                                                cacheWidth: 600,
                                              )
                                            : Image.asset(
                                                product['imagePath'],
                                                fit: BoxFit.cover,
                                              ),
                                      ),
                                    ),
                                  ),
                                  Padding(
                                    padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 6.0),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          product['name'],
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: GoogleFonts.sora(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w600,
                                            color: Colors.black,
                                          ),
                                        ),
                                        const SizedBox(height: 1),
                                        Text(
                                          product['category'],
                                          style: GoogleFonts.outfit(
                                            fontSize: 10,
                                            color: Colors.grey.shade400,
                                          ),
                                        ),
                                        const SizedBox(height: 3),
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text(
                                              product['price'],
                                              style: GoogleFonts.sora(
                                                fontSize: 13,
                                                fontWeight: FontWeight.w700,
                                                color: Colors.black,
                                              ),
                                            ),
                                            GestureDetector(
                                              onTap: () => widget.onAddToCart(product),
                                              child: Container(
                                                width: 26,
                                                height: 26,
                                                decoration: const BoxDecoration(
                                                  color: Color(0xFF1E1E1E),
                                                  shape: BoxShape.circle,
                                                ),
                                                child: const Icon(
                                                  Icons.shopping_bag_outlined,
                                                  color: Colors.white,
                                                  size: 12,
                                                ),
                                              ),
                                            ),
                                          ],
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
            ],
          ),
        ),
      ),
    );
  }
}
