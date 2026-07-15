import 'dart:async';
import 'dart:convert';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter/material.dart';
import 'dart:ui';
import 'package:google_fonts/google_fonts.dart';
import '../state/cart_state.dart';
import 'checkout_screen.dart';
import 'favourites_screen.dart';
import 'order_screen.dart';
import 'profile_screen.dart';
import 'shop_screen.dart';
import 'wallet_screen.dart';
import 'notification_screen.dart';
import 'product_detail_screen.dart';
import 'order_detail_screen.dart';
import '../state/wallet_state.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  StreamSubscription? _productsSubscription;
  StreamSubscription? _userSubscription;

  ProductData _productFromDocument(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};
    return ProductData(
      name: data['name'] ?? 'Unknown',
      category: data['category'] ?? 'Uncategorized',
      price: data['price'] ?? '₹0.00',
      imagePath: data['image'] ?? 'assets/images/placeholder.png',
      cardBgColor: const Color(0xFFF1F7F4),
      description: data['description'] ?? 'No description provided.',
      caffeine: data['caffeine'] ?? 'Medium',
      sweetness: data['sweetness'] ?? 'Medium',
      steepTime: data['steepTime'] ?? '5 mins',
      gallery: (data['gallery'] is List)
          ? (data['gallery'] as List).map((e) => e.toString()).toList()
          : [],
    );
  }

  int _currentBannerIndex = 0;
  int _currentBottomNavIndex =
      0; // 0: Home, 1: Favourites, 2: Shop, 3: Order, 4: Profile

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

  final List<ProductData> _teaProducts = [];
  final List<ProductData> _coffeeProducts = [];
  List<ProductData> _recommendedProducts = [];

  @override
  void initState() {
    super.initState();
    CartState.loadCart();
    _listenToProducts();
    _listenToUser();
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

  void _listenToProducts() {
    _productsSubscription = FirebaseFirestore.instance
        .collection('products')
        .snapshots()
        .listen((snapshot) {
          final allProducts = snapshot.docs
              .map((doc) => _productFromDocument(doc))
              .toList();
          final chaiList = allProducts
              .where((p) => p.category == 'Chai')
              .toList();
          final coffeeList = allProducts
              .where((p) => p.category == 'Coffee')
              .toList();

          if (mounted) {
            setState(() {
              if (chaiList.isNotEmpty) {
                _teaProducts.clear();
                _teaProducts.addAll(chaiList);
              }
              if (coffeeList.isNotEmpty) {
                _coffeeProducts.clear();
                _coffeeProducts.addAll(coffeeList);
              }
              _recommendedProducts = List.from(allProducts)..shuffle();
            });
          }
        });
  }

  void _listenToUser() {
    final user = FirebaseAuth.instance.currentUser;
    if (user != null) {
      _userSubscription = FirebaseFirestore.instance
          .collection('users')
          .doc(user.uid)
          .snapshots()
          .listen((doc) {
            if (doc.exists && doc.data() != null) {
              final data = doc.data()!;
              if (data.containsKey('wallet')) {
                WalletState.balance.value = (data['wallet'] as num).toDouble();
              }
            }
          });
      _setupPushNotifications(user.uid);
    }
  }

  void _setupPushNotifications(String uid) async {
    FirebaseMessaging messaging = FirebaseMessaging.instance;
    NotificationSettings settings = await messaging.requestPermission();

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      String? token = await messaging.getToken();
      if (token != null) {
        FirebaseFirestore.instance.collection('users').doc(uid).set({
          'fcmToken': token,
        }, SetOptions(merge: true));
      }

      // Listen to token refresh
      messaging.onTokenRefresh.listen((newToken) {
        FirebaseFirestore.instance.collection('users').doc(uid).set({
          'fcmToken': newToken,
        }, SetOptions(merge: true));
      });

      // Setup Local Notifications for Foreground
      final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin =
          FlutterLocalNotificationsPlugin();
      const AndroidInitializationSettings initializationSettingsAndroid =
          AndroidInitializationSettings('@mipmap/ic_launcher');
      const InitializationSettings initializationSettings =
          InitializationSettings(android: initializationSettingsAndroid);
      await flutterLocalNotificationsPlugin.initialize(
        settings: initializationSettings,
        onDidReceiveNotificationResponse: (NotificationResponse response) {
          if (response.payload != null) {
            final data = jsonDecode(response.payload!);
            _handleNotificationClick(data);
          }
        },
      );

      // 1. Foreground message local notification
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        RemoteNotification? notification = message.notification;
        AndroidNotification? android = message.notification?.android;
        if (notification != null && android != null) {
          flutterLocalNotificationsPlugin.show(
            id: notification.hashCode,
            title: notification.title,
            body: notification.body,
            notificationDetails: const NotificationDetails(
              android: AndroidNotificationDetails(
                'high_importance_channel',
                'High Importance Notifications',
                importance: Importance.max,
                priority: Priority.high,
              ),
            ),
            payload: jsonEncode(message.data),
          );
        }
      });

      // 2. App opened from background via notification
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        _handleNotificationClick(message.data);
      });

      // 3. App launched from terminated state via notification
      messaging.getInitialMessage().then((RemoteMessage? message) {
        if (message != null) {
          // Add a small delay to ensure rendering is complete before dialog pops up
          Future.delayed(const Duration(milliseconds: 500), () {
            if (mounted) _handleNotificationClick(message.data);
          });
        }
      });
    }
  }

  void _handleNotificationClick(Map<String, dynamic> data) async {
    final orderId = data['orderId'];
    if (orderId != null && orderId.toString().isNotEmpty) {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => const Center(child: CircularProgressIndicator()),
      );
      try {
        final orderSnap = await FirebaseFirestore.instance
            .collection('orders')
            .doc(orderId)
            .get();
        if (mounted) Navigator.pop(context);
        if (orderSnap.exists && mounted) {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => OrderDetailScreen(
                orderData: {...orderSnap.data()!, 'id': orderSnap.id},
              ),
            ),
          );
        }
      } catch (e) {
        if (mounted) Navigator.pop(context);
      }
    }
  }

  @override
  void dispose() {
    _productsSubscription?.cancel();
    _userSubscription?.cancel();
    _bannerPageController.dispose();
    _carouselTimer?.cancel();
    super.dispose();
  }

  void _showProductCustomizationBottomSheet(
    BuildContext context,
    ProductData product,
  ) {
    int localQuantity = 1;
    String selectedSugar = 'Regular Sugar';
    final List<String> sugarOptions = [
      'No Sugar',
      'Less Sugar',
      'Regular Sugar',
    ];

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
                              color: isSelected
                                  ? const Color(0xFF1E1E1E)
                                  : Colors.white,
                              border: Border.all(
                                color: isSelected
                                    ? Colors.transparent
                                    : Colors.grey.shade200,
                                width: 1.5,
                              ),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              option.split(' ')[0],
                              style: GoogleFonts.sora(
                                color: isSelected
                                    ? Colors.white
                                    : Colors.grey.shade500,
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
                                border: Border.all(
                                  color: Colors.grey.shade200,
                                  width: 1.5,
                                ),
                              ),
                              child: const Icon(
                                Icons.remove,
                                size: 18,
                                color: Colors.black,
                              ),
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16.0,
                            ),
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
                                border: Border.all(
                                  color: Colors.grey.shade200,
                                  width: 1.5,
                                ),
                              ),
                              child: const Icon(
                                Icons.add,
                                size: 18,
                                color: Colors.black,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 32),
                  GestureDetector(
                    onTap: () {
                      CartState.addItem(
                        CartItemData(
                          name: product.name,
                          category: product.category,
                          price: product.price,
                          imagePath: product.imagePath,
                          quantity: localQuantity,
                          sugar: selectedSugar,
                        ),
                      );
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('${product.name} added to cart!'),
                        ),
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
    if (itemMap == null) return;

    CartState.addItem(
      CartItemData(
        name: itemMap['name'] ?? '',
        category: itemMap['category'] ?? 'Item',
        price: itemMap['price']?.toString() ?? '₹0.00',
        imagePath: itemMap['image'] ?? itemMap['imagePath'] ?? '',
        quantity: 1,
        sugar: 'Regular Sugar', // default
      ),
    );

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${itemMap['name']} added to cart!'),
          backgroundColor: const Color(0xFF8B6B58),
        ),
      );
      setState(() {
        _isCartOpen = true; // Automatically open cart when added
      });
    }
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
        final String photoUrl =
            user?.photoURL ??
            'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120';

        final currentProducts = _selectedOptionCardIndex == 0
            ? _teaProducts
            : _coffeeProducts;
        final topProducts = _recommendedProducts.isNotEmpty
            ? _recommendedProducts.take(5).toList()
            : [];
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
                  Expanded(
                    child: Row(
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
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                displayName,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
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
                        ),
                      ],
                    ),
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
                          MaterialPageRoute(
                            builder: (context) => const NotificationScreen(),
                          ),
                        );
                      }),
                      const SizedBox(width: 8),
                      _buildHeaderIcon(
                        Icons.account_balance_wallet_outlined,
                        () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (context) => const WalletScreen(),
                            ),
                          );
                        },
                      ),
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
                      _currentBannerIndex = topProducts.isEmpty
                          ? 0
                          : (index % topProducts.length);
                    });
                  },
                  itemBuilder: (context, index) {
                    if (topProducts.isEmpty) {
                      return Container(
                        margin: const EdgeInsets.symmetric(horizontal: 2),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade200,
                          borderRadius: BorderRadius.circular(28),
                        ),
                        child: const Center(child: CircularProgressIndicator()),
                      );
                    }
                    final product = topProducts[index % topProducts.length];
                    return GestureDetector(
                      onTap: () {
                        final Map<String, dynamic> itemMap = {
                          'id': product.name.replaceAll(' ', '').toLowerCase(),
                          'name': product.name,
                          'category': product.category,
                          'price': product.price.replaceAll('₹', ''),
                          'imagePath': product.imagePath,
                          'bgColor': product.cardBgColor,
                          'description': product.description,
                          'caffeine': product.caffeine,
                          'sweetness': product.sweetness,
                          'steepTime': product.steepTime,
                          'gallery': product.gallery,
                        };
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => ProductDetailScreen(
                              product: itemMap,
                              onAddToCart: _handleExternalAddToCart,
                            ),
                          ),
                        );
                      },
                      child: Container(
                        margin: const EdgeInsets.symmetric(horizontal: 2),
                        decoration: BoxDecoration(
                          color: product.cardBgColor,
                          borderRadius: BorderRadius.circular(28),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: Stack(
                          children: [
                            // Full background image
                            Positioned.fill(
                              child: product.imagePath.startsWith('http')
                                  ? Image.network(
                                      product.imagePath,
                                      fit: BoxFit.cover,
                                      errorBuilder: (_, __, ___) => Image.asset(
                                        'assets/images/tea_icon.png',
                                        fit: BoxFit.cover,
                                      ),
                                    )
                                  : product.imagePath.startsWith('data:image')
                                  ? Image.memory(
                                      base64Decode(
                                        product.imagePath.split(',').last,
                                      ),
                                      fit: BoxFit.cover,
                                      errorBuilder: (_, __, ___) => Image.asset(
                                        'assets/images/tea_icon.png',
                                        fit: BoxFit.cover,
                                      ),
                                    )
                                  : Image.asset(
                                      product.imagePath,
                                      fit: BoxFit.cover,
                                      errorBuilder: (_, __, ___) => Image.asset(
                                        'assets/images/tea_icon.png',
                                        fit: BoxFit.cover,
                                      ),
                                    ),
                            ),
                            // Gradient Overlay for text readability
                            Positioned.fill(
                              child: Container(
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    colors: [
                                      Colors.black.withAlpha(200),
                                      Colors.transparent,
                                      Colors.black.withAlpha(80),
                                    ],
                                    begin: Alignment.bottomCenter,
                                    end: Alignment.topCenter,
                                  ),
                                ),
                              ),
                            ),
                            // Glassmorphism Best Seller Badge
                            Positioned(
                              top: 16,
                              right: 16,
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child: BackdropFilter(
                                  filter: ImageFilter.blur(
                                    sigmaX: 5,
                                    sigmaY: 5,
                                  ),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 10,
                                      vertical: 6,
                                    ),
                                    decoration: BoxDecoration(
                                      color: Colors.white.withAlpha(50),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(
                                        color: Colors.white.withAlpha(100),
                                      ),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Icon(
                                          Icons.star_rounded,
                                          color: Colors.amber,
                                          size: 14,
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          'BEST SELLER',
                                          style: GoogleFonts.sora(
                                            fontSize: 10,
                                            fontWeight: FontWeight.bold,
                                            color: Colors.white,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            // Premium Content at bottom
                            Positioned(
                              bottom: 20,
                              left: 20,
                              right: 20,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    product.category.toUpperCase(),
                                    style: GoogleFonts.outfit(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      letterSpacing: 1.2,
                                      color: Colors.white70,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Expanded(
                                        child: Text(
                                          product.name,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: GoogleFonts.sora(
                                            fontSize: 24,
                                            fontWeight: FontWeight.w800,
                                            color: Colors.white,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 14,
                                          vertical: 8,
                                        ),
                                        decoration: BoxDecoration(
                                          color: Colors.white,
                                          borderRadius: BorderRadius.circular(
                                            14,
                                          ),
                                          boxShadow: [
                                            BoxShadow(
                                              color: Colors.black.withAlpha(20),
                                              blurRadius: 10,
                                              offset: const Offset(0, 4),
                                            ),
                                          ],
                                        ),
                                        child: Text(
                                          '${product.price}',
                                          style: GoogleFonts.sora(
                                            fontSize: 14,
                                            fontWeight: FontWeight.bold,
                                            color: Colors.black87,
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
              const SizedBox(height: 8),

              // Dot Indicator
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(topProducts.length, (index) {
                  bool isSelected = index == _currentBannerIndex;
                  return AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    height: 5,
                    width: isSelected ? 15 : 5,
                    decoration: BoxDecoration(
                      color: isSelected
                          ? const Color(0xFF8B6B58)
                          : Colors.grey.shade300,
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
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 12,
                        ),
                        decoration: BoxDecoration(
                          color: _selectedOptionCardIndex == 0
                              ? const Color(0xFFE8F1ED)
                              : Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: _selectedOptionCardIndex == 0
                                ? const Color(0xFF2E7D32)
                                : Colors.grey.shade200,
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
                              errorBuilder: (context, error, stackTrace) =>
                                  const Icon(
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
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 12,
                        ),
                        decoration: BoxDecoration(
                          color: _selectedOptionCardIndex == 1
                              ? const Color(0xFFFDE8E1)
                              : Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: _selectedOptionCardIndex == 1
                                ? const Color(0xFFE65100)
                                : Colors.grey.shade200,
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
                              errorBuilder: (context, error, stackTrace) =>
                                  const Icon(
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
                    return _buildProductCard(product: product);
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

              // Recommended Carousel
              SizedBox(
                height: 270,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  itemCount: _recommendedProducts.length,
                  itemBuilder: (context, index) {
                    final product = _recommendedProducts[index];
                    return _buildProductCard(product: product);
                  },
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
                    final product = [
                      ..._teaProducts,
                      ..._coffeeProducts,
                    ][index];
                    return _buildProductCard(product: product);
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
                Expanded(child: _getScreenContent()),

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
                        _buildBottomNavItem(
                          Icons.favorite_border_rounded,
                          'Favourites',
                          1,
                        ),
                        _buildBottomNavItem(
                          Icons.storefront_rounded,
                          'Shop',
                          2,
                        ),
                        _buildBottomNavItem(
                          Icons.receipt_long_outlined,
                          'Order',
                          3,
                        ),
                        _buildBottomNavItem(
                          Icons.person_outline_rounded,
                          'Profile',
                          4,
                        ),
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
                  child: Container(color: Colors.black.withAlpha(70)),
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
                    constraints: BoxConstraints(
                      maxWidth: MediaQuery.of(context).size.width * 0.9,
                      minWidth: 300,
                    ),
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
                                const Icon(
                                  Icons.shopping_bag_outlined,
                                  color: Color(0xFF8B6B58),
                                  size: 22,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'My Cart',
                                  style: GoogleFonts.sora(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                    color: Colors.black,
                                  ),
                                ),
                              ],
                            ),
                            GestureDetector(
                              onTap: () {
                                setState(() {
                                  _isCartOpen = false;
                                });
                              },
                              child: const Icon(
                                Icons.close_rounded,
                                size: 20,
                                color: Colors.grey,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),

                        // 1 Column Vertical Scroll List
                        ValueListenableBuilder<List<CartItemData>>(
                          valueListenable: CartState.items,
                          builder: (context, cartItems, child) {
                            return Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                SizedBox(
                                  height: 250,
                                  child: cartItems.isEmpty
                                      ? Center(
                                          child: Text(
                                            'Your Cart is empty',
                                            style: GoogleFonts.outfit(
                                              color: Colors.grey.shade400,
                                              fontSize: 14,
                                            ),
                                          ),
                                        )
                                      : ListView.builder(
                                          physics:
                                              const BouncingScrollPhysics(),
                                          itemCount: cartItems.length,
                                          itemBuilder: (context, index) {
                                            final item = cartItems[index];
                                            return Padding(
                                              padding: const EdgeInsets.only(
                                                bottom: 10.0,
                                              ),
                                              child: AnimatedCartItemCard(
                                                key: ValueKey(
                                                  item.name + item.sugar,
                                                ),
                                                item: item,
                                                onIncrement: () {
                                                  CartState.updateItemQuantity(
                                                    index,
                                                    item.quantity + 1,
                                                  );
                                                },
                                                onDecrement: () {
                                                  if (item.quantity > 1) {
                                                    CartState.updateItemQuantity(
                                                      index,
                                                      item.quantity - 1,
                                                    );
                                                  } else {
                                                    CartState.removeItem(index);
                                                  }
                                                },
                                                onRemove: () {
                                                  CartState.removeItem(index);
                                                },
                                              ),
                                            );
                                          },
                                        ),
                                ),
                                const SizedBox(height: 16),
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Items',
                                          style: GoogleFonts.outfit(
                                            fontSize: 11,
                                            color: Colors.grey,
                                          ),
                                        ),
                                        Text(
                                          '${CartState.totalQuantity} Items',
                                          style: GoogleFonts.sora(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w700,
                                            color: Colors.black,
                                          ),
                                        ),
                                      ],
                                    ),
                                    GestureDetector(
                                      onTap: () {
                                        setState(() {
                                          _isCartOpen = false;
                                        });
                                        if (cartItems.isNotEmpty) {
                                          Navigator.of(context).push(
                                            MaterialPageRoute(
                                              builder: (context) =>
                                                  CheckoutScreen(
                                                    cartItems: cartItems,
                                                  ),
                                            ),
                                          );
                                        }
                                      },
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 24,
                                          vertical: 10,
                                        ),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFF1E1E1E),
                                          borderRadius: BorderRadius.circular(
                                            12,
                                          ),
                                        ),
                                        child: Text(
                                          'Checkout',
                                          style: GoogleFonts.sora(
                                            color: Colors.white,
                                            fontSize: 13,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            );
                          },
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
                    padding: const EdgeInsets.symmetric(
                      horizontal: 18,
                      vertical: 12,
                    ),
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
                            const Icon(
                              Icons.shopping_cart_outlined,
                              color: Colors.white,
                              size: 20,
                            ),
                            ValueListenableBuilder<List<CartItemData>>(
                              valueListenable: CartState.items,
                              builder: (context, cartItems, _) {
                                if (CartState.totalQuantity > 0) {
                                  return Positioned(
                                    right: -8,
                                    top: -8,
                                    child: Container(
                                      padding: const EdgeInsets.all(3),
                                      decoration: const BoxDecoration(
                                        color: Colors.redAccent,
                                        shape: BoxShape.circle,
                                      ),
                                      constraints: const BoxConstraints(
                                        minWidth: 16,
                                        minHeight: 16,
                                      ),
                                      child: Text(
                                        '${CartState.totalQuantity}',
                                        style: GoogleFonts.sora(
                                          color: Colors.white,
                                          fontSize: 9,
                                          fontWeight: FontWeight.bold,
                                        ),
                                        textAlign: TextAlign.center,
                                      ),
                                    ),
                                  );
                                }
                                return const SizedBox.shrink();
                              },
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
        child: Icon(icon, color: Colors.black, size: 20),
      ),
    );
  }

  Widget _buildProductCard({required ProductData product}) {
    return GestureDetector(
      onTap: () {
        final itemMap = {
          'name': product.name,
          'category': product.category,
          'price': product.price,
          'imagePath': product.imagePath,
          'bgColor': product.cardBgColor,
          'description': product.description,
          'caffeine': product.caffeine,
          'sweetness': product.sweetness,
          'steepTime': product.steepTime,
          'gallery': product.gallery,
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
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(24),
              ),
              child: AspectRatio(
                aspectRatio: 1.0, // 1:1 image aspect ratio
                child: Container(
                  child: product.imagePath.startsWith('http')
                      ? Image.network(
                          product.imagePath,
                          fit: BoxFit.cover,
                          cacheWidth: 800,
                        )
                      : Image.asset(product.imagePath, fit: BoxFit.cover),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: 8.0,
                vertical: 6.0,
              ),
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
                        onTap: () => _showProductCustomizationBottomSheet(
                          context,
                          product,
                        ),
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
              color: isSelected
                  ? const Color(0xFF8B6B58)
                  : Colors.grey.shade400,
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

class _AnimatedCartItemCardState extends State<AnimatedCartItemCard>
    with SingleTickerProviderStateMixin {
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
    _scaleAnimation = Tween<double>(
      begin: 1.0,
      end: 0.0,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeInBack));
    _slideAnimation = Tween<Offset>(
      begin: Offset.zero,
      end: const Offset(
        1.5,
        -0.6,
      ), // Slides out top-right (looks like thrown out)
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeInBack));
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
          child: Transform.scale(scale: _scaleAnimation.value, child: child),
        );
      },
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFF1EDE9), width: 1),
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
              child: _buildCartItemImage(widget.item.imagePath),
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
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFF2D1E18),
                borderRadius: BorderRadius.circular(24),
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
                    behavior: HitTestBehavior.opaque,
                    child: const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 6.0),
                      child: Icon(Icons.remove, color: Colors.white, size: 14),
                    ),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    widget.item.quantity.toString().padLeft(2, '0'),
                    style: GoogleFonts.sora(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(width: 4),
                  GestureDetector(
                    onTap: widget.onIncrement,
                    behavior: HitTestBehavior.opaque,
                    child: const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 6.0),
                      child: Icon(Icons.add, color: Colors.white, size: 14),
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

  Widget _buildCartItemImage(String imagePath) {
    if (imagePath.startsWith('http')) {
      return Image.network(
        imagePath,
        fit: BoxFit.contain,
        errorBuilder: (context, error, stackTrace) =>
            Image.asset('assets/images/tea_icon.png', fit: BoxFit.contain),
      );
    } else if (imagePath.startsWith('data:image')) {
      try {
        final base64String = imagePath.split(',').last;
        return Image.memory(
          base64Decode(base64String),
          fit: BoxFit.contain,
          errorBuilder: (context, error, stackTrace) =>
              Image.asset('assets/images/tea_icon.png', fit: BoxFit.contain),
        );
      } catch (e) {
        return Image.asset('assets/images/tea_icon.png', fit: BoxFit.contain);
      }
    } else if (imagePath.isNotEmpty && !imagePath.contains('placeholder.png')) {
      return Image.asset(
        imagePath,
        fit: BoxFit.contain,
        errorBuilder: (context, error, stackTrace) =>
            Image.asset('assets/images/tea_icon.png', fit: BoxFit.contain),
      );
    } else {
      return Image.asset('assets/images/tea_icon.png', fit: BoxFit.contain);
    }
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
  final String description;
  final String caffeine;
  final String sweetness;
  final String steepTime;
  final List<String> gallery;

  ProductData({
    required this.name,
    required this.category,
    required this.price,
    required this.imagePath,
    required this.cardBgColor,
    required this.description,
    required this.caffeine,
    required this.sweetness,
    required this.steepTime,
    this.gallery = const [],
  });
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
