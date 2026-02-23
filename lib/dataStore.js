'use strict';

/**
 * File-based data store using XLSX (SheetJS)
 * Stores all student registrations in:
 *   <workspace>/data/registrations.xlsx
 */

const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE_PATH = path.join(DATA_DIR, 'registrations.xlsx');
const SHEET_NAME = 'Registrations';

// Internal column order (camelCase keys stored as header row)
const COLUMN_ORDER = [
  'id', 'fullName', 'email', 'phone', 'board', 'classCompleted',
  'demoStatus', 'enrollmentStatus', 'paymentStatus', 'registrationDate',
];

// ─── Ensure data directory exists ────────────────────────────────────────────
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ─── Read all records from the XLS file ──────────────────────────────────────
function readAll() {
  ensureDataDir();
  if (!fs.existsSync(FILE_PATH)) return [];
  try {
    const wb = xlsx.readFile(FILE_PATH);
    const ws = wb.Sheets[SHEET_NAME];
    if (!ws) return [];
    return xlsx.utils.sheet_to_json(ws, { defval: '' });
  } catch {
    return [];
  }
}

// ─── Persist all records back to the XLS file ────────────────────────────────
function persistAll(records) {
  ensureDataDir();
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(records, { header: COLUMN_ORDER });
  ws['!cols'] = [
    { wch: 38 }, { wch: 28 }, { wch: 32 }, { wch: 14 }, { wch: 15 },
    { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 26 },
  ];
  xlsx.utils.book_append_sheet(wb, ws, SHEET_NAME);
  xlsx.writeFile(wb, FILE_PATH);
}

// ─── Create a new student record ──────────────────────────────────────────────
function create(data) {
  const records = readAll();
  const id = uuidv4();
  const record = {
    id,
    fullName: data.fullName.trim(),
    email: data.email.toLowerCase().trim(),
    phone: data.phone.trim(),
    board: data.board,
    classCompleted: data.classCompleted,
    demoStatus: 'Registered',
    enrollmentStatus: 'Not Enrolled',
    paymentStatus: 'Not Paid',
    registrationDate: new Date().toISOString(),
  };
  records.push(record);
  persistAll(records);
  return record;
}

// ─── Check for duplicate email or phone ──────────────────────────────────────
function findByEmailOrPhone(email, phone) {
  const records = readAll();
  const emailLower = email.toLowerCase().trim();
  return records.find(
    (r) => r.email === emailLower || r.phone === phone.trim()
  ) || null;
}

// ─── Filtered list (admin) ────────────────────────────────────────────────────
function findAll({ search = '', demoStatus = '', enrollmentStatus = '', paymentStatus = '' } = {}) {
  let records = readAll();

  if (search) {
    const q = search.toLowerCase();
    records = records.filter(
      (r) =>
        String(r.fullName).toLowerCase().includes(q) ||
        String(r.email).toLowerCase().includes(q) ||
        String(r.phone).includes(q)
    );
  }
  if (demoStatus)       records = records.filter((r) => r.demoStatus === demoStatus);
  if (enrollmentStatus) records = records.filter((r) => r.enrollmentStatus === enrollmentStatus);
  if (paymentStatus)    records = records.filter((r) => r.paymentStatus === paymentStatus);

  // Newest first
  return records.sort((a, b) => new Date(b.registrationDate) - new Date(a.registrationDate));
}

// ─── Update status fields ────────────────────────────────────────────────────
function updateById(id, updates) {
  const records = readAll();
  const idx = records.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const allowed = ['demoStatus', 'enrollmentStatus', 'paymentStatus'];
  allowed.forEach((key) => {
    if (updates[key] !== undefined) records[idx][key] = updates[key];
  });
  persistAll(records);
  return records[idx];
}

// ─── Delete a record ─────────────────────────────────────────────────────────
function deleteById(id) {
  const records = readAll();
  const idx = records.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  records.splice(idx, 1);
  persistAll(records);
  return true;
}

// ─── Aggregate stats ─────────────────────────────────────────────────────────
function getStats() {
  const records = readAll();
  const total = records.length;
  const demoStatus = {}, enrollmentStatus = {}, paymentStatus = {};
  records.forEach((r) => {
    demoStatus[r.demoStatus]             = (demoStatus[r.demoStatus] || 0) + 1;
    enrollmentStatus[r.enrollmentStatus] = (enrollmentStatus[r.enrollmentStatus] || 0) + 1;
    paymentStatus[r.paymentStatus]       = (paymentStatus[r.paymentStatus] || 0) + 1;
  });
  return { total, demoStatus, enrollmentStatus, paymentStatus };
}

// ─── Generate display Student ID ─────────────────────────────────────────────
function makeStudentId(record) {
  return `AI4B-${String(record.id).slice(-6).toUpperCase()}`;
}

// ─── Generate a formatted XLS buffer for admin download ──────────────────────
function generateDownloadXlsx() {
  const records = findAll();
  const wb = xlsx.utils.book_new();

  const displayHeaders = [
    'Student ID', 'Full Name', 'Email', 'Phone', 'Board', 'Class Completed',
    'Demo Status', 'Enrollment Status', 'Payment Status', 'Registration Date',
  ];

  const rows = records.map((r) => [
    makeStudentId(r),
    r.fullName,
    r.email,
    r.phone,
    r.board,
    r.classCompleted,
    r.demoStatus,
    r.enrollmentStatus,
    r.paymentStatus,
    new Date(r.registrationDate).toLocaleString('en-IN'),
  ]);

  const ws = xlsx.utils.aoa_to_sheet([displayHeaders, ...rows]);
  ws['!cols'] = [
    { wch: 14 }, { wch: 28 }, { wch: 32 }, { wch: 14 }, { wch: 15 },
    { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 26 },
  ];
  xlsx.utils.book_append_sheet(wb, ws, 'AI4Biz Registrations');
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = {
  create,
  findByEmailOrPhone,
  findAll,
  updateById,
  deleteById,
  getStats,
  makeStudentId,
  generateDownloadXlsx,
  FILE_PATH,
};
