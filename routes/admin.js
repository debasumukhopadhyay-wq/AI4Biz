'use strict';

const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const ds = require('../lib/dataStore');
const adminAuth = require('../middleware/auth');
const jwt = require('jsonwebtoken');

const JWT_SECRET  = process.env.JWT_SECRET  || 'ai4biz-admin-secret-change-in-production';
const JWT_EXPIRY  = process.env.JWT_EXPIRY  || '24h';
const ADMIN_USER  = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASS  = process.env.ADMIN_PASSWORD || 'ai4biz2026';

// ─── POST /api/admin/login — public ──────────────────────────────────────────
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = jwt.sign({ username, role: 'admin' }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    return res.json({ success: true, token, message: 'Login successful' });
  }
  return res.status(401).json({ success: false, message: 'Invalid username or password.' });
});

// ═══ All routes below require a valid admin JWT ═══════════════════════════════
router.use(adminAuth);

// ─── GET /api/admin/students ──────────────────────────────────────────────────
router.get('/students', (req, res) => {
  try {
    const { demoStatus, enrollmentStatus, paymentStatus, search, page = 1, limit = 20 } = req.query;
    const all = ds.findAll({ search, demoStatus, enrollmentStatus, paymentStatus });
    const total = all.length;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const paginated = all.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    return res.json({
      success: true,
      data: paginated.map((r) => ({ ...r, studentId: ds.makeStudentId(r) })),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('[ADMIN GET ERROR]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch students.' });
  }
});

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  try {
    return res.json({ success: true, data: ds.getStats() });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch stats.' });
  }
});

// ─── PATCH /api/admin/students/:id ───────────────────────────────────────────
router.patch('/students/:id', (req, res) => {
  try {
    const updated = ds.updateById(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, message: 'Student not found.' });
    return res.json({ success: true, message: 'Status updated.', data: { ...updated, studentId: ds.makeStudentId(updated) } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Update failed.' });
  }
});

// ─── DELETE /api/admin/students/:id ──────────────────────────────────────────
router.delete('/students/:id', (req, res) => {
  try {
    const deleted = ds.deleteById(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Student not found.' });
    return res.json({ success: true, message: 'Student record deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Delete failed.' });
  }
});

// ─── GET /api/admin/download/xlsx ─────────────────────────────────────────────
router.get('/download/xlsx', (req, res) => {
  try {
    const buffer = ds.generateDownloadXlsx();
    const filename = `AI4Biz_Students_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error('[XLS DOWNLOAD]', err.message);
    res.status(500).json({ success: false, message: 'Failed to generate Excel file.' });
  }
});

// ─── GET /api/admin/download/pdf ──────────────────────────────────────────────
router.get('/download/pdf', (req, res) => {
  try {
    const records = ds.findAll();
    const filename = `AI4Biz_Students_${new Date().toISOString().slice(0, 10)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    doc.pipe(res);

    // ── Title ──────────────────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(16)
       .text('AI4Biz – Student Registrations Report', { align: 'center' });
    doc.font('Helvetica').fontSize(9).fillColor('#64748b')
       .text(`Generated: ${new Date().toLocaleString('en-IN')}  |  Total: ${records.length} student(s)`, { align: 'center' });
    doc.moveDown(0.8);

    // ── Table setup ────────────────────────────────────────────────────────
    const pageW = doc.page.width - 60; // 842 - 60 margin
    const cols = [
      { label: '#',          key: null,              w: 22  },
      { label: 'Student ID', key: 'id',              w: 72  },
      { label: 'Name',       key: 'fullName',        w: 100 },
      { label: 'Email',      key: 'email',           w: 130 },
      { label: 'Phone',      key: 'phone',           w: 72  },
      { label: 'Board',      key: 'board',           w: 58  },
      { label: 'Class',      key: 'classCompleted',  w: 80  },
      { label: 'Demo',       key: 'demoStatus',      w: 65  },
      { label: 'Enrolled',   key: 'enrollmentStatus',w: 65  },
      { label: 'Payment',    key: 'paymentStatus',   w: 78  },
    ];

    const ROW_H = 18, HEADER_H = 22, FONT_SIZE = 7.5;
    let x = 30, y = doc.y;

    const drawRow = (cells, isHeader) => {
      const fillColor = isHeader ? '#1e293b' : null;
      const textColor = isHeader ? '#ffffff' : '#334155';
      const font = isHeader ? 'Helvetica-Bold' : 'Helvetica';
      const h = isHeader ? HEADER_H : ROW_H;

      if (fillColor) {
        doc.rect(x, y, pageW, h).fill(fillColor);
      }

      let cx = x;
      cells.forEach((cell, i) => {
        const w = cols[i].w;
        doc.font(font).fontSize(FONT_SIZE).fillColor(textColor)
           .text(String(cell), cx + 3, y + (h - FONT_SIZE) / 2, { width: w - 6, height: h, ellipsis: true, lineBreak: false });
        cx += w;
      });

      // Row border
      doc.rect(x, y, pageW, h).stroke('#e2e8f0');
      y += h;
    };

    // Header row
    drawRow(cols.map((c) => c.label), true);

    // Data rows
    records.forEach((r, i) => {
      if (y + ROW_H > doc.page.height - 30) {
        doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 });
        y = 30;
        drawRow(cols.map((c) => c.label), true);
      }

      // Alternate row shading
      if (i % 2 === 0) {
        doc.rect(x, y, pageW, ROW_H).fill('#f8fafc');
      }

      const cells = [
        i + 1,
        ds.makeStudentId(r),
        r.fullName,
        r.email,
        r.phone,
        r.board,
        r.classCompleted,
        r.demoStatus,
        r.enrollmentStatus,
        r.paymentStatus,
      ];
      drawRow(cells, false);
    });

    // Footer
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(8).fillColor('#94a3b8')
       .text('AI4Biz – Basunagar, Madhyamgram | Confidential Admin Report', { align: 'center' });

    doc.end();
  } catch (err) {
    console.error('[PDF DOWNLOAD]', err.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to generate PDF.' });
    }
  }
});

module.exports = router;
