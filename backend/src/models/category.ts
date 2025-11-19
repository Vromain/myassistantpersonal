import mongoose, { Schema, Document } from 'mongoose';

/**
 * Category Model
 * Task: T013 - Create Category model for predefined and custom categories
 * Reference: specs/001-ai-communication-hub/data-model.md
 */

export interface IAutoAssignmentRules {
  keywords: string[];
  senderPatterns: string[];
}

export interface ICategory extends Document {
  userId?: mongoose.Types.ObjectId;  // null for predefined categories
  name: string;
  color: string;  // Hex color code
  icon?: string;  // Optional icon name or emoji
  description?: string;  // Optional description
  isPredefined: boolean;
  autoAssignmentRules: IAutoAssignmentRules;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  color: {
    type: String,
    required: true,
    validate: {
      validator: (color: string) => /^#[0-9A-Fa-f]{6}$/.test(color),
      message: 'Color must be a valid hex code (e.g., #FF5733)'
    }
  },
  icon: {
    type: String,
    trim: true,
    maxlength: 50
  },
  description: {
    type: String,
    trim: true,
    maxlength: 200
  },
  isPredefined: {
    type: Boolean,
    default: false
  },
  autoAssignmentRules: {
    keywords: {
      type: [String],
      default: []
    },
    senderPatterns: {
      type: [String],
      default: []
    }
  }
}, {
  timestamps: true,
  collection: 'categories'
});

// Indexes
CategorySchema.index({ userId: 1, name: 1 });
CategorySchema.index({ isPredefined: 1 });

// Ensure unique category names per user
CategorySchema.index(
  { userId: 1, name: 1 },
  {
    unique: true,
    partialFilterExpression: { userId: { $exists: true } }
  }
);

// Predefined categories should have unique names
CategorySchema.index(
  { name: 1 },
  {
    unique: true,
    partialFilterExpression: { isPredefined: true }
  }
);

// Instance methods
CategorySchema.methods.addKeyword = async function(keyword: string): Promise<ICategory> {
  if (!this.autoAssignmentRules.keywords.includes(keyword.toLowerCase())) {
    this.autoAssignmentRules.keywords.push(keyword.toLowerCase());
    return this.save();
  }
  return this;
};

CategorySchema.methods.addSenderPattern = async function(pattern: string): Promise<ICategory> {
  if (!this.autoAssignmentRules.senderPatterns.includes(pattern.toLowerCase())) {
    this.autoAssignmentRules.senderPatterns.push(pattern.toLowerCase());
    return this.save();
  }
  return this;
};

CategorySchema.methods.matchesMessage = function(message: {
  content: string;
  subject?: string;
  sender: string;
}): boolean {
  const text = `${message.subject || ''} ${message.content}`.toLowerCase();
  const sender = message.sender.toLowerCase();

  // Check keywords
  const hasKeyword = this.autoAssignmentRules.keywords.some(keyword =>
    text.includes(keyword)
  );

  // Check sender patterns
  const matchesSender = this.autoAssignmentRules.senderPatterns.some(pattern =>
    sender.includes(pattern)
  );

  return hasKeyword || matchesSender;
};

// Static method to seed predefined categories
CategorySchema.statics.seedPredefined = async function() {
  const predefinedCategories = [
    { name: 'Work', color: '#4A90E2', keywords: ['meeting', 'project', 'deadline', 'office'] },
    { name: 'Personal', color: '#7ED321', keywords: ['family', 'friend', 'personal'] },
    { name: 'Shopping', color: '#F5A623', keywords: ['order', 'receipt', 'purchase', 'shipping'] },
    { name: 'Social', color: '#BD10E0', keywords: ['event', 'party', 'invitation'] },
    { name: 'Promotions', color: '#D0021B', keywords: ['deal', 'offer', 'discount', 'sale'] },
    { name: 'Updates', color: '#50E3C2', keywords: ['newsletter', 'update', 'notification'] }
  ];

  for (const cat of predefinedCategories) {
    await this.findOneAndUpdate(
      { name: cat.name, isPredefined: true },
      {
        name: cat.name,
        color: cat.color,
        isPredefined: true,
        autoAssignmentRules: {
          keywords: cat.keywords,
          senderPatterns: []
        }
      },
      { upsert: true, new: true }
    );
  }

  console.log('✅ Predefined categories seeded');
};

export const Category = mongoose.model<ICategory>('Category', CategorySchema);
