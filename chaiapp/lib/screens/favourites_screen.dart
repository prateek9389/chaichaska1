import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'product_detail_screen.dart';

class FavouritesScreen extends StatelessWidget {
  final Function(dynamic) onAddToCart;

  const FavouritesScreen({super.key, required this.onAddToCart});

  @override
  Widget build(BuildContext context) {
    // Dummy favorites list
    final List<Map<String, dynamic>> favItems = [
      {
        'name': 'Adrak Chai',
        'category': 'Fresh Tea',
        'price': '₹45.00',
        'imagePath': 'assets/images/adrak_chai.png',
        'bgColor': const Color(0xFFF1F7F4),
      },
      {
        'name': 'Espresso',
        'category': 'Coffee Cups',
        'price': '₹85.00',
        'imagePath': 'assets/images/espresso_coffee.png',
        'bgColor': const Color(0xFFFAF2EE),
      },
      {
        'name': 'Crispy Namkeen',
        'category': 'Snacks',
        'price': '₹35.00',
        'imagePath': 'assets/images/namkeen_mix.png',
        'bgColor': const Color(0xFFFDF7F2),
      },
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFFDFDFD),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'My Favourites',
                style: GoogleFonts.sora(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: Colors.black,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Your saved drinks and snacks for quick access.',
                style: GoogleFonts.outfit(
                  fontSize: 14,
                  color: Colors.grey.shade500,
                ),
              ),
              const SizedBox(height: 24),
              Expanded(
                child: favItems.isEmpty
                    ? Center(
                        child: Text(
                          'No favorites added yet.',
                          style: GoogleFonts.outfit(color: Colors.grey.shade400, fontSize: 16),
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
                        itemCount: favItems.length,
                        itemBuilder: (context, index) {
                          final item = favItems[index];
                          return GestureDetector(
                            onTap: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (context) => ProductDetailScreen(
                                    product: item,
                                    onAddToCart: onAddToCart,
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
                                    blurRadius: 10,
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
                                        color: item['bgColor'],
                                        child: Image.asset(
                                          item['imagePath'],
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
                                          item['name'],
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
                                          item['category'],
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
                                              item['price'],
                                              style: GoogleFonts.sora(
                                                fontSize: 13,
                                                fontWeight: FontWeight.w700,
                                                color: Colors.black,
                                              ),
                                            ),
                                            GestureDetector(
                                              onTap: () => onAddToCart(item),
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
