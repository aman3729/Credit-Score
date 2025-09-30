import express from 'express';
const router = express.Router();

// POST /api/v1/support
router.post('/', async (req, res) => {
  const { subject, message } = req.body;
  // TODO: Save to DB, send email, etc.
  res.status(201).json({ success: true, message: 'Support request submitted.' });
});

export default router; 