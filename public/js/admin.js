'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   AI4Biz Admin Dashboard JavaScript
   Handles: Auth, Stats, Student table, Filters, Status updates, Downloads
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── Auth helpers ─────────────────────────────────────────────────────────────
function getToken() { return sessionStorage.getItem('ai4biz_admin_token') || ''; }

function authFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
      ...(options.headers || {}),
    },
  });
}

// ─── State ───────────────────────────────────────────────────────────────────
const state = {
  currentPage: 1,
  limit: 20,
  filters: { search: '', demoStatus: '', enrollmentStatus: '', paymentStatus: '' },
  editingStudentId: null,
  deletingStudentId: null,
  allStudentsCache: [],
};

// ─── Utility ──────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '–';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => { toast.classList.remove('show'); }, 3200);
}

function el(id) { return document.getElementById(id); }

// ─── Badge HTML ───────────────────────────────────────────────────────────────
function badgeHTML(value) {
  const map = {
    'Registered':       ['badge-registered', 'fa-clock'],
    'Attended':         ['badge-attended',   'fa-circle-check'],
    'Not Attended':     ['badge-not-attended','fa-circle-xmark'],
    'Enrolled':         ['badge-enrolled',   'fa-user-check'],
    'Not Enrolled':     ['badge-not-enrolled','fa-user-xmark'],
    'Full Paid':        ['badge-full-paid',  'fa-circle-dollar-to-slot'],
    'Registration Paid':['badge-reg-paid',   'fa-receipt'],
    'Not Paid':         ['badge-not-paid',   'fa-ban'],
  };
  const [cls, icon] = map[value] || ['badge-not-enrolled', 'fa-circle'];
  return `<span class="badge ${cls}"><i class="fa-solid ${icon}"></i> ${value}</span>`;
}

// ─── View Switching ───────────────────────────────────────────────────────────
function switchView(viewName) {
  document.querySelectorAll('.admin-view').forEach((v) => v.style.display = 'none');
  const target = el(`view-${viewName}`);
  if (target) target.style.display = 'block';

  document.querySelectorAll('.sidebar-link').forEach((l) => l.classList.remove('active'));
  const activeLink = document.querySelector(`.sidebar-link[data-view="${viewName}"]`);
  if (activeLink) activeLink.classList.add('active');
}

// ─── Load Dashboard Stats ─────────────────────────────────────────────────────
async function loadStats() {
  try {
    const res = await authFetch('/api/admin/stats');
    const data = await res.json();

    if (!data.success) return;

    const { total, demoStatus, enrollmentStatus, paymentStatus } = data.data;

    el('stat-total').textContent = total;
    el('stat-attended').textContent = demoStatus['Attended'] || 0;
    el('stat-enrolled').textContent = enrollmentStatus['Enrolled'] || 0;
    el('stat-fullpaid').textContent = paymentStatus['Full Paid'] || 0;

    el('lastUpdated').textContent = `Last updated: ${new Date().toLocaleTimeString('en-IN')}`;

    // ── Demo Status Bars ────────────────────────────────────────────────────
    const demoColors = {
      'Registered': '#6c63ff', 'Attended': '#06d6a0', 'Not Attended': '#ef4444',
    };
    renderBreakdownBars('demo-breakdown', demoStatus, total, demoColors);

    // ── Payment Status Bars ────────────────────────────────────────────────
    const payColors = {
      'Full Paid': '#ffd166', 'Registration Paid': '#fb923c', 'Not Paid': '#ef4444',
    };
    renderBreakdownBars('payment-breakdown', paymentStatus, total, payColors);

  } catch (err) {
    console.error('Stats load error:', err);
  }
}

