/**
 * IoT HIVE - Authentication Client Module & Global Auth Helpers
 */

function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>'"]/g,
    ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[ch])
  );
}

function setMessage(el, message, type = 'error') {
  if (!el) return;
  if (!message) {
    el.style.display = 'none';
    el.textContent = '';
    return;
  }
  const isSuccess = type === 'success' || type === true;
  el.className = isSuccess ? 'form-alert form-alert-success' : 'form-alert form-alert-error';
  el.textContent = message;
  el.style.display = 'block';
}

function setBusy(button, busy, busyText = '') {
  if (!button) return;
  button.disabled = !!busy;
  if (busy) {
    button.dataset.originalText = button.innerHTML;
    button.innerHTML = `<span class="material-symbols-outlined spin" style="font-size: 16px;">sync</span> ${busyText || 'Processing...'}`;
  } else {
    if (button.dataset.originalText) {
      button.innerHTML = button.dataset.originalText;
    }
  }
}

/**
 * Toast Notification System
 */
window.showToast = function(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast-item ${type}`;
  
  let icon = 'info';
  if (type === 'success') icon = 'check_circle';
  if (type === 'error') icon = 'error';
  if (type === 'warning') icon = 'warning';

  toast.innerHTML = `
    <span class="material-symbols-outlined" style="color: var(--primary); font-size: 20px;">${icon}</span>
    <span style="font-size: 0.85rem; font-weight: 500;">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('exit');
    setTimeout(() => toast.remove(), 250);
  }, 4000);
};

let cachedCurrentUser = null;

async function getCurrentUser(forceRefresh = false) {
  if (cachedCurrentUser && !forceRefresh) return cachedCurrentUser;
  try {
    const user = await API.auth.me();
    cachedCurrentUser = user;
    return user;
  } catch (e) {
    cachedCurrentUser = null;
    return null;
  }
}

async function requireAuth(redirectNext = '') {
  const user = await getCurrentUser();
  if (!user || !user.username) {
    const nextUrl = redirectNext || window.location.pathname + window.location.search;
    window.location.href = `/login/?next=${encodeURIComponent(nextUrl)}`;
    return null;
  }
  return user;
}

/**
 * Update Header Navigation based on current user session & role
 */
