import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/category.dart';
import '../services/category_repository.dart';
import '../services/api_client.dart';
import '../utils/env.dart';
import 'package:dio/dio.dart';

/// Categories Provider
/// Task: T057 - Create category management screen
/// Reference: specs/001-ai-communication-hub/tasks.md
///
/// Provides access to category data and operations

// Category Repository Provider
final categoryRepositoryProvider = Provider<CategoryRepository>((ref) {
  final dio = Dio(BaseOptions(
    baseUrl: '${Env.backendUrl}/api/v1',
    connectTimeout: const Duration(seconds: 30),
    receiveTimeout: const Duration(seconds: 30),
  ));

  final apiClient = ApiClient(dio);
  return CategoryRepository(apiClient);
});

// Categories List Provider
final categoriesProvider =
    StateNotifierProvider<CategoriesNotifier, AsyncValue<List<Category>>>((ref) {
  return CategoriesNotifier(ref.watch(categoryRepositoryProvider));
});

class CategoriesNotifier extends StateNotifier<AsyncValue<List<Category>>> {
  final CategoryRepository _repository;

  CategoriesNotifier(this._repository) : super(const AsyncValue.loading()) {
    loadCategories();
  }

  /// Load all categories
  Future<void> loadCategories() async {
    state = const AsyncValue.loading();
    try {
      final categories = await _repository.getCategories();
      state = AsyncValue.data(categories);
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
    }
  }

  /// Create a new category
  Future<Category> createCategory({
    required String name,
    required String color,
    String? icon,
    String? description,
  }) async {
    try {
      final category = await _repository.createCategory(
        name: name,
        color: color,
        icon: icon,
        description: description,
      );

      // Refresh the list
      await loadCategories();

      return category;
    } catch (e) {
      rethrow;
    }
  }

  /// Update an existing category
  Future<Category> updateCategory({
    required String id,
    String? name,
    String? color,
    String? icon,
    String? description,
  }) async {
    try {
      final category = await _repository.updateCategory(
        id: id,
        name: name,
        color: color,
        icon: icon,
        description: description,
      );

      // Refresh the list
      await loadCategories();

      return category;
    } catch (e) {
      rethrow;
    }
  }

  /// Delete a category
  Future<void> deleteCategory(String id) async {
    try {
      await _repository.deleteCategory(id);

      // Refresh the list
      await loadCategories();
    } catch (e) {
      rethrow;
    }
  }
}

// Predefined Categories Provider (filtered)
final predefinedCategoriesProvider = Provider<List<Category>>((ref) {
  final categoriesAsync = ref.watch(categoriesProvider);
  return categoriesAsync.maybeWhen(
    data: (categories) =>
        categories.where((cat) => cat.isPredefined).toList(),
    orElse: () => [],
  );
});

// Custom Categories Provider (filtered)
final customCategoriesProvider = Provider<List<Category>>((ref) {
  final categoriesAsync = ref.watch(categoriesProvider);
  return categoriesAsync.maybeWhen(
    data: (categories) =>
        categories.where((cat) => !cat.isPredefined).toList(),
    orElse: () => [],
  );
});

// Category Stats Provider
final categoryStatsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final repository = ref.watch(categoryRepositoryProvider);
  return await repository.getCategoryStats();
});
