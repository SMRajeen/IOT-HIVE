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
    if (user && user.id) {
      cachedCurrentUser = user;
      return user;
    }
    cachedCurrentUser = null;
    return null;
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

let lastRenderedNavState = null;

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
  const navStateKey = `${user?.id || 'anon'}_${user?.role || ''}_${user?.username || ''}_${user?.avatar || ''}_${currentPath}`;

  if (lastRenderedNavState === navStateKey && desktopNav && desktopNav.children.length > 0) {
    return;
  }
  lastRenderedNavState = navStateKey;

  if (user && user.username) {
    // User is logged in
    const avatarSrc = user.avatar ? (API.resolveUrl ? API.resolveUrl(user.avatar) : user.avatar) : null;
    const avatarHtml = avatarSrc 
      ? `<img src="${avatarSrc}" alt="${escapeHtml(user.username)}" class="user-nav-avatar-img">`
      : `<div class="user-nav-avatar-fallback"><span class="material-symbols-outlined" style="font-size: 15px;">person</span></div>`;

    const displayName = user.first_name || user.username;
    const isAdmin = user.is_staff || user.is_superuser || user.role === 'admin';
    const role = (user.role || 'both').toLowerCase();

    // Role badge (compact for sleek header fit - hide for admins)
    let roleBadgeHtml = '';
    if (!isAdmin) {
      if (role === 'seller') {
        roleBadgeHtml = `<span class="badge-role badge-role-seller" style="font-size: 0.68rem; padding: 1px 6px;">Seller</span>`;
      } else if (role === 'buyer') {
        roleBadgeHtml = `<span class="badge-role badge-role-buyer" style="font-size: 0.68rem; padding: 1px 6px;">Buyer</span>`;
      } else {
        roleBadgeHtml = `<span class="badge-role badge-role-both" style="font-size: 0.68rem; padding: 1px 6px;">Both</span>`;
      }
    }

    const adminBtnHtml = isAdmin
      ? `<a href="/admin-panel/" class="btn-auth-admin">
           <span class="material-symbols-outlined" style="font-size: 15px;">admin_panel_settings</span>
           Admin
         </a>`
      : '';

    const loggedInHtml = `
      <a href="/profile/" class="user-nav-badge" title="View Profile">
        ${avatarHtml}
        <span class="user-nav-name">${escapeHtml(displayName)}</span>
      </a>
      <button type="button" onclick="handleLogout()" class="btn-auth-logout" title="Sign Out">
        <span class="material-symbols-outlined" style="font-size: 15px;">logout</span>
        <span class="btn-auth-logout-text">Sign Out</span>
      </button>
    `;

    if (desktopNav) desktopNav.innerHTML = loggedInHtml;

    if (mobileNav) {
      mobileNav.innerHTML = `
        <div class="flex flex-col gap-2" style="padding-top: 12px; border-top: 1px solid var(--border-subtle);">
          ${isAdmin ? '<a href="/admin-panel/" class="btn-auth-admin" style="justify-content:center; padding: 8px 12px; border-radius:6px; text-decoration:none; display:flex; align-items:center; gap:6px;">Admin Panel</a>' : ''}
          <a href="/profile/" class="btn btn-secondary btn-sm" style="justify-content:center; display: flex; align-items: center; gap: 8px;">
            ${avatarHtml}
            <span>${escapeHtml(displayName)}</span>
            ${roleBadgeHtml}
          </a>
          <button type="button" onclick="handleLogout()" class="btn-auth-logout" style="justify-content:center; padding: 8px; border-radius: 6px;">Sign Out</button>
        </div>
      `;
    }
  } else {
    // Guest buttons
    const guestHtml = `
      <a href="/login/" class="btn-auth-login">
        <span class="material-symbols-outlined" style="font-size: 15px;">login</span>
        Sign In
      </a>
      <a href="/register/" class="btn-auth-register">
        <span class="material-symbols-outlined" style="font-size: 15px;">person_add</span>
        Get Started
      </a>
    `;

    if (desktopNav) desktopNav.innerHTML = guestHtml;
    if (mobileNav) {
      mobileNav.innerHTML = `
        <div class="flex flex-col gap-2" style="padding-top: 12px; border-top: 1px solid var(--border-subtle);">
          <a href="/login/" class="btn-auth-login" style="justify-content:center;">Sign In</a>
          <a href="/register/" class="btn-auth-register" style="justify-content:center;">Get Started</a>
        </div>
      `;
    }
  }

  // Update active state on server-rendered nav links without replacing the DOM structure
  if (mainNav) {
    mainNav.querySelectorAll('.nav-link').forEach(link => {
      const href = link.getAttribute('href');
      if (href === '/') {
        link.classList.toggle('active', currentPath === '/');
      } else if (href && href !== '#') {
        link.classList.toggle('active', currentPath.startsWith(href));
      }
    });
  }
}