async function loadAuthNav() {
  const desktopNav = document.querySelector('[data-auth-nav]');
  const mobileNav = document.querySelector('[data-mobile-auth]');
  const mainNav = document.querySelector('[data-main-nav]');
  const mobileNavLinks = document.querySelector('[data-mobile-nav-links]');
  const favoritesBtn = document.getElementById('header-favorites-btn');

  const user = await getCurrentUser();
  const currentPath = window.location.pathname;

  if (user && user.username) {
    // User is logged in
    const avatarSrc = user.avatar ? (API.resolveUrl ? API.resolveUrl(user.avatar) : user.avatar) : null;
    const avatarHtml = avatarSrc 
      ? `<img src="${avatarSrc}" alt="${escapeHtml(user.username)}" class="user-nav-avatar-img" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary); display: inline-block;">`
      : `<div class="user-nav-avatar-fallback" style="width: 32px; height: 32px; border-radius: 50%; background: var(--bg-surface-high); border: 2px solid var(--primary); display: inline-flex; align-items: center; justify-content: center; color: var(--primary);"><span class="material-symbols-outlined" style="font-size: 18px;">person</span></div>`;

    const displayName = user.first_name || user.username;
    const isAdmin = user.is_staff || user.is_superuser || user.role === 'admin';
    const role = (user.role || 'both').toLowerCase();

    // Role badge
    let roleBadgeHtml = '';
    if (role === 'seller') {
      roleBadgeHtml = `<span class="badge-role badge-role-seller">Seller</span>`;
    } else if (role === 'buyer') {
      roleBadgeHtml = `<span class="badge-role badge-role-buyer">Buyer</span>`;
    } else {
      roleBadgeHtml = `<span class="badge-role badge-role-both">Buyer &amp; Seller</span>`;
    }

    const adminBtnHtml = isAdmin
      ? `<a href="/admin-panel/" class="btn-auth-admin" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: rgba(0, 255, 136, 0.12); border: 1px solid rgba(0, 255, 136, 0.35); color: #00ff88; border-radius: 6px; font-weight: 600; text-decoration: none; font-size: 0.85rem;">
           <span class="material-symbols-outlined" style="font-size: 16px;">admin_panel_settings</span>
           Admin
         </a>`
      : '';

    const loggedInHtml = `
      <div class="flex items-center gap-3">
        ${adminBtnHtml}
        <a href="/profile/" class="user-nav-badge" style="display: inline-flex; align-items: center; gap: 8px; text-decoration: none; color: var(--text-primary); font-weight: 600;">
          ${avatarHtml}
          <span>${escapeHtml(displayName)}</span>
          ${roleBadgeHtml}
        </a>
        <button type="button" onclick="handleLogout()" class="btn-auth-logout" style="display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; background: var(--bg-surface-high); border: 1px solid var(--border-medium); color: var(--text-muted); border-radius: 6px; cursor: pointer; font-size: 0.85rem;">
          <span class="material-symbols-outlined" style="font-size: 16px;">logout</span>
          Sign Out
        </button>
      </div>
    `;

    if (desktopNav) desktopNav.innerHTML = loggedInHtml;

    // Build Role-Specific Desktop Main Navigation Links
    if (mainNav) {
      let navItems = [];
      if (role === 'seller') {
        navItems = [
          { href: '/', label: 'Home', active: currentPath === '/' },
          { href: '/marketplace/', label: 'Marketplace', active: currentPath.startsWith('/marketplace') },
          { href: '/bounties/', label: 'Bounties &amp; Bids', active: currentPath.startsWith('/bounties') },
          { href: '/dashboard/', label: 'Creator Dashboard', active: currentPath.startsWith('/dashboard') },
          { href: '/requests/', label: 'Client Inquiries', active: currentPath.startsWith('/requests') || currentPath.startsWith('/project-requests') },
        ];
      } else if (role === 'buyer') {
        navItems = [
          { href: '/', label: 'Home', active: currentPath === '/' },
          { href: '/marketplace/', label: 'Marketplace', active: currentPath.startsWith('/marketplace') },
          { href: '/categories/', label: 'Categories', active: currentPath.startsWith('/categories') },
          { href: '/bounties/', label: 'Post Bounty', active: currentPath.startsWith('/bounties') },
          { href: '/favorites/', label: 'Saved Projects', active: currentPath.startsWith('/favorites') },
          { href: '/dashboard/', label: 'My Orders', active: currentPath.startsWith('/dashboard') },
        ];
      } else {
        // Both or Admin
        navItems = [
          { href: '/', label: 'Home', active: currentPath === '/' },
          { href: '/marketplace/', label: 'Marketplace', active: currentPath.startsWith('/marketplace') },
          { href: '/categories/', label: 'Categories', active: currentPath.startsWith('/categories') },
          { href: '/bounties/', label: 'Bounties', active: currentPath.startsWith('/bounties') },
          { href: '/dashboard/', label: 'Dashboard', active: currentPath.startsWith('/dashboard') },
          { href: '/requests/', label: 'Inquiries &amp; Orders', active: currentPath.startsWith('/requests') || currentPath.startsWith('/project-requests') },
        ];
      }

      if (isAdmin) {
        navItems.push({ href: '/admin-panel/', label: 'Admin Panel', active: currentPath.startsWith('/admin-panel'), style: 'color: #00ff88;' });
      }

      mainNav.innerHTML = navItems.map(item => `
        <a href="${item.href}" class="nav-link ${item.active ? 'active' : ''}" ${item.style ? `style="${item.style}"` : ''}>${item.label}</a>
      `).join('');
    }

    // Build Role-Specific Mobile Drawer Links
    if (mobileNavLinks) {
      let mobileItems = [];
      if (role === 'seller') {
        mobileItems = [
          { href: '/', label: 'Home' },
          { href: '/marketplace/', label: 'Marketplace' },
          { href: '/bounties/', label: 'Bounties &amp; Maker Bids' },
          { href: '/create-project/', label: '+ Publish New Project', highlight: true },
          { href: '/dashboard/', label: 'Creator Studio Dashboard' },
          { href: '/requests/', label: 'Client Inquiries &amp; Orders' },
          { href: '/profile/', label: 'Maker Profile' },
        ];
      } else if (role === 'buyer') {
        mobileItems = [
          { href: '/', label: 'Home' },
          { href: '/marketplace/', label: 'Marketplace' },
          { href: '/categories/', label: 'Categories' },
          { href: '/bounties/', label: 'Post a Bounty / Request' },
          { href: '/favorites/', label: 'Saved Projects' },
          { href: '/dashboard/', label: 'My Hardware Orders' },
          { href: '/requests/', label: 'My Inquiries' },
          { href: '/profile/', label: 'Profile Settings' },
        ];
      } else {
        // Both / Admin
        mobileItems = [
          { href: '/', label: 'Home' },
          { href: '/marketplace/', label: 'Marketplace' },
          { href: '/categories/', label: 'Categories' },
          { href: '/bounties/', label: 'Bounties &amp; Commissions' },
          { href: '/create-project/', label: '+ Publish Project', highlight: true },
          { href: '/dashboard/', label: 'Dashboard (Sales &amp; Orders)' },
          { href: '/favorites/', label: 'Saved Projects' },
          { href: '/requests/', label: 'Inquiries &amp; Orders' },
          { href: '/profile/', label: 'Profile' },
        ];
      }

      if (isAdmin) {
        mobileItems.push({ href: '/admin-panel/', label: 'Admin Panel', style: 'color: #00ff88;' });
      }

      mobileNavLinks.innerHTML = mobileItems.map(item => `
        <a href="${item.href}" class="mobile-nav-link" ${item.style ? `style="${item.style}"` : (item.highlight ? 'style="color: var(--primary); font-weight: 700;"' : '')}>
          ${item.label} <span class="material-symbols-outlined">chevron_right</span>
        </a>
      `).join('');
    }

    if (mobileNav) {
      mobileNav.innerHTML = `
        <div class="flex flex-col gap-2" style="padding-top: 12px; border-top: 1px solid var(--border-subtle);">
          ${isAdmin ? '<a href="/admin-panel/" class="btn-auth-admin" style="justify-content:center; padding: 8px 12px; background: rgba(0,255,136,0.12); color:#00ff88; border:1px solid rgba(0,255,136,0.3); border-radius:6px; text-decoration:none; display:flex; align-items:center; gap:6px;">Admin Panel</a>' : ''}
          <a href="/profile/" class="btn btn-secondary btn-sm" style="justify-content:center; display: flex; align-items: center; gap: 8px;">
            ${avatarHtml}
            <span>${escapeHtml(displayName)}</span>
            ${roleBadgeHtml}
          </a>
          <button type="button" onclick="handleLogout()" class="btn-auth-logout" style="justify-content:center; padding: 8px; background: var(--bg-surface-high); border: 1px solid var(--border-medium); color: var(--text-muted); border-radius: 6px;">Sign Out</button>
        </div>
      `;
    }
    return;
  }

  // Guest buttons
  const guestHtml = `
    <div class="flex items-center gap-2">
      <a href="/login/" class="btn-auth-login" style="padding: 7px 14px; background: var(--bg-surface-high); border: 1px solid var(--border-medium); color: var(--text-primary); border-radius: 6px; text-decoration: none; font-size: 0.88rem; display: inline-flex; align-items: center; gap: 6px; font-weight: 500;">
        <span class="material-symbols-outlined" style="font-size: 16px;">login</span>
        Sign In
      </a>
      <a href="/register/" class="btn btn-primary btn-sm" style="padding: 7px 14px;">
        <span class="material-symbols-outlined" style="font-size: 16px;">person_add</span>
        Get Started
      </a>
    </div>
  `;

  if (desktopNav) desktopNav.innerHTML = guestHtml;
  if (mobileNav) {
    mobileNav.innerHTML = `
      <div class="flex flex-col gap-2" style="padding-top: 12px; border-top: 1px solid var(--border-subtle);">
        <a href="/login/" class="btn-auth-login" style="justify-content:center; padding: 8px 14px; background: var(--bg-surface-high); border: 1px solid var(--border-medium); color: var(--text-primary); border-radius: 6px; text-decoration: none; display: flex; align-items: center; gap: 6px;">Sign In</a>
        <a href="/register/" class="btn btn-primary btn-sm" style="justify-content:center;">Get Started</a>
      </div>
    `;
  }
}


