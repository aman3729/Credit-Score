import express from 'express';
const router = express.Router();

// POST /api/v1/disputes
router.post('/', async (req, res) => {
  const { subject, message } = req.body;
  // TODO: Save to DB, send email, etc.
  res.status(201).json({ success: true, message: 'Dispute submitted.' });
});

export default router; 