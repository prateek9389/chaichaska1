import 'dart:async';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'checkout_screen.dart';
import 'favourites_screen.dart';
import 'order_screen.dart';
import 'profile_screen.dart';
import 'shop_screen.dart';
import 'wallet_screen.dart';
import 'notification_screen.dart';
import 'product_detail_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentBannerIndex = 0;
  int _currentBottomNavIndex = 0; // 0: Home, 1: Favourites, 2: Shop, 3: Order, 4: Profile
  int _selectedOptionCardIndex = 0; // Tea/Coffee selection card

  late PageController _bannerPageController;
  Timer? _carouselTimer;

  bool _isCartOpen = false;
  bool _focusShopSearch = false; // Triggers autofocus inside ShopScreen

  final List<PromoBannerData> _banners = [
    PromoBannerData(
      titleLine1: 'START YOUR',
      titleLine2: 'DAY WITH',
      titleLine3: 'COFFEE',
      subtitle: 'The best grain, the finest roast, the most powerful flavor.',
      discount: '30% Off',
      imagePath: 'assets/images/onboarding3.png',
      isCapsuleImage: true,
      cardBgColor: const Color(0xFFFDE8E1),
    ),
    PromoBannerData(
      titleLine1: 'DISCOVER the',
      titleLine2: 'Power of',
      titleLine3: 'FRESH CHAI',
      subtitle: 'Directly from the finest tea estates, selected with care.',
      discount: '20% Off',
      imagePath: 'assets/images/onboarding1.png',
      isCapsuleImage: false,
      cardBgColor: const Color(0xFFE8F1ED),
    ),
    PromoBannerData(
      titleLine1: 'BREWED TO',
      titleLine2: 'Perfection',
      titleLine3: 'DAILY',
      subtitle: 'Enjoy our handcrafted blends with rich authentic aroma.',
      discount: 'B1G1',
      imagePath: 'assets/images/onboarding2.png',
      isCapsuleImage: false,
      cardBgColor: const Color(0xFFF1F0E8),
    ),
  ];

  final List<ProductData> _teaProducts = [
    ProductData(
      name: 'Adrak Chai',
      category: 'Fresh Tea',
      price: '₹45.00',
      imagePath: 'assets/images/adrak_chai.png',
      cardBgColor: const Color(0xFFF1F7F4),
    ),
    ProductData(
      name: 'Elaichi Chai',
      category: 'Fresh Tea',
      price: '₹45.00',
      imagePath: 'assets/images/elaichi_chai.png',
      cardBgColor: const Color(0xFFF1F7F4),
    ),
    ProductData(
      name: 'Masala Chai',
      category: 'Fresh Tea',
      price: '₹50.00',
      imagePath: 'assets/images/masala_chai.png',
      cardBgColor: const Color(0xFFF1F7F4),
    ),
  ];

  final List<ProductData> _coffeeProducts = [
    ProductData(
      name: 'Espresso',
      category: 'Coffee Cups',
      price: '₹85.00',
      imagePath: 'assets/images/espresso_coffee.png',
      cardBgColor: const Color(0xFFFAF2EE),
    ),
    ProductData(
      name: 'Cappuccino',
      category: 'Coffee Cups',
      price: '₹120.00',
      imagePath: 'assets/images/cappuccino_coffee.png',
      cardBgColor: const Color(0xFFFAF2EE),
    ),
    ProductData(
      name: 'Latte',
      category: 'Coffee Cups',
      price: '₹135.00',
      imagePath: 'assets/images/latte_coffee.png',
      cardBgColor: const Color(0xFFFAF2EE),
    ),
  ];

  // 5 Pre-populated dummy items in cart as requested
  final List<CartItemData> _cartItems = [
    CartItemData(
      name: 'Special Adrak Chai',
      category: 'Fresh Tea',
      price: '₹45.00',
      imagePath: 'assets/images/adrak_chai.png',
      quantity: 2,
      sugar: 'Regular Sugar',
    ),
    CartItemData(
      name: 'Italian Espresso',
      category: 'Coffee Cups',
      price: '₹85.00',
      imagePath: 'assets/images/espresso_coffee.png',
      quantity: 1,
      sugar: 'No Sugar',
    ),
    CartItemData(
      name: 'Elaichi Cardamom Chai',
      category: 'Fresh Tea',
      price: '₹45.00',
      imagePath: 'assets/images/elaichi_chai.png',
      quantity: 1,
      sugar: 'Less Sugar',
    ),
    CartItemData(
      name: 'Creamy Cappuccino',
      category: 'Coffee Cups',
      price: '₹120.00',
      imagePath: 'assets/images/cappuccino_coffee.png',
      quantity: 1,
      sugar: 'Regular Sugar',
    ),
    CartItemData(
      name: 'Vanilla Layer Latte',
      category: 'Coffee Cups',
      price: '₹135.00',
      imagePath: 'assets/images/latte_coffee.png',
      quantity: 2,
      sugar: 'Less Sugar',
    ),
  ];



  @override
  void initState() {
    super.initState();
    const initialPage = 999;
    _currentBannerIndex = initialPage % _banners.length;
    _bannerPageController = PageController(initialPage: initialPage);

    _carouselTimer = Timer.periodic(const Duration(seconds: 4), (timer) {
      if (_bannerPageController.hasClients) {
        _bannerPageController.nextPage(
          duration: const Duration(milliseconds: 800),
          curve: Curves.easeInOutCubic,
        );
      }
    });
  }

  @override
  void dispose() {
    _carouselTimer?.cancel();
    _bannerPageController.dispose();
    super.dispose();
  }

  int _getCartTotalQuantity() {
    return _cartItems.fold(0, (sum, item) => sum + item.quantity);
  }

  void _showProductCustomizationBottomSheet(BuildContext context, ProductData product) {
    int localQuantity = 1;
    String selectedSugar = 'Regular Sugar';
    final List<String> sugarOptions = ['No Sugar', 'Less Sugar', 'Regular Sugar'];

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      backgroundColor: Colors.white,
      builder: (context) {
        return StatefulBuilder(
          builder: (BuildContext context, StateSetter setModalState) {
            return Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            product.name,
                            style: GoogleFonts.sora(
                              fontSize: 20,
                              fontWeight: FontWeight.w700,
                              color: Colors.black,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            product.category,
                            style: GoogleFonts.outfit(
                              fontSize: 14,
                              color: Colors.grey.shade500,
                            ),
                          ),
                        ],
                      ),
                      Text(
                        product.price,
                        style: GoogleFonts.sora(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF8B6B58),
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 32, thickness: 1),
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
                    children: sugarOptions.map((option) {
                      bool isSelected = option == selectedSugar;
                      return Expanded(
                        child: GestureDetector(
                          onTap: () {
                            setModalState(() {
                              selectedSugar = option;
                            });
                          },
                          child: Container(
                            margin: const EdgeInsets.symmetric(horizontal: 4),
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            decoration: BoxDecoration(
                              color: isSelected ? const Color(0xFF1E1E1E) : Colors.white,
                              border: Border.all(
                                color: isSelected ? Colors.transparent : Colors.grey.shade200,
                                width: 1.5,
                              ),
                              borderRadius: BorderRadius.circular(12),
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
                              if (localQuantity > 1) {
                                setModalState(() {
                                  localQuantity--;
                                });
                              }
                            },
                            child: Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(color: Colors.grey.shade200, width: 1.5),
                              ),
                              child: const Icon(Icons.remove, size: 18, color: Colors.black),
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16.0),
                            child: Text(
                              '$localQuantity',
                              style: GoogleFonts.sora(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: Colors.black,
                              ),
                            ),
                          ),
                          GestureDetector(
                            onTap: () {
                              setModalState(() {
                                localQuantity++;
                              });
                            },
                            child: Container(
                              width: 36,
                              height: 36,
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
                  const SizedBox(height: 32),
                  GestureDetector(
                    onTap: () {
                      Navigator.of(context).pop(); // Dismiss bottom sheet
                      setState(() {
                        _cartItems.add(
                          CartItemData(
                            name: product.name,
                            category: product.category,
                            price: product.price,
                            imagePath: product.imagePath,
                            quantity: localQuantity,
                            sugar: selectedSugar,
                          ),
                        );
                      });
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('${product.name} added to cart!')),
                      );
                    },
                    child: Container(
                      width: double.infinity,
                      height: 56,
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E1E1E),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        'Add to Cart',
                        style: GoogleFonts.sora(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _handleExternalAddToCart(dynamic itemMap) {
    final product = ProductData(
      name: itemMap['name'] ?? '',
      category: itemMap['category'] ?? '',
      price: itemMap['price'] ?? '',
      imagePath: itemMap['imagePath'] ?? '',
      cardBgColor: itemMap['bgColor'] ?? const Color(0xFFFAF7F4),
    );
    _showProductCustomizationBottomSheet(context, product);
  }

  Widget _getScreenContent() {
    switch (_currentBottomNavIndex) {
      case 1:
        return FavouritesScreen(onAddToCart: _handleExternalAddToCart);
      case 2:
        return ShopScreen(
          onAddToCart: _handleExternalAddToCart,
          focusSearch: _focusShopSearch,
          onSearchFocusedHandled: () {
            setState(() {
              _focusShopSearch = false;
            });
          },
        );
      case 3:
        return const OrderScreen();
      case 4:
        return const ProfileScreen();
      case 0:
      default:
        final user = FirebaseAuth.instance.currentUser;
        final String displayName = user?.displayName ?? 'Guest User';
        final String photoUrl = user?.photoURL ?? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120';
        
        final currentProducts = _selectedOptionCardIndex == 0 ? _teaProducts : _coffeeProducts;
        return SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Profile Bar + Search + Notifications + Wallet Icons
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 50,
                        height: 50,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          image: DecorationImage(
                            image: NetworkImage(photoUrl),
                            fit: BoxFit.cover,
                          ),
                          border: Border.all(
                            color: Colors.grey.shade200,
                            width: 1,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            displayName,
                            style: GoogleFonts.sora(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: Colors.black,
                            ),
                          ),
                          Text(
                            'Welcome Back,',
                            style: GoogleFonts.outfit(
                              fontSize: 13,
                              color: Colors.grey.shade500,
                              fontWeight: FontWeight.w400,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      _buildHeaderIcon(Icons.search_rounded, () {
                        setState(() {
                          _currentBottomNavIndex = 2; // Switch to Shop Screen
                          _focusShopSearch = true; // Request textfield focus
                        });
                      }),
                      const SizedBox(width: 8),
                      _buildHeaderIcon(Icons.notifications_none_rounded, () {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (context) => const NotificationScreen()),
                        );
                      }),
                      const SizedBox(width: 8),
                      _buildHeaderIcon(Icons.account_balance_wallet_outlined, () {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (context) => const WalletScreen()),
                        );
                      }),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Auto-scrolling Carousel Banner
              SizedBox(
                height: 190,
                child: PageView.builder(
                  controller: _bannerPageController,
                  onPageChanged: (int index) {
                    setState(() {
                      _currentBannerIndex = index % _banners.length;
                    });
                  },
                  itemBuilder: (context, index) {
                    final banner = _banners[index % _banners.length];
                    return Container(
                      margin: const EdgeInsets.symmetric(horizontal: 2),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: banner.cardBgColor,
                        borderRadius: BorderRadius.circular(28),
                      ),
                      child: Stack(
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              RichText(
                                text: TextSpan(
                                  style: GoogleFonts.sora(
                                    fontSize: 20,
                                    height: 1.15,
                                    fontWeight: FontWeight.w800,
                                  ),
                                  children: [
                                    TextSpan(
                                      text: '${banner.titleLine1}\n',
                                      style: const TextStyle(color: Colors.black),
                                    ),
                                    TextSpan(
                                      text: '${banner.titleLine2} ',
                                      style: const TextStyle(color: Color(0xFFE65100)),
                                    ),
                                    TextSpan(
                                      text: banner.titleLine3,
                                      style: const TextStyle(color: Colors.black),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 8),
                              SizedBox(
                                width: 170,
                                child: Text(
                                  banner.subtitle,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.outfit(
                                    fontSize: 11,
                                    color: Colors.grey.shade600,
                                    height: 1.3,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 12),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                decoration: BoxDecoration(
                                  color: Colors.black,
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  'Order Now',
                                  style: GoogleFonts.sora(
                                    color: Colors.white,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          Positioned(
                            right: 0,
                            top: 0,
                            bottom: 0,
                            child: Row(
                              children: [
                                Align(
                                  alignment: Alignment.bottomCenter,
                                  child: Container(
                                    margin: const EdgeInsets.only(bottom: 12),
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFC5E1A5),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Text(
                                      banner.discount,
                                      style: GoogleFonts.sora(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w800,
                                        color: const Color(0xFF33691E),
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                banner.isCapsuleImage
                                    ? Container(
                                        width: 76,
                                        height: 130,
                                        decoration: BoxDecoration(
                                          borderRadius: BorderRadius.circular(40),
                                          border: Border.all(
                                            color: Colors.orange.shade700,
                                            width: 3.5,
                                          ),
                                          image: DecorationImage(
                                            image: AssetImage(banner.imagePath),
                                            fit: BoxFit.cover,
                                          ),
                                        ),
                                      )
                                    : Image.asset(
                                        banner.imagePath,
                                        width: 90,
                                        height: 130,
                                        fit: BoxFit.contain,
                                      ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 8),

              // Dot Indicator
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(_banners.length, (index) {
                  bool isSelected = index == _currentBannerIndex;
                  return AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    height: 5,
                    width: isSelected ? 15 : 5,
                    decoration: BoxDecoration(
                      color: isSelected ? const Color(0xFF8B6B58) : Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(3),
                    ),
                  );
                }),
              ),
              const SizedBox(height: 24),

              // Tea and Coffee 3D Cute Options Row
              Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () {
                        setState(() {
                          _selectedOptionCardIndex = 0;
                        });
                      },
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 250),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          color: _selectedOptionCardIndex == 0 ? const Color(0xFFE8F1ED) : Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: _selectedOptionCardIndex == 0 ? const Color(0xFF2E7D32) : Colors.grey.shade200,
                            width: 1.5,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withAlpha(4),
                              blurRadius: 8,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Image.asset(
                              'assets/images/tea_icon.png',
                              width: 32,
                              height: 32,
                              errorBuilder: (context, error, stackTrace) => const Icon(
                                Icons.emoji_food_beverage_rounded,
                                color: Color(0xFF2E7D32),
                                size: 20,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Text(
                              'Tea / Chai',
                              style: GoogleFonts.sora(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: Colors.black,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: GestureDetector(
                      onTap: () {
                        setState(() {
                          _selectedOptionCardIndex = 1;
                        });
                      },
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 250),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          color: _selectedOptionCardIndex == 1 ? const Color(0xFFFDE8E1) : Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: _selectedOptionCardIndex == 1 ? const Color(0xFFE65100) : Colors.grey.shade200,
                            width: 1.5,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withAlpha(4),
                              blurRadius: 8,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Image.asset(
                              'assets/images/coffee_icon.png',
                              width: 32,
                              height: 32,
                              errorBuilder: (context, error, stackTrace) => const Icon(
                                Icons.coffee_rounded,
                                color: Color(0xFFE65100),
                                size: 20,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Text(
                              'Coffee',
                              style: GoogleFonts.sora(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: Colors.black,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 28),

              // Horizontal Product Carousel
              SizedBox(
                height: 270,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  itemCount: currentProducts.length,
                  itemBuilder: (context, index) {
                    final product = currentProducts[index];
                    return _buildProductCard(
                      product: product,
                    );
                  },
                ),
              ),
              const SizedBox(height: 28),

              // Recommended Title Row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Recommended',
                    style: GoogleFonts.sora(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: Colors.black,
                    ),
                  ),
                  Text(
                    'View all',
                    style: GoogleFonts.outfit(
                      fontSize: 14,
                      color: Colors.grey.shade400,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Recommended List Item
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.grey.shade100),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 70,
                      height: 70,
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F7F4),
                        borderRadius: BorderRadius.circular(16),
                        image: DecorationImage(
                          image: AssetImage(_selectedOptionCardIndex == 0
                              ? 'assets/images/adrak_chai.png'
                              : 'assets/images/espresso_coffee.png'),
                          fit: BoxFit.contain,
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _selectedOptionCardIndex == 0 ? 'Special Adrak Chai' : 'Indonesian Blend Espresso',
                            style: GoogleFonts.sora(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: Colors.black,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            _selectedOptionCardIndex == 0 ? 'Fresh Tea' : 'Coffee Cups',
                            style: GoogleFonts.outfit(
                              fontSize: 12,
                              color: Colors.grey.shade400,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              const Icon(
                                Icons.star_rounded,
                                color: Colors.amber,
                                size: 16,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                '4.9',
                                style: GoogleFonts.sora(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.black,
                                ),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                '(310) reviews',
                                style: GoogleFonts.outfit(
                                  fontSize: 10,
                                  color: Colors.grey.shade400,
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
              const SizedBox(height: 28),

              // Your Fav is Here Section
              Text(
                'Your Fav is Here',
                style: GoogleFonts.sora(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: Colors.black,
                ),
              ),
              const SizedBox(height: 16),

              // Horizontal Favorites Carousel
              SizedBox(
                height: 270,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  itemCount: [..._teaProducts, ..._coffeeProducts].length,
                  itemBuilder: (context, index) {
                    final product = [..._teaProducts, ..._coffeeProducts][index];
                    return _buildProductCard(
                      product: product,
                    );
                  },
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFDFDFD),
      body: SafeArea(
        child: Stack(
          children: [
            Column(
              children: [
                Expanded(
                  child: _getScreenContent(),
                ),

                // Bottom Navigation Bar with System Safety Margins
                SafeArea(
                  top: false,
                  bottom: true,
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withAlpha(12),
                          blurRadius: 20,
                          offset: const Offset(0, -4),
                        ),
                      ],
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildBottomNavItem(Icons.home_rounded, 'Home', 0),
                        _buildBottomNavItem(Icons.favorite_border_rounded, 'Favourites', 1),
                        _buildBottomNavItem(Icons.storefront_rounded, 'Shop', 2),
                        _buildBottomNavItem(Icons.receipt_long_outlined, 'Order', 3),
                        _buildBottomNavItem(Icons.person_outline_rounded, 'Profile', 4),
                      ],
                    ),
                  ),
                ),
              ],
            ),

            // Quarter-Circular (Quadrant) Cart Drawer Overlay in Bottom-Right
            if (_isCartOpen) ...[
              Positioned.fill(
                child: GestureDetector(
                  onTap: () {
                    setState(() {
                      _isCartOpen = false;
                    });
                  },
                  child: Container(
                    color: Colors.black.withAlpha(70),
                  ),
                ),
              ),
              Positioned(
                bottom: 85,
                right: 16,
                child: TweenAnimationBuilder<double>(
                  tween: Tween<double>(begin: 0.0, end: 1.0),
                  duration: const Duration(milliseconds: 550),
                  curve: Curves.easeOutBack,
                  builder: (context, value, child) {
                    return Transform.scale(
                      scale: value,
                      alignment: Alignment.bottomRight,
                      child: Opacity(
                        opacity: value.clamp(0.0, 1.0),
                        child: child,
                      ),
                    );
                  },
                  child: Container(
                    width: 360,
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: const BorderRadius.only(
                        topLeft: Radius.circular(32),
                        topRight: Radius.circular(12),
                        bottomLeft: Radius.circular(32),
                        bottomRight: Radius.circular(32),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withAlpha(20),
                          blurRadius: 24,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.shopping_bag_outlined, color: Color(0xFF8B6B58), size: 22),
                                const SizedBox(width: 8),
                                Text(
                                  'My Cart',
                                  style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.black),
                                ),
                              ],
                            ),
                            GestureDetector(
                              onTap: () {
                                setState(() {
                                  _isCartOpen = false;
                                });
                              },
                              child: const Icon(Icons.close_rounded, size: 20, color: Colors.grey),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),

                        // 1 Column Vertical Scroll List
                        SizedBox(
                          height: 250,
                          child: _cartItems.isEmpty
                              ? Center(
                                  child: Text(
                                    'Your Cart is empty',
                                    style: GoogleFonts.outfit(color: Colors.grey.shade400, fontSize: 14),
                                  ),
                                )
                              : ListView.builder(
                                  physics: const BouncingScrollPhysics(),
                                  itemCount: _cartItems.length,
                                  itemBuilder: (context, index) {
                                    final item = _cartItems[index];
                                    return Padding(
                                      padding: const EdgeInsets.only(bottom: 10.0),
                                      child: AnimatedCartItemCard(
                                        key: ValueKey(item.name + item.sugar),
                                        item: item,
                                        onIncrement: () {
                                          setState(() {
                                            _cartItems[index] = item.copyWith(quantity: item.quantity + 1);
                                          });
                                        },
                                        onDecrement: () {
                                          setState(() {
                                            _cartItems[index] = item.copyWith(quantity: item.quantity - 1);
                                          });
                                        },
                                        onRemove: () {
                                          setState(() {
                                            _cartItems.removeAt(index);
                                          });
                                        },
                                      ),
                                    );
                                  },
                                ),
                        ),
                        const SizedBox(height: 16),

                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Items',
                                  style: GoogleFonts.outfit(fontSize: 11, color: Colors.grey),
                                ),
                                Text(
                                  '${_getCartTotalQuantity()} Items',
                                  style: GoogleFonts.sora(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.black),
                                ),
                              ],
                            ),
                            GestureDetector(
                              onTap: () {
                                setState(() {
                                  _isCartOpen = false;
                                });
                                if (_cartItems.isNotEmpty) {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (context) => CheckoutScreen(
                                        productName: _cartItems.first.name,
                                        productPrice: _cartItems.first.price,
                                        sugarOption: _cartItems.first.sugar,
                                        quantity: _cartItems.first.quantity,
                                      ),
                                    ),
                                  );
                                }
                              },
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF1E1E1E),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  'Checkout',
                                  style: GoogleFonts.sora(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],

            // Floating Cart Icon Button (hidden when cart drawer is open)
            if (!_isCartOpen)
              Positioned(
                bottom: 95,
                right: 24,
                child: GestureDetector(
                  onTap: () {
                    setState(() {
                      _isCartOpen = true;
                    });
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF8B6B58),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withAlpha(20),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Stack(
                          clipBehavior: Clip.none,
                          children: [
                            const Icon(Icons.shopping_cart_outlined, color: Colors.white, size: 20),
                            if (_getCartTotalQuantity() > 0)
                              Positioned(
                                right: -8,
                                top: -8,
                                child: Container(
                                  padding: const EdgeInsets.all(3),
                                  decoration: const BoxDecoration(
                                    color: Colors.redAccent,
                                    shape: BoxShape.circle,
                                  ),
                                  constraints: const BoxConstraints(
                                    minWidth: 14,
                                    minHeight: 14,
                                  ),
                                  child: Text(
                                    '${_getCartTotalQuantity()}',
                                    style: GoogleFonts.sora(
                                      color: Colors.white,
                                      fontSize: 8,
                                      fontWeight: FontWeight.bold,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(width: 10),
                        Text(
                          'Cart',
                          style: GoogleFonts.sora(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeaderIcon(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: Colors.grey.shade200, width: 1.5),
        ),
        child: Icon(
          icon,
          color: Colors.black,
          size: 20,
        ),
      ),
    );
  }

  Widget _buildProductCard({
    required ProductData product,
  }) {
    return GestureDetector(
      onTap: () {
        final itemMap = {
          'name': product.name,
          'category': product.category,
          'price': product.price,
          'imagePath': product.imagePath,
          'bgColor': product.cardBgColor,
        };
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => ProductDetailScreen(
              product: itemMap,
              onAddToCart: _handleExternalAddToCart,
            ),
          ),
        );
      },
      child: Container(
        width: 175,
        height: 262.5, // 4:6 aspect ratio for width 175
        margin: const EdgeInsets.only(right: 16, bottom: 8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha(6),
              blurRadius: 12,
              offset: const Offset(0, 6),
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
                  color: product.cardBgColor,
                  child: Image.asset(
                    product.imagePath,
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
                    product.name,
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
                    product.category,
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
                        product.price,
                        style: GoogleFonts.sora(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: Colors.black,
                        ),
                      ),
                      GestureDetector(
                        onTap: () => _showProductCustomizationBottomSheet(context, product),
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
  }

  Widget _buildBottomNavItem(IconData icon, String label, int index) {
    bool isSelected = _currentBottomNavIndex == index;
    return GestureDetector(
      onTap: () {
        setState(() {
          _currentBottomNavIndex = index;
        });
      },
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            color: isSelected ? const Color(0xFF8B6B58) : Colors.grey.shade400,
            size: 22,
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: GoogleFonts.outfit(
              fontSize: 10,
              fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
              color: isSelected ? const Color(0xFF8B6B58) : Colors.grey.shade400,
            ),
          ),
        ],
      ),
    );
  }
}

// Stateful Animated Card Widget for Cart Items (2-column layout version)
class AnimatedCartItemCard extends StatefulWidget {
  final CartItemData item;
  final VoidCallback onIncrement;
  final VoidCallback onDecrement;
  final VoidCallback onRemove;

  const AnimatedCartItemCard({
    super.key,
    required this.item,
    required this.onIncrement,
    required this.onDecrement,
    required this.onRemove,
  });

  @override
  State<AnimatedCartItemCard> createState() => _AnimatedCartItemCardState();
}

class _AnimatedCartItemCardState extends State<AnimatedCartItemCard> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInBack),
    );
    _slideAnimation = Tween<Offset>(
      begin: Offset.zero,
      end: const Offset(1.5, -0.6), // Slides out top-right (looks like thrown out)
    ).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInBack),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _triggerRemove() {
    _controller.forward().then((_) {
      widget.onRemove();
    });
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Transform.translate(
          offset: _slideAnimation.value * 160.0,
          child: Transform.scale(
            scale: _scaleAnimation.value,
            child: child,
          ),
        );
      },
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: const Color(0xFFF1EDE9),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF5C4033).withAlpha(12),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            // Left Product Image Container (Soft Warm Background)
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: const Color(0xFFFAF7F4),
                borderRadius: BorderRadius.circular(12),
              ),
              padding: const EdgeInsets.all(4),
              child: Image.asset(widget.item.imagePath, fit: BoxFit.contain),
            ),
            const SizedBox(width: 8),
            // Middle Details
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    widget.item.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.sora(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF2D1E18),
                    ),
                  ),
                  const SizedBox(height: 1),
                  Text(
                    'Sugar: ${widget.item.sugar.split(' ')[0]}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.outfit(
                      fontSize: 8,
                      color: const Color(0xFF8D7F78),
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    widget.item.price,
                    style: GoogleFonts.sora(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF8B6B58),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 4),
            // Right Pill-shaped quantity selector
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 3),
              decoration: BoxDecoration(
                color: const Color(0xFF2D1E18),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  GestureDetector(
                    onTap: () {
                      if (widget.item.quantity == 1) {
                        _triggerRemove();
                      } else {
                        widget.onDecrement();
                      }
                    },
                    child: const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 3.0),
                      child: Icon(Icons.remove, color: Colors.white, size: 8),
                    ),
                  ),
                  Text(
                    widget.item.quantity.toString().padLeft(3, '0'),
                    style: GoogleFonts.sora(
                      color: Colors.white,
                      fontSize: 9,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  GestureDetector(
                    onTap: widget.onIncrement,
                    child: const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 3.0),
                      child: Icon(Icons.add, color: Colors.white, size: 8),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class PromoBannerData {
  final String titleLine1;
  final String titleLine2;
  final String titleLine3;
  final String subtitle;
  final String discount;
  final String imagePath;
  final bool isCapsuleImage;
  final Color cardBgColor;

  PromoBannerData({
    required this.titleLine1,
    required this.titleLine2,
    required this.titleLine3,
    required this.subtitle,
    required this.discount,
    required this.imagePath,
    required this.isCapsuleImage,
    required this.cardBgColor,
  });
}

class ProductData {
  final String name;
  final String category;
  final String price;
  final String imagePath;
  final Color cardBgColor;

  ProductData({
    required this.name,
    required this.category,
    required this.price,
    required this.imagePath,
    required this.cardBgColor,
  });
}

class CartItemData {
  final String name;
  final String category;
  final String price;
  final String imagePath;
  final int quantity;
  final String sugar;

  CartItemData({
    required this.name,
    required this.category,
    required this.price,
    required this.imagePath,
    required this.quantity,
    required this.sugar,
  });

  CartItemData copyWith({
    String? name,
    String? category,
    String? price,
    String? imagePath,
    int? quantity,
    String? sugar,
  }) {
    return CartItemData(
      name: name ?? this.name,
      category: category ?? this.category,
      price: price ?? this.price,
      imagePath: imagePath ?? this.imagePath,
      quantity: quantity ?? this.quantity,
      sugar: sugar ?? this.sugar,
    );
  }
}

class SubscriptionPlanData {
  final String title;
  final String price;
  final String perks;
  final Color color;
  final Color borderColor;
  final IconData icon;

  SubscriptionPlanData({
    required this.title,
    required this.price,
    required this.perks,
    required this.color,
    required this.borderColor,
    required this.icon,
  });
}
