import '../models/category.dart';
import 'api_client.dart';

/// Category Repository
/// Task: T055 - Implement category management service
/// Reference: specs/001-ai-communication-hub/tasks.md
///
/// Provides access to category management functionality

class CategoryRepository {
  final ApiClient _apiClient;

  CategoryRepository(this._apiClient);

  /// Get all categories (predefined + custom)
  Future<List<Category>> getCategories() async {
    try {
      final response = await _apiClient.getCategories();
      final categoriesData = response['categories'] as List;
      return categoriesData
          .map((json) => Category.fromJson(json as Map<String, dynamic>))
          .toList();
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Get single category by ID
  Future<Category> getCategory(String id) async {
    try {
      final response = await _apiClient.getCategory(id);
      return Category.fromJson(response);
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Create a new custom category
  Future<Category> createCategory({
    required String name,
    required String color,
    String? icon,
    String? description,
  }) async {
    try {
      final response = await _apiClient.createCategory({
        'name': name,
        'color': color,
        if (icon != null) 'icon': icon,
        if (description != null) 'description': description,
      });
      return Category.fromJson(response['category'] as Map<String, dynamic>);
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Update an existing custom category
  Future<Category> updateCategory({
    required String id,
    String? name,
    String? color,
    String? icon,
    String? description,
  }) async {
    try {
      final body = <String, dynamic>{};
      if (name != null) body['name'] = name;
      if (color != null) body['color'] = color;
      if (icon != null) body['icon'] = icon;
      if (description != null) body['description'] = description;

      final response = await _apiClient.updateCategory(id, body);
      return Category.fromJson(response['category'] as Map<String, dynamic>);
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Delete a custom category
  Future<void> deleteCategory(String id) async {
    try {
      await _apiClient.deleteCategory(id);
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Get category usage statistics
  Future<Map<String, dynamic>> getCategoryStats() async {
    try {
      return await _apiClient.getCategoryStats();
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Handle API errors
  Exception _handleError(dynamic error) {
    if (error is Exception) {
      return error;
    }
    return Exception('An unexpected error occurred: $error');
  }
}
