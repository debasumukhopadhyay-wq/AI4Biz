'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   AI4Biz Main Frontend JavaScript
   Handles: Navbar, Scroll reveals, Registration form, Live validation
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── Navbar Scroll Effect ────────────────────────────────────────────────────
(function initNavbar() {
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.querySelector('.nav-links');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    const isOpen = navLinks.classList.contains('open');
    hamburger.setAttribute('aria-expanded', isOpen);
    hamburger.style.opacity = isOpen ? '0.7' : '1';
  });

  // Close menu when a link is clicked
  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
    });
  });
})();

// ─── Scroll Reveal ──────────────────────────────────────────────────────────
(function initScrollReveal() {
  const revealTargets = document.querySelectorAll(
    '.feature-card, .sdd-step, .outcome-item, .fee-card, .stat-item'
  );

  revealTargets.forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = `${(i % 6) * 60}ms`;
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  revealTargets.forEach((el) => observer.observe(el));
})();

// ─── Registration Form ───────────────────────────────────────────────────────
(function initRegistrationForm() {
  const form = document.getElementById('registerForm');
  const formSuccess = document.getElementById('formSuccess');
  const submitBtn = document.getElementById('submitBtn');
  const btnText = submitBtn.querySelector('.btn-text');
  const btnLoading = submitBtn.querySelector('.btn-loading');
  const globalError = document.getElementById('globalError');

  if (!form) return;

  // ── Validators ────────────────────────────────────────────────────────────
  const validators = {
    fullName: (v) => {
      if (!v.trim()) return 'Full name is required';
      if (v.trim().length < 2) return 'Full name must be at least 2 characters';
      if (v.trim().length > 100) return 'Full name too long';
      return null;
    },
    email: (v) => {
      if (!v.trim()) return 'Email is required';
      if (!/^\S+@\S+\.\S+$/.test(v.trim())) return 'Please enter a valid email address';
      return null;
    },
    phone: (v) => {
      if (!v.trim()) return 'Phone number is required';
      if (!/^[6-9]\d{9}$/.test(v.trim())) return 'Enter a valid 10-digit Indian mobile number';
      return null;
    },
    board: (v) => {
      if (!v) return 'Please select your board';
      if (!['ICSE', 'CBSE', 'West Bengal', 'Others'].includes(v)) return 'Please select a valid board';
      return null;
    },
    classCompleted: (v) => {
      if (!v) return 'Please select class completed';
      if (!['Secondary', 'Higher Secondary', 'Others'].includes(v)) return 'Please select a valid class';
      return null;
    },
  };

  // ── Show/Clear Field Error ─────────────────────────────────────────────────
  function setFieldError(fieldId, message) {
    const errorEl = document.getElementById(`${fieldId}-error`);
    const inputEl = document.getElementById(fieldId);
    if (errorEl) errorEl.textContent = message || '';
    if (inputEl) {
      inputEl.classList.toggle('invalid', !!message);
      inputEl.classList.toggle('valid', !message && inputEl.value.length > 0);
    }
  }

  // ── Live validation on blur ────────────────────────────────────────────────
  ['fullName', 'board', 'classCompleted'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('blur', () => {
      const err = validators[id](el.value);
      setFieldError(id, err);
    });
    el.addEventListener('input', () => {
      if (el.classList.contains('invalid')) {
        const err = validators[id](el.value);
        setFieldError(id, err);
      }
    });
  });

  // ── Email Debounced Live Check ─────────────────────────────────────────────
  let emailTimer;
  const emailInput = document.getElementById('email');
  const emailStatus = document.getElementById('email-status');

  emailInput.addEventListener('input', () => {
    clearTimeout(emailTimer);
    const val = emailInput.value.trim();
    const localErr = validators.email(val);

    if (localErr || !val) {
      emailStatus.textContent = '';
      emailStatus.className = 'input-status';
      return;
    }

    emailStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    emailStatus.className = 'input-status checking';

    emailTimer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/register/check?email=${encodeURIComponent(val)}`);
        const data = await res.json();
        if (data.exists) {
          emailStatus.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
          emailStatus.className = 'input-status invalid';
          setFieldError('email', 'This email is already registered');
        } else {
          emailStatus.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
          emailStatus.className = 'input-status valid';
          setFieldError('email', null);
        }
      } catch {
        emailStatus.textContent = '';
        emailStatus.className = 'input-status';
      }
    }, 600);
  });

  emailInput.addEventListener('blur', () => {
    const err = validators.email(emailInput.value);
    if (err) setFieldError('email', err);
  });

  // ── Phone Live Validation ──────────────────────────────────────────────────
  let phoneTimer;
  const phoneInput = document.getElementById('phone');
  const phoneStatus = document.getElementById('phone-status');

  phoneInput.addEventListener('input', () => {
    // Strip non-digits
    phoneInput.value = phoneInput.value.replace(/\D/g, '').slice(0, 10);
    clearTimeout(phoneTimer);

    const val = phoneInput.value.trim();
    const localErr = validators.phone(val);

    if (localErr || val.length < 10) {
      phoneStatus.textContent = '';
      phoneStatus.className = 'input-status';
      return;
    }

    phoneStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    phoneStatus.className = 'input-status checking';

    phoneTimer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/register/check?phone=${encodeURIComponent(val)}`);
        const data = await res.json();
        if (data.exists) {
          phoneStatus.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
          phoneStatus.className = 'input-status invalid';
          setFieldError('phone', 'This phone number is already registered');
        } else {
          phoneStatus.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
          phoneStatus.className = 'input-status valid';
          setFieldError('phone', null);
        }
      } catch {
        phoneStatus.textContent = '';
        phoneStatus.className = 'input-status';
      }
    }, 600);
  });

  phoneInput.addEventListener('blur', () => {
    const err = validators.phone(phoneInput.value);
    if (err) setFieldError('phone', err);
  });

  // ── Set Loading State ──────────────────────────────────────────────────────
  function setLoading(loading) {
    submitBtn.disabled = loading;
    btnText.style.display = loading ? 'none' : 'inline-flex';
    btnLoading.style.display = loading ? 'inline-flex' : 'none';
  }

  // ── Show Global Error ──────────────────────────────────────────────────────
  function showGlobalError(message) {
    globalError.textContent = message;
    globalError.style.display = 'block';
    globalError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function hideGlobalError() {
    globalError.style.display = 'none';
  }

  // ── Form Submit ────────────────────────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideGlobalError();

    const fields = ['fullName', 'email', 'phone', 'board', 'classCompleted'];
    let hasError = false;

    fields.forEach((id) => {
      const el = document.getElementById(id);
      const err = validators[id](el.value);
      setFieldError(id, err);
      if (err) hasError = true;
    });

    if (hasError) {
      const firstInvalid = form.querySelector('.invalid');
      if (firstInvalid) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const payload = {
      fullName: document.getElementById('fullName').value.trim(),
      email: document.getElementById('email').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      board: document.getElementById('board').value,
      classCompleted: document.getElementById('classCompleted').value,
    };

    setLoading(true);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        // Show success state with full message from server
        form.style.display = 'none';
        formSuccess.style.display = 'block';
        document.getElementById('successStudentId').textContent =
          `Your Student ID: ${data.studentId}`;
        const msgEl = document.getElementById('successMessage');
        if (msgEl) msgEl.textContent = data.message;
        formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        // Handle specific field errors from server
        if (data.field) {
          setFieldError(data.field, data.message);
        } else if (data.errors) {
          data.errors.forEach(({ field, message }) => setFieldError(field, message));
        } else {
          showGlobalError(data.message || 'Registration failed. Please try again.');
        }
        setLoading(false);
      }
    } catch (err) {
      showGlobalError('Network error. Please check your connection and try again.');
      setLoading(false);
    }
  });
})();

// ─── Smooth Anchor Scroll with Active Nav ───────────────────────────────────
(function initActiveNav() {
  const sections = document.querySelectorAll('section[id]');
  const navLinksAll = document.querySelectorAll('.nav-links a[href^="#"]');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinksAll.forEach((link) => {
            link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
          });
        }
      });
    },
    { threshold: 0.4 }
  );

  sections.forEach((section) => observer.observe(section));
})();