/**
 * Handle Logout
 */
window.handleLogout = async function() {
  try {
    await API.auth.logout();
    cachedCurrentUser = null;
    showToast('You have been signed out.', 'info');
    setTimeout(() => {
      window.location.href = '/';
    }, 500);
  } catch (err) {
    window.location.href = '/';
  }
};

/**
 * Setup Login Form Handler
 */
function setupLoginForm() {
  const form = document.querySelector('[data-login-form]') || document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const msgBox = form.querySelector('[data-login-message]') || document.getElementById('login-alert');
    
    const formData = new FormData(form);
    const identifier = (formData.get('username') || formData.get('email') || '').trim();
    const password = formData.get('password') || '';

    if (!identifier || !password) {
      setMessage(msgBox, 'Please enter your username/email and password.', 'error');
      return;
    }

    setBusy(btn, true, 'Signing In...');

    try {
      await API.auth.login(identifier, password);
      setMessage(msgBox, 'Login successful! Redirecting...', 'success');
      showToast('Welcome back!', 'success');
      cachedCurrentUser = null;
      setTimeout(() => {
        const params = new URLSearchParams(window.location.search);
        const next = params.get('next') || '/marketplace/';
        window.location.href = next;
      }, 600);
    } catch (err) {
      setMessage(msgBox, err.message || 'Incorrect credentials.', 'error');
      setBusy(btn, false);
    }
  });
}

