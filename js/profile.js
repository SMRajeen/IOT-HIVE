/**
 * IoT HIVE - User Profile Controller
 */

let currentUserData = null;

document.addEventListener('DOMContentLoaded', async () => {
  await loadUserProfile();
  setupProfileEditForm();
  setupAvatarPreview();
});

async function loadUserProfile() {
  try {
    const user = await API.auth.me();
    currentUserData = user;
    renderProfileView(user);
    loadUserProjects();
  } catch (err) {
    console.warn('Profile authentication check:', err);
    window.location.href = '/login/?next=/profile/';
  }
}

function renderProfileView(user) {
  if (!user) return;

  const nameEl = document.getElementById('profile-name');
  const handleEl = document.getElementById('profile-handle');
  const roleEl = document.getElementById('profile-role');
  const roleBadgeEl = document.getElementById('profile-role-badge');
  const locationEl = document.getElementById('profile-location');
  const websiteEl = document.getElementById('profile-website');
  const bioEl = document.getElementById('profile-bio');
  const phoneEl = document.getElementById('profile-phone-display');
  const avatarContainer = document.getElementById('profile-avatar-container');
  const editAvatarPreview = document.getElementById('edit-avatar-preview');

  const displayName = (user.first_name || user.last_name)
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
    : user.username;

  if (nameEl) nameEl.textContent = displayName;
  if (handleEl) handleEl.textContent = `@${user.username}`;
  
  if (roleBadgeEl) {
    const role = (user.role || 'both').toLowerCase();
    if (role === 'seller') {
      roleBadgeEl.innerHTML = `<span class="badge-role badge-role-seller">Seller</span>`;
    } else if (role === 'buyer') {
      roleBadgeEl.innerHTML = `<span class="badge-role badge-role-buyer">Buyer</span>`;
    } else {
      roleBadgeEl.innerHTML = `<span class="badge-role badge-role-both">Buyer &amp; Seller</span>`;
    }
  }

  if (locationEl) locationEl.textContent = user.location || 'Sri Lanka';
  if (phoneEl) phoneEl.textContent = user.phone_number || 'Not linked';
  
  if (websiteEl) {
    if (user.website) {
      websiteEl.textContent = user.website.replace(/^https?:\/\//, '');
      websiteEl.href = user.website.startsWith('http') ? user.website : `https://${user.website}`;
    } else {
      websiteEl.textContent = 'None';
      websiteEl.removeAttribute('href');
    }
  }

  if (bioEl) {
    bioEl.textContent = user.bio || 'Maker has not added a bio yet.';
  }

  const avatarSrc = user.avatar ? (API.resolveUrl ? API.resolveUrl(user.avatar) : user.avatar) : null;
  const avatarHtml = avatarSrc
    ? `<img src="${avatarSrc}" alt="${Auth.escapeHtml(user.username)}" style="width: 100%; height: 100%; object-fit: cover;">`
    : `<span class="material-symbols-outlined" style="font-size: 40px; color: var(--primary);">person</span>`;

  if (avatarContainer) avatarContainer.innerHTML = avatarHtml;
  if (editAvatarPreview) {
    editAvatarPreview.innerHTML = avatarSrc
      ? `<img src="${avatarSrc}" alt="${Auth.escapeHtml(user.username)}" style="width: 100%; height: 100%; object-fit: cover;">`
      : `<span class="material-symbols-outlined" style="font-size: 36px; color: var(--primary);">person</span>`;
  }

  // Populate Edit Form
  const form = document.getElementById('profile-edit-form');
  if (form) {
    if (form.elements['first_name']) form.elements['first_name'].value = user.first_name || '';
    if (form.elements['last_name']) form.elements['last_name'].value = user.last_name || '';
    if (form.elements['email']) form.elements['email'].value = user.email || '';
    if (form.elements['bio']) form.elements['bio'].value = user.bio || '';
    if (form.elements['location']) form.elements['location'].value = user.location || '';
    if (form.elements['website']) form.elements['website'].value = user.website || '';
    if (form.elements['role'] && user.role) form.elements['role'].value = user.role;
  }

  // Update Nav Auth
  if (window.Auth && window.Auth.loadAuthNav) {
    window.Auth.loadAuthNav();
  }
}

function setupAvatarPreview() {
  const input = document.getElementById('avatar-file-input');
  const preview = document.getElementById('edit-avatar-preview');
  if (!input || !preview) return;

  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        preview.innerHTML = `<img src="${event.target.result}" style="width: 100%; height: 100%; object-fit: cover;">`;
      };
      reader.readAsDataURL(file);
    }
  });
}

