import 'package:flutter/material.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'category.freezed.dart';
part 'category.g.dart';

/// Category Model
/// Task: T028 - Create Dart models
/// Reference: specs/001-ai-communication-hub/data-model.md

@freezed
class Category with _$Category {
  const Category._();

  const factory Category({
    required String id,
    String? userId,
    required String name,
    required String color,
    String? icon,
    String? description,
    @Default(false) bool isPredefined,
    @Default(AutoAssignmentRules()) AutoAssignmentRules autoAssignmentRules,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) = _Category;

  factory Category.fromJson(Map<String, dynamic> json) =>
      _$CategoryFromJson(json);

  // Computed properties
  Color get colorValue {
    try {
      return Color(int.parse(color.substring(1), radix: 16) + 0xFF000000);
    } catch (e) {
      return Colors.grey;
    }
  }

  bool get isCustom => !isPredefined;
}

@freezed
class AutoAssignmentRules with _$AutoAssignmentRules {
  const factory AutoAssignmentRules({
    @Default([]) List<String> keywords,
    @Default([]) List<String> senderPatterns,
  }) = _AutoAssignmentRules;

  factory AutoAssignmentRules.fromJson(Map<String, dynamic> json) =>
      _$AutoAssignmentRulesFromJson(json);
}

// Predefined categories
class PredefinedCategories {
  static const work = Category(
    id: 'work',
    name: 'Work',
    color: '#4A90E2',
    isPredefined: true,
    createdAt: null,
    updatedAt: null,
  );

  static const personal = Category(
    id: 'personal',
    name: 'Personal',
    color: '#7ED321',
    isPredefined: true,
    createdAt: null,
    updatedAt: null,
  );

  static const shopping = Category(
    id: 'shopping',
    name: 'Shopping',
    color: '#F5A623',
    isPredefined: true,
    createdAt: null,
    updatedAt: null,
  );

  static const social = Category(
    id: 'social',
    name: 'Social',
    color: '#BD10E0',
    isPredefined: true,
    createdAt: null,
    updatedAt: null,
  );

  static const promotions = Category(
    id: 'promotions',
    name: 'Promotions',
    color: '#D0021B',
    isPredefined: true,
    createdAt: null,
    updatedAt: null,
  );

  static const updates = Category(
    id: 'updates',
    name: 'Updates',
    color: '#50E3C2',
    isPredefined: true,
    createdAt: null,
    updatedAt: null,
  );

  static List<Category> get all => [
        work,
        personal,
        shopping,
        social,
        promotions,
        updates,
      ];
}