function renderBreakdownBars(containerId, statusMap, total, colorMap) {
  const container = el(containerId);
  if (!container) return;

  const html = Object.entries(statusMap).map(([label, count]) => {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    const color = colorMap[label] || '#6c63ff';
    return `
      <div class="breakdown-bar-item">
        <div class="breakdown-bar-label">
          <span>${label}</span>
          <span>${count} (${pct}%)</span>
        </div>
        <div class="breakdown-bar-track">
          <div class="breakdown-bar-fill" style="width:${pct}%; background:${color};"></div>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = html || '<p style="color:var(--text-muted);font-size:0.82rem;">No data yet</p>';
}

// ─── Load Students Table ──────────────────────────────────────────────────────
async function loadStudents() {
  const tbody = el('studentsTableBody');
  tbody.innerHTML = `<tr><td colspan="11" class="table-loading"><i class="fa-solid fa-spinner fa-spin"></i> Loading…</td></tr>`;

  try {
    const params = new URLSearchParams({
      page: state.currentPage,
      limit: state.limit,
    });
    if (state.filters.search)          params.set('search', state.filters.search);
    if (state.filters.demoStatus)      params.set('demoStatus', state.filters.demoStatus);
    if (state.filters.enrollmentStatus) params.set('enrollmentStatus', state.filters.enrollmentStatus);
    if (state.filters.paymentStatus)   params.set('paymentStatus', state.filters.paymentStatus);

    const res = await authFetch(`/api/admin/students?${params}`);
    const data = await res.json();

    if (!data.success) throw new Error(data.message);

    state.allStudentsCache = data.data;

    el('studentsCount').textContent = `${data.pagination.total} student${data.pagination.total !== 1 ? 's' : ''} found`;

    if (data.data.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="11" class="table-empty">
          <i class="fa-solid fa-users-slash"></i>
          No students found for the current filters.
        </td></tr>`;
      el('pagination').innerHTML = '';
      return;
    }

    tbody.innerHTML = data.data.map((s) => `
      <tr>
        <td class="td-id">${s.studentId || `AI4B-${s._id.slice(-6).toUpperCase()}`}</td>
        <td class="td-name">${escapeHtml(s.fullName)}</td>
        <td>${escapeHtml(s.email)}</td>
        <td>${escapeHtml(s.phone)}</td>
        <td>${s.board}</td>
        <td>${s.classCompleted}</td>
        <td>${badgeHTML(s.demoStatus)}</td>
        <td>${badgeHTML(s.enrollmentStatus)}</td>
        <td>${badgeHTML(s.paymentStatus)}</td>
        <td>${formatDate(s.registrationDate)}</td>
        <td>
          <div class="table-actions">
            <button class="action-btn" title="Edit status" onclick="openEditModal('${s._id}')">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="action-btn delete" title="Delete student" onclick="openDeleteModal('${s._id}', '${escapeHtml(s.fullName)}')">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    renderPagination(data.pagination);

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="11" class="table-empty" style="color:var(--accent);">
      <i class="fa-solid fa-triangle-exclamation"></i> Failed to load students: ${err.message}
    </td></tr>`;
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function renderPagination({ page, pages }) {
  const container = el('pagination');
  if (pages <= 1) { container.innerHTML = ''; return; }

  let html = `
    <button class="page-btn" onclick="goToPage(${page - 1})" ${page <= 1 ? 'disabled' : ''}>
      <i class="fa-solid fa-chevron-left"></i>
    </button>`;

  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= page - 1 && i <= page + 1)) {
      html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    } else if (i === page - 2 || i === page + 2) {
      html += `<span style="color:var(--text-muted);padding:0 4px;">…</span>`;
    }
  }

  html += `
    <button class="page-btn" onclick="goToPage(${page + 1})" ${page >= pages ? 'disabled' : ''}>
      <i class="fa-solid fa-chevron-right"></i>
    </button>`;

  container.innerHTML = html;
}

function goToPage(page) {
  state.currentPage = page;
  loadStudents();
}

// ─── Filters ──────────────────────────────────────────────────────────────────
let searchTimer;
el('searchInput').addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.filters.search = e.target.value.trim();
    state.currentPage = 1;
    loadStudents();
  }, 400);
});

el('filterDemo').addEventListener('change', (e) => {
  state.filters.demoStatus = e.target.value;
  state.currentPage = 1;
  loadStudents();
});

el('filterEnrollment').addEventListener('change', (e) => {
  state.filters.enrollmentStatus = e.target.value;
  state.currentPage = 1;
  loadStudents();
});

el('filterPayment').addEventListener('change', (e) => {
  state.filters.paymentStatus = e.target.value;
  state.currentPage = 1;
  loadStudents();
});