/**
 * Setup Register Form Handler
 */
function setupRegisterForm() {
  const form = document.querySelector('[data-register-form]') || document.getElementById('register-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const msgBox = form.querySelector('[data-register-message]') || document.getElementById('register-alert');

    const formData = new FormData(form);
    const username = (formData.get('username') || '').trim();
    const email = (formData.get('email') || '').trim();
    const password = formData.get('password') || '';
    const confirmPassword = formData.get('confirm_password') || '';
    const firstName = (formData.get('first_name') || '').trim();
    const lastName = (formData.get('last_name') || '').trim();
    const role = formData.get('role') || 'both';

    if (!username || !email || !password) {
      setMessage(msgBox, 'Please fill in all required fields.', 'error');
      return;
    }

    if (confirmPassword && password !== confirmPassword) {
      setMessage(msgBox, 'Passwords do not match.', 'error');
      return;
    }

    if (password.length < 6) {
      setMessage(msgBox, 'Password must be at least 6 characters long.', 'error');
      return;
    }

    setBusy(btn, true, 'Creating Account...');

    try {
      await API.auth.register({
        username,
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        role
      });

      setMessage(msgBox, 'Account created! Redirecting...', 'success');
      showToast('Welcome to IoT Hive!', 'success');
      cachedCurrentUser = null;
      setTimeout(() => {
        window.location.href = '/marketplace/';
      }, 600);
    } catch (err) {
      setMessage(msgBox, err.message || 'Registration failed.', 'error');
      setBusy(btn, false);
    }
  });
}

let activeResetUid = null;
let activeResetToken = null;

window.openResetPasswordModal = function() {
  const modal = document.getElementById('reset-password-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  modal.classList.add('open');
  const reqForm = document.getElementById('reset-request-form');
  const confForm = document.getElementById('reset-confirm-form');
  const reqMsg = document.getElementById('reset-modal-msg');
  const confMsg = document.getElementById('reset-confirm-msg');
  if (reqForm) reqForm.style.display = 'flex';
  if (confForm) confForm.style.display = 'none';
  if (reqMsg) setMessage(reqMsg, '');
  if (confMsg) setMessage(confMsg, '');
  const emailInput = document.getElementById('reset-email-input');
  if (emailInput) {
    setTimeout(() => emailInput.focus(), 50);
  }
};

window.closeResetPasswordModal = function() {
  const modal = document.getElementById('reset-password-modal');
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
  }
};

