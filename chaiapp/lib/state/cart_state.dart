import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

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

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'category': category,
      'price': price,
      'imagePath': imagePath,
      'quantity': quantity,
      'sugar': sugar,
    };
  }

  factory CartItemData.fromJson(Map<String, dynamic> json) {
    return CartItemData(
      name: json['name'] ?? '',
      category: json['category'] ?? '',
      price: json['price'] ?? '',
      imagePath: json['imagePath'] ?? '',
      quantity: json['quantity'] ?? 1,
      sugar: json['sugar'] ?? 'Regular Sugar',
    );
  }
}

class CartState {
  static final ValueNotifier<List<CartItemData>> items = ValueNotifier([]);

  static Future<void> loadCart() async {
    final prefs = await SharedPreferences.getInstance();
    final String? cartStr = prefs.getString('cart_items');
    if (cartStr != null && cartStr.isNotEmpty) {
      try {
        final List<dynamic> jsonList = jsonDecode(cartStr);
        items.value = jsonList.map((e) => CartItemData.fromJson(e)).toList();
      } catch (e) {
        debugPrint('Error loading cart from preferences: $e');
        items.value = [];
      }
    } else {
      items.value = [];
    }
  }

  static Future<void> saveCart() async {
    final prefs = await SharedPreferences.getInstance();
    final String cartStr = jsonEncode(items.value.map((e) => e.toJson()).toList());
    await prefs.setString('cart_items', cartStr);
  }

  static void addItem(CartItemData newItem) {
    final currentList = List<CartItemData>.from(items.value);
    
    // Check if item already exists with same name and sugar
    final existingIndex = currentList.indexWhere(
        (item) => item.name == newItem.name && item.sugar == newItem.sugar);

    if (existingIndex != -1) {
      // Increment quantity
      final existingItem = currentList[existingIndex];
      currentList[existingIndex] = existingItem.copyWith(quantity: existingItem.quantity + newItem.quantity);
    } else {
      currentList.add(newItem);
    }
    
    items.value = currentList;
    saveCart();
  }

  static void updateItemQuantity(int index, int newQuantity) {
    if (index >= 0 && index < items.value.length) {
      final currentList = List<CartItemData>.from(items.value);
      currentList[index] = currentList[index].copyWith(quantity: newQuantity);
      items.value = currentList;
      saveCart();
    }
  }

  static void removeItem(int index) {
    if (index >= 0 && index < items.value.length) {
      final currentList = List<CartItemData>.from(items.value);
      currentList.removeAt(index);
      items.value = currentList;
      saveCart();
    }
  }

  static void clearCart() {
    items.value = [];
    saveCart();
  }

  static int get totalQuantity {
    return items.value.fold(0, (sum, item) => sum + item.quantity);
  }
}