function clearFiltersAndLoad() {
  state.filters = { search: '', demoStatus: '', enrollmentStatus: '', paymentStatus: '' };
  state.currentPage = 1;
  el('searchInput').value = '';
  el('filterDemo').value = '';
  el('filterEnrollment').value = '';
  el('filterPayment').value = '';
  el('studentsViewLabel').textContent = 'All Registrations';
  loadStudents();
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function openEditModal(studentId) {
  const student = state.allStudentsCache.find((s) => s._id === studentId);
  if (!student) return;

  state.editingStudentId = studentId;

  el('modalStudentName').textContent = student.fullName;
  el('modalDemoStatus').value = student.demoStatus;
  el('modalEnrollmentStatus').value = student.enrollmentStatus;
  el('modalPaymentStatus').value = student.paymentStatus;

  el('modalOverlay').style.display = 'flex';
}

function closeEditModal() {
  el('modalOverlay').style.display = 'none';
  state.editingStudentId = null;
}

el('modalClose').addEventListener('click', closeEditModal);
el('modalCancelBtn').addEventListener('click', closeEditModal);
el('modalOverlay').addEventListener('click', (e) => {
  if (e.target === el('modalOverlay')) closeEditModal();
});

el('modalSaveBtn').addEventListener('click', async () => {
  if (!state.editingStudentId) return;

  const body = {
    demoStatus: el('modalDemoStatus').value,
    enrollmentStatus: el('modalEnrollmentStatus').value,
    paymentStatus: el('modalPaymentStatus').value,
  };

  el('modalSaveBtn').disabled = true;
  el('modalSaveBtn').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…';

  try {
    const res = await authFetch(`/api/admin/students/${state.editingStudentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (data.success) {
      closeEditModal();
      showToast('Student status updated successfully', 'success');
      loadStudents();
      loadStats();
    } else {
      showToast(data.message || 'Update failed', 'error');
    }
  } catch {
    showToast('Network error. Please try again.', 'error');
  } finally {
    el('modalSaveBtn').disabled = false;
    el('modalSaveBtn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';
  }
});

// ─── Delete Modal ─────────────────────────────────────────────────────────────
function openDeleteModal(studentId, studentName) {
  state.deletingStudentId = studentId;
  el('deleteStudentName').textContent = studentName;
  el('deleteModalOverlay').style.display = 'flex';
}

function closeDeleteModal() {
  el('deleteModalOverlay').style.display = 'none';
  state.deletingStudentId = null;
}

el('deleteModalClose').addEventListener('click', closeDeleteModal);
el('deleteCancelBtn').addEventListener('click', closeDeleteModal);
el('deleteModalOverlay').addEventListener('click', (e) => {
  if (e.target === el('deleteModalOverlay')) closeDeleteModal();
});

el('deleteConfirmBtn').addEventListener('click', async () => {
  if (!state.deletingStudentId) return;

  el('deleteConfirmBtn').disabled = true;
  el('deleteConfirmBtn').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting…';

  try {
    const res = await authFetch(`/api/admin/students/${state.deletingStudentId}`, {
      method: 'DELETE',
    });
    const data = await res.json();

    if (data.success) {
      closeDeleteModal();
      showToast('Student record deleted', 'info');
      loadStudents();
      loadStats();
    } else {
      showToast(data.message || 'Delete failed', 'error');
    }
  } catch {
    showToast('Network error. Please try again.', 'error');
  } finally {
    el('deleteConfirmBtn').disabled = false;
    el('deleteConfirmBtn').innerHTML = '<i class="fa-solid fa-trash"></i> Delete';
  }
});

// ─── Sidebar Navigation ───────────────────────────────────────────────────────
document.querySelectorAll('.sidebar-link').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const view = link.dataset.view;
    const demoFilter = link.dataset.filterDemo || '';
    const enrollFilter = link.dataset.filterEnrollment || '';
    const payFilter = link.dataset.filterPayment || '';

    switchView(view);

    if (view === 'students') {
      clearFiltersAndLoad();

      // Apply pre-set filters from sidebar
      if (demoFilter) {
        state.filters.demoStatus = demoFilter;
        el('filterDemo').value = demoFilter;
        el('studentsViewLabel').textContent = demoFilter;
      }
      if (enrollFilter) {
        state.filters.enrollmentStatus = enrollFilter;
        el('filterEnrollment').value = enrollFilter;
        el('studentsViewLabel').textContent = enrollFilter;
      }
      if (payFilter) {
        state.filters.paymentStatus = payFilter;
        el('filterPayment').value = payFilter;
        el('studentsViewLabel').textContent = payFilter;
      }

      loadStudents();
    }

    document.querySelectorAll('.sidebar-link').forEach((l) => l.classList.remove('active'));
    link.classList.add('active');
  });
});

// ─── Refresh Button ───────────────────────────────────────────────────────────
el('refreshBtn').addEventListener('click', () => {
  loadStats();
  if (el('view-students').style.display !== 'none') {
    loadStudents();
  }
  showToast('Data refreshed', 'info');
});

// ─── Download XLS (server-generated) ─────────────────────────────────────────
el('downloadXlsxBtn').addEventListener('click', async () => {
  try {
    el('downloadXlsxBtn').disabled = true;
    // Use token in Authorization header via a hidden fetch + blob trick
    const res = await authFetch('/api/admin/download/xlsx');
    if (!res.ok) { showToast('Download failed. No data or server error.', 'error'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI4Biz_Students_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Excel file downloaded successfully', 'success');
  } catch {
    showToast('Download failed. Please try again.', 'error');
  } finally {
    el('downloadXlsxBtn').disabled = false;
  }
});

// ─── Download PDF (server-generated) ─────────────────────────────────────────
el('downloadPdfBtn').addEventListener('click', async () => {
  try {
    el('downloadPdfBtn').disabled = true;
    const res = await authFetch('/api/admin/download/pdf');
    if (!res.ok) { showToast('PDF generation failed.', 'error'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI4Biz_Students_${new Date().toISOString().slice(0, 10)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('PDF downloaded successfully', 'success');
  } catch {
    showToast('PDF download failed. Please try again.', 'error');
  } finally {
    el('downloadPdfBtn').disabled = false;
  }
});

// ─── Logout ───────────────────────────────────────────────────────────────────
el('logoutBtn').addEventListener('click', () => {
  sessionStorage.removeItem('ai4biz_admin_token');
  window.location.href = '/admin-login.html';
});

// ─── Initialize Dashboard ─────────────────────────────────────────────────────
(async function init() {
  switchView('dashboard');
  await loadStats();
})();