/**
 * Handle Logout
 */
window.handleLogout = async function() {
  try {
    await API.auth.logout();
    cachedCurrentUser = null;
    if (window.IoTHiveRouter && window.IoTHiveRouter.clearCache) {
      window.IoTHiveRouter.clearCache();
    }
    showToast('You have been signed out.', 'info');
    setTimeout(() => {
      window.location.href = '/';
    }, 400);
  } catch (err) {
    if (window.IoTHiveRouter && window.IoTHiveRouter.clearCache) {
      window.IoTHiveRouter.clearCache();
    }
    window.location.href = '/';
  }
};

/**
 * Setup Login Form Handler
 */
function setupLoginForm() {
  const form = document.querySelector('[data-login-form]') || document.getElementById('login-form');
  if (!form) return;

  const urlParams = new URLSearchParams(window.location.search);
  const regBanner = document.getElementById('register-success-banner');
  const resetDoneBanner = document.getElementById('reset-done-banner');
  const resetSentBanner = document.getElementById('reset-sent-banner');
  const userInput = form.querySelector('input[name="username"]');
  const passInput = form.querySelector('input[name="password"]');

  if (urlParams.get('registered') === '1') {
    if (regBanner) regBanner.style.display = 'block';
    const emailParam = urlParams.get('email');
    if (emailParam && userInput) {
      userInput.value = emailParam;
      setTimeout(() => passInput?.focus(), 100);
    }
  }

  if (urlParams.get('reset_done') === '1') {
    if (resetDoneBanner) resetDoneBanner.style.display = 'block';
    const emailParam = urlParams.get('email');
    if (emailParam && userInput) {
      userInput.value = emailParam;
      setTimeout(() => passInput?.focus(), 100);
    }
  }

  if (urlParams.get('reset_sent') === '1') {
    if (resetSentBanner) resetSentBanner.style.display = 'block';
    const emailParam = urlParams.get('email');
    if (emailParam && userInput) {
      userInput.value = emailParam;
    }
  }

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
      if (window.IoTHiveRouter && window.IoTHiveRouter.clearCache) {
        window.IoTHiveRouter.clearCache();
      }
      setTimeout(() => {
        const params = new URLSearchParams(window.location.search);
        const next = params.get('next') || '/marketplace/';
        window.location.href = next;
      }, 500);
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

    if (!email || !password) {
      setMessage(msgBox, 'Please enter your email and password.', 'error');
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
      const payload = {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        role
      };
      if (username) payload.username = username;

      await API.auth.register(payload);

      setMessage(msgBox, 'Account created successfully! Redirecting to login...', 'success');
      showToast('Account created! Please sign in with your password.', 'success');
      cachedCurrentUser = null;
      setTimeout(() => {
        window.location.href = `/login/?registered=1&email=${encodeURIComponent(email)}`;
      }, 800);
    } catch (err) {
      setMessage(msgBox, err.message || 'Registration failed.', 'error');
      setBusy(btn, false);
    }
  });
}

window.handleSocialLogin = async function(provider) {
  const email = prompt(`Enter your ${provider === 'google' ? 'Google' : 'Facebook'} account email address:`);
  if (!email || !email.includes('@')) {
    if (window.showToast) showToast('Valid email required for OAuth authentication.', 'warning');
    return;
  }
  const nameParts = email.split('@')[0].split('.');
  const firstName = nameParts[0] ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1) : 'Maker';
  const lastName = nameParts[1] ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1) : 'Community';

  if (window.showToast) showToast(`Authenticating with ${provider.toUpperCase()}...`, 'info');

  try {
    const res = await API.auth.socialLogin({
      provider,
      email,
      first_name: firstName,
      last_name: lastName,
      role: 'both'
    });
    if (window.showToast) showToast('Social authentication successful!', 'success');
    cachedCurrentUser = null;
    setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next') || '/marketplace/';
      window.location.href = next;
    }, 600);
  } catch (err) {
    if (window.showToast) showToast(err.message || 'Social login failed.', 'error');
  }
};

let activeResetUid = null;
let activeResetToken = null;

