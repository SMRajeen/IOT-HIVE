/**
 * IoT HIVE - Clean Maker Profile Controller
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
        if (role === 'seller') {
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
        form.first_name.value = currentUser.first_name || '';
        form.last_name.value = currentUser.last_name || '';
        form.email.value = currentUser.email || '';
        form.phone_number.value = currentUser.phone_number || '';
        form.bio.value = currentUser.bio || '';
        form.location.value = currentUser.location || '';
        form.website.value = currentUser.website || '';
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
        const img = p.images?.[0]?.image ? api.resolveUrl(p.images[0].image) : '';
        return `
          <div class="card-cyber project-node-card" onclick="location.href='/project/${p.id}/'" style="cursor: pointer; display: flex; flex-direction: column;">
            <div style="height: 160px; background: #000; overflow: hidden; border-radius: 6px; position: relative;">
              ${img ? `<img src="${img}" style="width: 100%; height: 100%; object-fit: cover;">` : `
                <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: var(--bg-surface-high);">
                  <span class="material-symbols-outlined" style="font-size: 36px; color: var(--primary);">memory</span>
                </div>
              `}
              <span class="tag-mono" style="position: absolute; top: 8px; left: 8px;">${escapeHtml(p.category_name || 'Hardware')}</span>
            </div>
            <div style="padding: 14px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <h4 style="font-size: 1rem; margin: 0 0 6px;">${escapeHtml(p.title)}</h4>
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

  window.sendTestSMSPrompt = async () => {
    const currentPhone = currentUser ? currentUser.phone_number : '';
    const targetPhone = prompt('Enter the phone number to receive a test SMS (e.g. 0710509154 or +94710509154):', currentPhone || '+94');
    if (!targetPhone) return;

    if (window.showToast) showToast(`Dispatching test SMS to ${targetPhone}...`, 'info');

    try {
      const res = await api.notifications.testSMS(targetPhone);
      if (window.showToast) showToast('SMS Dispatched successfully!', 'success');
      alert(`[IoT HIVE SMS Gateway]
Verification SMS dispatched to: ${res.result.phone_number}
Status: ${res.result.status.toUpperCase()}

Message: "${res.result.message}"`);
    } catch (err) {
      alert(`SMS Dispatch Failed: ${err.message || 'Error sending test SMS'}`);
    }
  };

  window.toggleEditProfile = (show) => {
    document.getElementById('profile-view-section').style.display = show ? 'none' : 'block';
    document.getElementById('profile-edit-section').style.display = show ? 'block' : 'none';
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
