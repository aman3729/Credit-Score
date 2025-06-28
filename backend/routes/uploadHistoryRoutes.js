import express from 'express';
import UploadHistory from '../models/UploadHistory.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/upload-history
// @desc    Get all upload history records with pagination
// @access  Private/Admin
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get total count
    const total = await UploadHistory.countDocuments();
    
    // Get paginated data
    const uploads = await UploadHistory.find()
      .populate('uploadedBy', 'name email')
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Calculate total pages
    const pages = Math.ceil(total / limit);
    
    res.json({
      data: uploads,
      pagination: {
        total,
        pages,
        page,
        limit
      }
    });
  } catch (error) {
    console.error('Error fetching upload history:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
});

// @route   GET /api/upload-history/user/:userId
// @desc    Get upload history for a specific user with pagination
// @access  Private
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { userId } = req.params;

    // Get total count for the user
    const total = await UploadHistory.countDocuments({ uploadedBy: userId });
    
    // Get paginated data for the user
    const uploads = await UploadHistory.find({ uploadedBy: userId })
      .populate('uploadedBy', 'name email')
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Calculate total pages
    const pages = Math.ceil(total / limit);
    
    res.json({
      data: uploads,
      pagination: {
        total,
        pages,
        page,
        limit
      }
    });
  } catch (error) {
    console.error('Error fetching user upload history:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
});

export default router;
