/**
 * IoT HIVE - Maker Profile Controller
 */

(() => {
  'use strict';

  const api = window.IoTHiveAPI || window.API;
  const auth = window.IoTHiveAuth || window.Auth;

  let currentUser = null;

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatLKR(amount) {
    const num = Number(amount || 0);
    return `Rs. ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  async function loadProfile() {
    try {
      currentUser = await auth.getUser();
      if (!currentUser) {
        window.location.href = '/login/?next=/profile/';
        return;
      }

      // Populate hero card
      const name = `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || currentUser.username;
      document.getElementById('profile-name').textContent = name;
      document.getElementById('profile-handle').textContent = `@${currentUser.username}`;
      document.getElementById('profile-location').textContent = currentUser.location || 'Sri Lanka';
      document.getElementById('profile-bio').textContent = currentUser.bio || 'Maker has not added a bio yet.';

      const role = (currentUser.role || 'both').toLowerCase();
      const roleBadgeEl = document.getElementById('profile-role-badge');
      if (roleBadgeEl) {
        if (currentUser.is_staff || currentUser.is_superuser) {
          roleBadgeEl.innerHTML = `<span class="badge" style="background: rgba(255, 83, 87, 0.15); color: #ff5357; border: 1px solid rgba(255, 83, 87, 0.3);">Administrator</span>`;
        } else if (role === 'seller') {
          roleBadgeEl.innerHTML = `<span class="badge-role badge-role-seller">Seller</span>`;
        } else if (role === 'buyer') {
          roleBadgeEl.innerHTML = `<span class="badge-role badge-role-buyer">Buyer</span>`;
        } else {
          roleBadgeEl.innerHTML = `<span class="badge-role badge-role-both">Buyer &amp; Seller</span>`;
        }
      }

      const phoneDisplay = document.getElementById('profile-phone-display');
      if (phoneDisplay) {
        phoneDisplay.textContent = currentUser.phone_number || 'Not linked';
      }

      const websiteEl = document.getElementById('profile-website');
      if (currentUser.website) {
        websiteEl.href = currentUser.website;
        websiteEl.textContent = currentUser.website.replace(/^https?:\/\//, '');
      } else {
        websiteEl.textContent = 'None';
        websiteEl.removeAttribute('href');
      }

      if (currentUser.avatar) {
        document.getElementById('profile-avatar-container').innerHTML = `
          <img src="${api.resolveUrl(currentUser.avatar)}" alt="${escapeHtml(currentUser.username)}" style="width: 100%; height: 100%; object-fit: cover;">
        `;
      }

      // Populate edit form
      const form = document.getElementById('profile-edit-form');
      if (form) {
        if (form.username) form.username.value = currentUser.username || '';
        if (form.first_name) form.first_name.value = currentUser.first_name || '';
        if (form.last_name) form.last_name.value = currentUser.last_name || '';
        if (form.email) form.email.value = currentUser.email || '';
        if (form.phone_number) form.phone_number.value = currentUser.phone_number || '';
        if (form.bio) form.bio.value = currentUser.bio || '';
        if (form.location) form.location.value = currentUser.location || '';
        if (form.website) form.website.value = currentUser.website || '';
        if (form.role) form.role.value = role;
      }

      await loadUserProjects();
    } catch (e) {
      console.error(e);
      window.location.href = '/login/?next=/profile/';
    }
  }

  async function loadUserProjects() {
    const grid = document.getElementById('profile-projects-grid');
    const countBadge = document.getElementById('profile-projects-count');
    if (!grid) return;

    try {
      const data = await api.projects.myProjects();
      const projects = Array.isArray(data) ? data : (data.results || []);

      if (countBadge) countBadge.textContent = `${projects.length} Project${projects.length === 1 ? '' : 's'}`;

      if (projects.length === 0) {
        grid.innerHTML = `
          <div class="card-cyber" style="grid-column: 1 / -1; padding: 36px 20px; text-align: center;">
            <p style="color: var(--text-muted); margin-bottom: 12px;">You have not published any hardware projects yet.</p>
            <a href="/create-project/" class="btn btn-primary btn-sm">
              <span class="material-symbols-outlined">add</span> Create Project
            </a>
          </div>
        `;
        return;
      }

      grid.innerHTML = projects.map(p => {
        const img = p.images?.[0]?.image ? api.resolveUrl(p.images[0].image) : (p.cover_image ? api.resolveUrl(p.cover_image) : '');
        return `
          <div class="card-cyber project-node-card" onclick="location.href='/project/${p.id}/'" style="cursor: pointer; display: flex; flex-direction: column; overflow: hidden;">
            <div style="height: 160px; background: #000; overflow: hidden; border-radius: 6px; position: relative;">
              ${img ? `<img src="${img}" style="width: 100%; height: 100%; object-fit: cover;">` : `
                <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: var(--bg-surface-high);">
                  <span class="material-symbols-outlined" style="font-size: 36px; color: var(--primary);">memory</span>
                </div>
              `}
              <span class="tag-mono" style="position: absolute; top: 8px; left: 8px;">${escapeHtml(p.category_name || 'Hardware')}</span>
              ${p.status === 'draft' ? `<span class="badge" style="position: absolute; top: 8px; right: 8px; background: rgba(255, 183, 0, 0.2); color: #ffb700;">DRAFT</span>` : ''}
            </div>
            <div style="padding: 14px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <h4 style="font-size: 1rem; margin: 0 0 6px; color: var(--text-primary);">${escapeHtml(p.title)}</h4>
                <div class="font-mono font-bold" style="color: var(--primary); font-size: 1rem;">
                  ${p.is_free ? 'Free' : formatLKR(p.price)}
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      grid.innerHTML = `<div style="grid-column: 1 / -1; padding: 20px; text-align: center; color: var(--status-warning);">Failed to load projects.</div>`;
    }
  }

  window.toggleEditProfile = (show) => {
    document.getElementById('profile-view-section').style.display = show ? 'none' : 'block';
    document.getElementById('profile-edit-section').style.display = show ? 'block' : 'none';
  };

  window.openDeleteAccountModal = () => {
    const modal = document.getElementById('delete-account-modal');
    if (modal) modal.style.display = 'flex';
  };

  window.closeDeleteAccountModal = () => {
    const modal = document.getElementById('delete-account-modal');
    if (modal) modal.style.display = 'none';
    const alert = document.getElementById('delete-account-alert');
    if (alert) alert.style.display = 'none';
    const pwd = document.getElementById('delete-account-password');
    if (pwd) pwd.value = '';
  };

  window.handleDeleteAccountSubmit = async (e) => {
    e.preventDefault();
    const pwdInput = document.getElementById('delete-account-password');
    const alert = document.getElementById('delete-account-alert');
    const btn = document.getElementById('delete-account-submit-btn');

    const password = pwdInput ? pwdInput.value : '';
    if (!password) {
      if (alert) {
        alert.className = 'form-alert form-alert-error';
        alert.textContent = 'Please enter your password to confirm deletion.';
        alert.style.display = 'block';
      }
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined spin">sync</span> Deleting...';

    try {
      await api.auth.deleteAccount(password);
      if (window.showToast) showToast('Account deleted successfully.', 'success');
      setTimeout(() => {
        window.location.href = '/';
      }, 800);
    } catch (err) {
      if (alert) {
        alert.className = 'form-alert form-alert-error';
        alert.textContent = err.message || 'Incorrect password or failed to delete account.';
        alert.style.display = 'block';
      }
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined">delete_forever</span> Confirm Delete';
    }
  };

  const editForm = document.getElementById('profile-edit-form');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('profile-save-btn');
      const alert = document.getElementById('profile-edit-alert');

      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined spin">sync</span> Saving...';

      try {
        const formData = new FormData(editForm);
        await api.auth.updateProfile(formData);
        if (window.showToast) showToast('Profile updated successfully!', 'success');
        if (window.loadAuthNav) await loadAuthNav();
        window.toggleEditProfile(false);
        await loadProfile();
      } catch (err) {
        if (alert) {
          alert.className = 'form-alert form-alert-error';
          alert.textContent = err.message || 'Failed to update profile.';
          alert.style.display = 'block';
        }
      } finally {
        btn.disabled = false;
        btn.innerHTML = 'Save Changes';
      }
    });
  }

  document.addEventListener('DOMContentLoaded', loadProfile);
})();