function setupPasswordResetModal() {
  const modal = document.getElementById('reset-password-modal');
  const closeBtn = document.getElementById('close-reset-modal');
  const reqForm = document.getElementById('reset-request-form');
  const confForm = document.getElementById('reset-confirm-form');
  const reqMsg = document.getElementById('reset-modal-msg');
  const confMsg = document.getElementById('reset-confirm-msg');
  const backToReqBtn = document.getElementById('reset-back-to-req');
  const userPill = document.getElementById('reset-user-pill');
  const userText = document.getElementById('reset-user-text');

  if (!modal) return;

  const urlParams = new URLSearchParams(window.location.search);
  const resetUid = urlParams.get('reset_uid');
  const resetToken = urlParams.get('reset_token');

  if (resetUid && resetToken) {
    activeResetUid = resetUid;
    activeResetToken = resetToken;
    modal.style.display = 'flex';
    modal.classList.add('open');
    if (reqForm) reqForm.style.display = 'none';
    if (confForm) confForm.style.display = 'flex';
  }

  // Close modal when clicking on backdrop
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      window.closeResetPasswordModal();
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', window.closeResetPasswordModal);
  }

  if (backToReqBtn) {
    backToReqBtn.addEventListener('click', () => {
      if (reqForm) reqForm.style.display = 'flex';
      if (confForm) confForm.style.display = 'none';
      if (reqMsg) setMessage(reqMsg, '');
      if (confMsg) setMessage(confMsg, '');
    });
  }

  if (reqForm) {
    reqForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const identifier = document.getElementById('reset-email-input').value.trim();
      const submitBtn = reqForm.querySelector('button[type="submit"]');
      if (!identifier) return;

      setBusy(submitBtn, true, 'Verifying...');
      try {
        const res = await API.auth.passwordResetRequest(identifier);
        activeResetUid = res.uidb64;
        activeResetToken = res.token;

        if (userText) {
          userText.textContent = `Account: @${res.username || identifier}`;
        }
        if (userPill) {
          userPill.style.display = 'flex';
        }

        // Switch to Step 2: Set New Password immediately
        reqForm.style.display = 'none';
        confForm.style.display = 'flex';
        setMessage(confMsg, 'Account verified! Please enter your new password below.', 'success');
        const passInput = document.getElementById('reset-new-password');
        if (passInput) setTimeout(() => passInput.focus(), 50);
      } catch (err) {
        setMessage(reqMsg, err.message || 'Failed to verify account.', 'error');
      } finally {
        setBusy(submitBtn, false);
      }
    });
  }

  if (confForm) {
    confForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newPassword = document.getElementById('reset-new-password').value;
      const submitBtn = confForm.querySelector('button[type="submit"]');

      if (!activeResetUid || !activeResetToken) {
        setMessage(confMsg, 'Reset token missing. Please verify your account first.', 'error');
        return;
      }

      if (!newPassword || newPassword.length < 6) {
        setMessage(confMsg, 'Password must be at least 6 characters.', 'error');
        return;
      }

      setBusy(submitBtn, true, 'Updating Password...');
      try {
        await API.auth.passwordResetConfirm(activeResetUid, activeResetToken, newPassword);
        setMessage(confMsg, 'Password reset successful! Redirecting to login...', 'success');
        showToast('Password updated! Please sign in with your new password.', 'success');
        setTimeout(() => {
          window.location.href = '/login/';
        }, 1200);
      } catch (err) {
        setMessage(confMsg, err.message || 'Failed to reset password.', 'error');
        setBusy(submitBtn, false);
      }
    });
  }
}

function initAuthUI() {
  // Global event delegation for forgot password triggers
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('#forgot-password-link, [data-forgot-password]');
    if (trigger) {
      e.preventDefault();
      window.openResetPasswordModal();
    }
  });

  document.querySelectorAll('[data-password-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.parentElement.querySelector('input');
      if (!input) return;
      if (input.type === 'password') {
        input.type = 'text';
        const icon = btn.querySelector('.material-symbols-outlined');
        if (icon) icon.textContent = 'visibility_off';
      } else {
        input.type = 'password';
        const icon = btn.querySelector('.material-symbols-outlined');
        if (icon) icon.textContent = 'visibility';
      }
    });
  });
}

// Global Auth Object
const AuthHelpers = {
  escapeHtml,
  setMessage,
  setBusy,
  showToast: window.showToast,
  requireAuth,
  getUser: getCurrentUser,
  loadAuthNav,
  openResetPasswordModal: window.openResetPasswordModal,
  closeResetPasswordModal: window.closeResetPasswordModal
};

window.IoTHiveAuth = AuthHelpers;
window.Auth = AuthHelpers;

document.addEventListener('DOMContentLoaded', () => {
  initAuthUI();
  setupPasswordResetModal();
  setupLoginForm();
  setupRegisterForm();
  loadAuthNav();
});
