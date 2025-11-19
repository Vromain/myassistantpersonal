import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { Category } from '../../models/category';
import { body, param, validationResult } from 'express-validator';
import mongoose from 'mongoose';

/**
 * Categories API Routes
 * Task: T051 - Implement category CRUD endpoints
 * Reference: specs/001-ai-communication-hub/tasks.md
 *
 * Endpoints:
 * - GET /api/v1/categories - List all categories (predefined + user custom)
 * - POST /api/v1/categories - Create custom category
 * - PATCH /api/v1/categories/:id - Update custom category
 * - DELETE /api/v1/categories/:id - Delete custom category
 */

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/categories
 * List all categories available to the user
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // Get both predefined and user's custom categories
    const categories = await Category.find({
      $or: [
        { isPredefined: true },
        { userId: new mongoose.Types.ObjectId(userId) }
      ]
    }).sort({ isPredefined: -1, name: 1 }); // Predefined first, then alphabetical

    res.json({
      categories,
      total: categories.length,
      predefined: categories.filter(c => c.isPredefined).length,
      custom: categories.filter(c => !c.isPredefined).length
    });
  } catch (error) {
    console.error('❌ Error listing categories:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to list categories'
    });
  }
});

/**
 * GET /api/v1/categories/:id
 * Get single category by ID
 */
router.get(
  '/:id',
  [param('id').isMongoId()],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.userId!;
      const { id } = req.params;

      const category = await Category.findOne({
        _id: id,
        $or: [
          { isPredefined: true },
          { userId: new mongoose.Types.ObjectId(userId) }
        ]
      });

      if (!category) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Category not found'
        });
        return;
      }

      res.json(category);
    } catch (error) {
      console.error('❌ Error getting category:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get category'
      });
    }
  }
);

/**
 * POST /api/v1/categories
 * Create a new custom category
 */
router.post(
  '/',
  [
    body('name').isString().trim().notEmpty().isLength({ max: 50 }),
    body('color').isString().matches(/^#[0-9A-F]{6}$/i),
    body('icon').optional().isString().trim(),
    body('description').optional().isString().trim().isLength({ max: 200 })
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.userId!;
      const { name, color, icon, description } = req.body;

      // Check if category with same name already exists for this user
      const existing = await Category.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        name: { $regex: new RegExp(`^${name}$`, 'i') }
      });

      if (existing) {
        res.status(409).json({
          error: 'Conflict',
          message: 'A category with this name already exists'
        });
        return;
      }

      // Create new category
      const category = new Category({
        userId: new mongoose.Types.ObjectId(userId),
        name,
        color,
        icon,
        description,
        isPredefined: false
      });

      await category.save();

      console.log(`✅ Category created: ${name} for user ${userId}`);

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        category
      });
    } catch (error) {
      console.error('❌ Error creating category:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create category'
      });
    }
  }
);

/**
 * PATCH /api/v1/categories/:id
 * Update a custom category
 */
router.patch(
  '/:id',
  [
    param('id').isMongoId(),
    body('name').optional().isString().trim().notEmpty().isLength({ max: 50 }),
    body('color').optional().isString().matches(/^#[0-9A-F]{6}$/i),
    body('icon').optional().isString().trim(),
    body('description').optional().isString().trim().isLength({ max: 200 })
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.userId!;
      const { id } = req.params;
      const { name, color, icon, description } = req.body;

      // Find category
      const category = await Category.findOne({
        _id: id,
        userId: new mongoose.Types.ObjectId(userId),
        isPredefined: false
      });

      if (!category) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Category not found or cannot be modified (predefined categories cannot be edited)'
        });
        return;
      }

      // Check for name conflict if name is being changed
      if (name && name !== category.name) {
        const existing = await Category.findOne({
          userId: new mongoose.Types.ObjectId(userId),
          name: { $regex: new RegExp(`^${name}$`, 'i') },
          _id: { $ne: id }
        });

        if (existing) {
          res.status(409).json({
            error: 'Conflict',
            message: 'A category with this name already exists'
          });
          return;
        }
      }

      // Update fields
      if (name !== undefined) category.name = name;
      if (color !== undefined) category.color = color;
      if (icon !== undefined) (category as any).icon = icon;
      if (description !== undefined) (category as any).description = description;

      await category.save();

      console.log(`✅ Category updated: ${category.name} for user ${userId}`);

      res.json({
        success: true,
        message: 'Category updated successfully',
        category
      });
    } catch (error) {
      console.error('❌ Error updating category:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update category'
      });
    }
  }
);

/**
 * DELETE /api/v1/categories/:id
 * Delete a custom category
 */
router.delete(
  '/:id',
  [param('id').isMongoId()],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.userId!;
      const { id } = req.params;

      // Find and delete category
      const category = await Category.findOneAndDelete({
        _id: id,
        userId: new mongoose.Types.ObjectId(userId),
        isPredefined: false
      });

      if (!category) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Category not found or cannot be deleted (predefined categories cannot be removed)'
        });
        return;
      }

      // Note: Messages with this category will keep their categoryId
      // but we could optionally set them to null or a default category
      // For now, we'll leave them as-is

      console.log(`✅ Category deleted: ${category.name} for user ${userId}`);

      res.json({
        success: true,
        message: 'Category deleted successfully',
        categoryId: id
      });
    } catch (error) {
      console.error('❌ Error deleting category:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to delete category'
      });
    }
  }
);

/**
 * GET /api/v1/categories/stats
 * Get category usage statistics
 */
router.get('/stats/usage', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // Import Message model here to avoid circular dependency
    const { Message } = require('../../models/message');
    const { ConnectedAccount } = require('../../models/connected_account');

    // Get user's account IDs
    const accounts = await ConnectedAccount.find({ userId }).select('_id');
    const accountIds = accounts.map((acc: any) => acc._id);

    // Aggregate message counts by category
    const stats = await Message.aggregate([
      {
        $match: {
          accountId: { $in: accountIds },
          categoryId: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$categoryId',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: '$category' },
      {
        $project: {
          categoryId: '$_id',
          categoryName: '$category.name',
          categoryColor: '$category.color',
          count: 1
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      stats,
      total: stats.reduce((sum: number, s: any) => sum + s.count, 0)
    });
  } catch (error) {
    console.error('❌ Error getting category stats:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get category statistics'
    });
  }
});

export default router;