window.openResetPasswordModal = function() {
  const modal = document.getElementById('reset-password-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  modal.classList.add('open');

  const step1 = document.getElementById('reset-step-1');
  const step2 = document.getElementById('reset-step-2');
  if (step1) step1.style.display = 'block';
  if (step2) step2.style.display = 'none';

  const reqMsg = document.getElementById('forgot-message') || document.getElementById('reset-modal-msg');
  const confMsg = document.getElementById('confirm-reset-message') || document.getElementById('reset-confirm-msg');
  if (reqMsg) setMessage(reqMsg, '');
  if (confMsg) setMessage(confMsg, '');

  const emailInput = document.getElementById('forgot-email') || document.getElementById('reset-email-input');
  if (emailInput) {
    setTimeout(() => emailInput.focus(), 50);
  }
};

window.closeResetPasswordModal = function() {
  const modal = document.getElementById('reset-password-modal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.style.display = 'none';
};

window.handleForgotPasswordSubmit = async function(e) {
  if (e) e.preventDefault();
  const emailInput = document.getElementById('forgot-email') || document.getElementById('reset-email-input');
  const msgEl = document.getElementById('forgot-message') || document.getElementById('reset-modal-msg');
  const submitBtn = document.getElementById('forgot-submit-btn');
  const identifier = emailInput?.value?.trim();
  if (!identifier) return;

  setBusy(submitBtn, true, 'Sending Instructions...');
  try {
    const res = await API.auth.passwordResetRequest(identifier);
    if (window.showToast) showToast('Password reset link sent to your email!', 'success');
    window.closeResetPasswordModal();
    window.location.href = `/login/?reset_sent=1&email=${encodeURIComponent(identifier)}`;
  } catch (err) {
    setMessage(msgEl, err.message || 'Failed to dispatch reset instructions.', 'error');
    setBusy(submitBtn, false);
  }
};

window.handleConfirmResetSubmit = async function(e) {
  if (e) e.preventDefault();
  const tokenInput = document.getElementById('reset-code') || document.getElementById('reset-token-input');
  const passInput = document.getElementById('new-password') || document.getElementById('reset-new-password');
  const msgEl = document.getElementById('confirm-reset-message') || document.getElementById('reset-confirm-msg');
  const submitBtn = document.getElementById('confirm-reset-btn');

  const tokenVal = tokenInput?.value?.trim() || activeResetToken;
  const newPassword = passInput?.value;

  if (!tokenVal) {
    setMessage(msgEl, 'Please provide the reset token received in your email.', 'error');
    return;
  }

  if (!newPassword || newPassword.length < 6) {
    setMessage(msgEl, 'Password must be at least 6 characters.', 'error');
    return;
  }

  let uid = activeResetUid || '';
  let token = tokenVal;
  if (tokenVal.includes(':')) {
    const parts = tokenVal.split(':');
    uid = parts[0];
    token = parts[1];
  }

  setBusy(submitBtn, true, 'Updating Password...');
  try {
    await API.auth.passwordResetConfirm(uid, token, newPassword);
    if (window.showToast) showToast('Password updated! Please sign in with your new password.', 'success');
    window.closeResetPasswordModal();
    window.location.href = '/login/?reset_done=1';
  } catch (err) {
    setMessage(msgEl, err.message || 'Failed to reset password. The link or code may have expired.', 'error');
    setBusy(submitBtn, false);
  }
};

function setupPasswordResetModal() {
  const modal = document.getElementById('reset-password-modal');
  const closeBtn = document.getElementById('close-reset-modal');
  const step1 = document.getElementById('reset-step-1');
  const step2 = document.getElementById('reset-step-2');

  if (!modal) return;

  const urlParams = new URLSearchParams(window.location.search);
  const resetUid = urlParams.get('reset_uid');
  const resetToken = urlParams.get('reset_token');

  if (resetUid && resetToken) {
    activeResetUid = resetUid;
    activeResetToken = resetToken;
    modal.style.display = 'flex';
    modal.classList.add('open');
    if (step1) step1.style.display = 'none';
    if (step2) step2.style.display = 'block';
    const codeInput = document.getElementById('reset-code');
    if (codeInput) codeInput.value = `${resetUid}:${resetToken}`;
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
}

function initAuthUI() {
  // Global event delegation for forgot password triggers
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('#forgot-password-link, [data-forgot-password]');
    if (trigger) {
      e.preventDefault();
      window.openResetPasswordModal();
      return;
    }

    const toggleBtn = e.target.closest('[data-password-toggle]');
    if (toggleBtn) {
      e.preventDefault();
      const input = toggleBtn.parentElement ? toggleBtn.parentElement.querySelector('input') : null;
      if (!input) return;
      if (input.type === 'password') {
        input.type = 'text';
        const icon = toggleBtn.querySelector('.material-symbols-outlined');
        if (icon) icon.textContent = 'visibility_off';
      } else {
        input.type = 'password';
        const icon = toggleBtn.querySelector('.material-symbols-outlined');
        if (icon) icon.textContent = 'visibility';
      }
    }
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
  clearCache: () => {
    cachedCurrentUser = null;
    lastRenderedNavState = null;
  },
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
