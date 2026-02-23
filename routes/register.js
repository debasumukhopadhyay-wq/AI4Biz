'use strict';

const express = require('express');
const router = express.Router();
const ds = require('../lib/dataStore');
const { registrationRules, handleValidationErrors } = require('../middleware/validate');

// ─── POST /api/register ────────────────────────────────────────────────────────
router.post(
  '/register',
  registrationRules,
  handleValidationErrors,
  (req, res) => {
    try {
      const { fullName, email, phone, board, classCompleted } = req.body;

      const existing = ds.findByEmailOrPhone(email, phone);
      if (existing) {
        const field = existing.email === email.toLowerCase().trim() ? 'email' : 'phone';
        return res.status(409).json({
          success: false,
          message: `A student with this ${field} is already registered.`,
          field,
        });
      }

      const record = ds.create({ fullName, email, phone, board, classCompleted });

      return res.status(201).json({
        success: true,
        message:
          'You have been successfully registered for the FREE Demo Class! ' +
          'We will communicate the Demo class date and next steps to your registered email and mobile number.',
        studentId: ds.makeStudentId(record),
        data: {
          fullName: record.fullName,
          email: record.email,
          board: record.board,
          classCompleted: record.classCompleted,
          demoStatus: record.demoStatus,
          registrationDate: record.registrationDate,
        },
      });
    } catch (err) {
      console.error('[REGISTER ERROR]', err.message);
      return res.status(500).json({
        success: false,
        message: 'Registration failed due to a server error. Please try again.',
      });
    }
  }
);

// ─── GET /api/register/check — live duplicate check ───────────────────────────
router.get('/register/check', (req, res) => {
  try {
    const { email, phone } = req.query;
    if (!email && !phone) {
      return res.status(400).json({ success: false, message: 'Provide email or phone to check.' });
    }
    const match = ds.findByEmailOrPhone(email || '', phone || '');
    return res.json({ success: true, exists: !!match });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Check failed.' });
  }
});

module.exports = router;
