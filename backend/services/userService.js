import { isNativeDriver, getWorkingConnection } from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

/**
 * User service that works with both Mongoose and native MongoDB driver
 */
class UserService {
  constructor() {
    this.collectionName = 'users';
  }

  /**
   * Get the users collection
   */
  async getCollection() {
    if (isNativeDriver()) {
      const db = await getWorkingConnection();
      return db.collection(this.collectionName);
    } else {
      // Use Mongoose model
      const { default: User } = await import('../models/User.js');
      return User;
    }
  }

  /**
   * Find user by ID
   */
  async findById(id) {
    try {
      if (isNativeDriver()) {
        const collection = await this.getCollection();
        const user = await collection.findOne({ _id: new ObjectId(id) });
        return user;
      } else {
        const User = await this.getCollection();
        return await User.findById(id);
      }
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email) {
    try {
      if (isNativeDriver()) {
        const collection = await this.getCollection();
        const user = await collection.findOne({ email: email.toLowerCase() });
        return user;
      } else {
        const User = await this.getCollection();
        return await User.findOne({ email: email.toLowerCase() });
      }
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  /**
   * Find user by username
   */
  async findByUsername(username) {
    try {
      if (isNativeDriver()) {
        const collection = await this.getCollection();
        const user = await collection.findOne({ username });
        return user;
      } else {
        const User = await this.getCollection();
        return await User.findOne({ username });
      }
    } catch (error) {
      console.error('Error finding user by username:', error);
      throw error;
    }
  }

  /**
   * Find user by email or username
   */
  async findByEmailOrUsername(identifier) {
    try {
      if (isNativeDriver()) {
        const collection = await this.getCollection();
        const user = await collection.findOne({
          $or: [
            { email: identifier.toLowerCase() },
            { username: identifier }
          ]
        });
        return user;
      } else {
        const User = await this.getCollection();
        return await User.findOne({
          $or: [
            { email: identifier.toLowerCase() },
            { username: identifier }
          ]
        });
      }
    } catch (error) {
      console.error('Error finding user by email or username:', error);
      throw error;
    }
  }

  /**
   * Find user by ID, email, or username
   */
  async findByIdentifier(identifier) {
    try {
      if (isNativeDriver()) {
        const collection = await this.getCollection();
        let user;
        
        // Check if it's a valid ObjectId
        if (ObjectId.isValid(identifier)) {
          user = await collection.findOne({ _id: new ObjectId(identifier) });
        }
        
        if (!user) {
          user = await collection.findOne({
            $or: [
              { email: identifier.toLowerCase() },
              { username: identifier }
            ]
          });
        }
        
        return user;
      } else {
        const User = await this.getCollection();
        let user;
        
        if (ObjectId.isValid(identifier)) {
          user = await User.findById(identifier);
        }
        
        if (!user) {
          user = await User.findOne({
            $or: [
              { email: identifier.toLowerCase() },
              { username: identifier }
            ]
          });
        }
        
        return user;
      }
    } catch (error) {
      console.error('Error finding user by identifier:', error);
      throw error;
    }
  }

  /**
   * Find admin user
   */
  async findAdmin() {
    try {
      if (isNativeDriver()) {
        const collection = await this.getCollection();
        const admin = await collection.findOne({ role: 'admin' });
        return admin;
      } else {
        const User = await this.getCollection();
        return await User.findOne({ role: 'admin' });
      }
    } catch (error) {
      console.error('Error finding admin user:', error);
      throw error;
    }
  }

  /**
   * Create new user
   */
  async create(userData) {
    try {
      if (isNativeDriver()) {
        const collection = await this.getCollection();
        const result = await collection.insertOne(userData);
        return { ...userData, _id: result.insertedId };
      } else {
        const User = await this.getCollection();
        return await User.create(userData);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Update user
   */
  async updateById(id, updateData) {
    try {
      if (isNativeDriver()) {
        const collection = await this.getCollection();
        const result = await collection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );
        return result;
      } else {
        const User = await this.getCollection();
        return await User.findByIdAndUpdate(id, updateData, { new: true });
      }
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Get all users (for admin)
   */
  async getAllUsers() {
    try {
      if (isNativeDriver()) {
        const collection = await this.getCollection();
        const users = await collection.find({}).toArray();
        return users;
      } else {
        const User = await this.getCollection();
        return await User.find({});
      }
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }

  /**
   * Get user stats (for admin)
   */
  async getUserStats() {
    try {
      if (isNativeDriver()) {
        const collection = await this.getCollection();
        const totalUsers = await collection.countDocuments({});
        const pendingUsers = await collection.countDocuments({ status: 'pending' });
        const activeUsers = await collection.countDocuments({ status: 'active' });
        
        return {
          total: totalUsers,
          pending: pendingUsers,
          active: activeUsers
        };
      } else {
        const User = await this.getCollection();
        const totalUsers = await User.countDocuments({});
        const pendingUsers = await User.countDocuments({ status: 'pending' });
        const activeUsers = await User.countDocuments({ status: 'active' });
        
        return {
          total: totalUsers,
          pending: pendingUsers,
          active: activeUsers
        };
      }
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }

  /**
   * Find user by password reset token
   */
  async findByPasswordResetToken(token) {
    try {
      if (isNativeDriver()) {
        const collection = await this.getCollection();
        const user = await collection.findOne({ 
          passwordResetToken: token,
          passwordResetExpires: { $gt: new Date() }
        });
        return user;
      } else {
        const User = await this.getCollection();
        return await User.findOne({ 
          passwordResetToken: token,
          passwordResetExpires: { $gt: new Date() }
        });
      }
    } catch (error) {
      console.error('Error finding user by password reset token:', error);
      throw error;
    }
  }

  /**
   * Find user by email verification token
   */
  async findByEmailVerificationToken(token) {
    try {
      if (isNativeDriver()) {
        const collection = await this.getCollection();
        const user = await collection.findOne({ 
          emailVerificationToken: token,
          emailVerificationTokenExpires: { $gt: new Date() }
        });
        return user;
      } else {
        const User = await this.getCollection();
        return await User.findOne({ 
          emailVerificationToken: token,
          emailVerificationTokenExpires: { $gt: new Date() }
        });
      }
    } catch (error) {
      console.error('Error finding user by email verification token:', error);
      throw error;
    }
  }
}

export default new UserService(); 