window.toggleEditProfile = function(show) {
  const viewSection = document.getElementById('profile-view-section');
  const editSection = document.getElementById('profile-edit-section');
  if (viewSection && editSection) {
    viewSection.style.display = show ? 'none' : 'block';
    editSection.style.display = show ? 'block' : 'none';
    if (show) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
};

function setupProfileEditForm() {
  const form = document.getElementById('profile-edit-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('profile-save-btn');
    const alert = document.getElementById('profile-edit-alert');

    Auth.setBusy(btn, true, 'Saving Changes & Photo...');

    const formData = new FormData(form);

    try {
      const resp = await API.auth.updateProfile(formData);
      Auth.setMessage(alert, 'Profile and photo updated successfully!', 'success');
      Auth.showToast('Profile and photo updated!', 'success');

      currentUserData = resp.user;
      renderProfileView(resp.user);
      if (window.loadAuthNav) loadAuthNav();

      setTimeout(() => {
        window.toggleEditProfile(false);
        Auth.setBusy(btn, false);
      }, 700);
    } catch (err) {
      Auth.setMessage(alert, err.message || 'Failed to update profile.', 'error');
      Auth.showToast(err.message || 'Update failed', 'error');
      Auth.setBusy(btn, false);
    }
  });
}

async function loadUserProjects() {
  const grid = document.getElementById('profile-projects-grid');
  const countEl = document.getElementById('profile-projects-count');
  if (!grid) return;

  try {
    const projects = await API.projects.myProjects();
    if (countEl) countEl.textContent = `${projects.length} Project${projects.length === 1 ? '' : 's'}`;

    if (projects.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 48px 24px; text-align: center; background: var(--bg-surface-container); border-radius: var(--radius-lg); border: 1px dashed var(--border-medium);">
          <span class="material-symbols-outlined" style="font-size: 40px; color: var(--text-muted); margin-bottom: 12px;">inventory_2</span>
          <h3 style="margin: 0 0 6px 0;">No projects shared yet</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 20px;">Share your circuit designs, robotics, or DIY hardware with the community.</p>
          <a href="/create-project/" class="btn btn-primary btn-sm">
            <span class="material-symbols-outlined">add_circle</span>
            Share First Project
          </a>
        </div>
      `;
      return;
    }

    grid.innerHTML = projects.map(p => {
      const img = p.images && p.images.length > 0 ? (API.resolveUrl ? API.resolveUrl(p.images[0].image) : p.images[0].image) : '';
      return `
        <div class="card-cyber" style="display: flex; flex-direction: column; overflow: hidden; background: var(--bg-surface-container);">
          <div style="height: 170px; background: var(--bg-surface-high); position: relative; overflow: hidden;">
            ${img
              ? `<img src="${img}" alt="${Auth.escapeHtml(p.title)}" style="width: 100%; height: 100%; object-fit: cover;">`
              : `<div class="flex items-center justify-center h-full"><span class="material-symbols-outlined" style="font-size: 44px; color: var(--text-muted);">memory</span></div>`
            }
            <div style="position: absolute; top: 12px; right: 12px;">
              <span class="badge-status ${p.status === 'published' ? 'online' : 'standby'}">
                ${p.status.toUpperCase()}
              </span>
            </div>
          </div>

          <div style="padding: 20px; display: flex; flex-direction: column; flex: 1;">
            <h3 style="font-size: 1.1rem; margin: 0 0 6px 0;">${Auth.escapeHtml(p.title)}</h3>
            <p style="color: var(--text-muted); font-size: 0.88rem; line-height: 1.5; margin-bottom: 16px; flex: 1;">
              ${Auth.escapeHtml(p.short_description || '')}
            </p>
            
            <div class="flex items-center justify-between" style="border-top: 1px solid var(--border-subtle); padding-top: 14px;">
              <span class="font-mono" style="font-weight: 700; color: var(--primary);">
                ${p.is_free ? 'FREE' : '$' + Number(p.price || 0).toFixed(2)}
              </span>
              <a href="/project/${p.id}/" class="btn btn-ghost btn-sm">View Project &rarr;</a>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    grid.innerHTML = '<p style="color: var(--text-muted); grid-column: 1 / -1;">Unable to load projects.</p>';
  }
}
