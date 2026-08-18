/**
 * IoT HIVE - Project Details Controller
 */

let currentProject = null;
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
  loadProject();
});

function getProjectId() {
  const params = new URLSearchParams(window.location.search);
  const idFromQuery = params.get('id');
  if (idFromQuery) return idFromQuery;

  const pathParts = window.location.pathname.split('/').filter(Boolean);
  if (pathParts.length >= 2 && pathParts[0] === 'project') {
    return pathParts[1];
  }
  return null;
}

async function loadProject() {
  const container = document.getElementById('project-detail-content');
  const projectId = getProjectId();

  if (!projectId) {
    if (container) {
      container.innerHTML = `
        <div class="card-cyber" style="padding: 48px; text-align: center;">
          <h3>Project not found</h3>
          <p style="color: var(--text-muted); margin-bottom: 16px;">No project ID was provided.</p>
          <a href="/marketplace/" class="btn btn-primary">Back to Marketplace</a>
        </div>
      `;
    }
    return;
  }

  try {
    try {
      currentUser = await API.auth.me();
    } catch (e) {
      currentUser = null;
    }

    const project = await API.projects.get(projectId);
    currentProject = project;
    
    const isOwner = currentUser && (
      currentUser.id === project.seller ||
      currentUser.username === project.seller_username
    );

    renderProjectDetails(project, isOwner);
  } catch (err) {
    if (container) {
      container.innerHTML = `
        <div class="card-cyber" style="padding: 48px; text-align: center;">
          <span class="material-symbols-outlined" style="font-size: 48px; color: var(--primary); margin-bottom: 12px;">error_outline</span>
          <h3 style="margin-bottom: 8px;">Unable to Load Project</h3>
          <p style="color: var(--text-muted); margin-bottom: 20px;">${err.message || 'This project may have been removed or is unavailable.'}</p>
          <a href="/marketplace/" class="btn btn-primary">Explore Other Projects</a>
        </div>
      `;
    }
  }
}

function renderProjectDetails(p, isOwner) {
  const container = document.getElementById('project-detail-content');
  if (!container) return;

  const price = p.is_free ? 'Free' : `$${Number(p.price || 0).toFixed(2)}`;
  const dateStr = new Date(p.created_at).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric'
  });

  const images = p.images && p.images.length > 0 ? p.images : [];
  const primaryImg = images.length > 0 ? (API.resolveUrl ? API.resolveUrl(images[0].image) : images[0].image) : '';

  container.innerHTML = `
    <!-- Top Breadcrumb & Actions Bar -->
    <div class="flex items-center justify-between" style="margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
      <div class="flex items-center gap-2 text-sm" style="color: var(--text-muted);">
        <a href="/marketplace/" class="text-link">Marketplace</a>
        <span>&rsaquo;</span>
        <a href="/marketplace/?category=${encodeURIComponent(p.category_slug || '')}" class="text-link">${Auth.escapeHtml(p.category_name || 'Hardware')}</a>
        <span>&rsaquo;</span>
        <span style="color: var(--text-primary); font-weight: 500;">${Auth.escapeHtml(p.title)}</span>
      </div>

      <div class="flex items-center gap-2">
        <button id="favorite-btn" class="btn btn-secondary btn-sm" onclick="handleToggleFavorite(${p.id})">
          <span class="material-symbols-outlined" style="font-size: 16px;">bookmark</span>
          Save to Favorites
        </button>
      </div>
    </div>

    <!-- Main Grid: Left Media & Description, Right Sidebar Buy / Edit Box -->
    <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 32px; align-items: flex-start;">
      
      <!-- Left Column: Gallery & Details -->
      <div>
        <!-- Gallery -->
        <div class="card-cyber" style="padding: 16px; margin-bottom: 28px; background: var(--bg-surface-container); border: 1px solid var(--border-medium); border-radius: var(--radius-xl);">
          <div id="main-image-container" style="height: 380px; background: #0a0a0a; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; position: relative;">
            ${primaryImg 
              ? `<img id="main-project-img" src="${primaryImg}" alt="${Auth.escapeHtml(p.title)}" style="width: 100%; height: 100%; object-fit: contain;">`
              : `<div class="flex flex-col items-center justify-center text-muted">
                  <span class="material-symbols-outlined" style="font-size: 56px; color: var(--primary);">memory</span>
                  <span style="margin-top: 8px; font-size: 0.9rem;">No photo uploaded</span>
                 </div>`
            }
          </div>

          ${images.length > 1 ? `
            <div style="display: flex; gap: 10px; margin-top: 12px; overflow-x: auto; padding-bottom: 4px;">
              ${images.map((img, i) => {
                const src = API.resolveUrl ? API.resolveUrl(img.image) : img.image;
                return `
                  <img src="${src}" alt="Thumb" class="gallery-thumb ${i === 0 ? 'active' : ''}" onclick="switchMainImage(this.src, this)" style="width: 64px; height: 64px; object-fit: cover; border-radius: 6px; cursor: pointer; border: 1px solid var(--border-medium);">
                `;
              }).join('')}
            </div>
          ` : ''}
        </div>

        <!-- Project Description & Specifications -->
        <div class="card-cyber" style="padding: 28px; background: var(--bg-surface-container); border: 1px solid var(--border-medium); border-radius: var(--radius-xl); margin-bottom: 28px;">
          <h2 style="font-size: 1.4rem; margin-bottom: 16px;">About This Hardware Project</h2>
          <div style="color: var(--text-secondary); line-height: 1.7; font-size: 1rem; white-space: pre-line; margin-bottom: 24px;">
            ${Auth.escapeHtml(p.description || p.short_description || 'No detailed instructions provided.')}
          </div>

          ${p.video ? `
            <div style="margin-top: 24px; border-top: 1px solid var(--border-subtle); padding-top: 20px;">
              <h4 style="font-size: 1rem; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                <span class="material-symbols-outlined" style="color: var(--primary);">videocam</span>
                Project Demo Video
              </h4>
              <a href="${Auth.escapeHtml(p.video.video_url)}" target="_blank" rel="noopener noreferrer" class="text-link" style="font-size: 0.95rem;">
                ${Auth.escapeHtml(p.video.video_url)} &nearr;
              </a>
            </div>
          ` : ''}

          ${p.model_3d ? `
            <div style="margin-top: 18px; border-top: 1px solid var(--border-subtle); padding-top: 20px;">
              <h4 style="font-size: 1rem; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                <span class="material-symbols-outlined" style="color: var(--primary);">view_in_ar</span>
                3D CAD &amp; STL Files
              </h4>
              <a href="${Auth.escapeHtml(p.model_3d.model_url)}" target="_blank" rel="noopener noreferrer" class="text-link" style="font-size: 0.95rem;">
                ${Auth.escapeHtml(p.model_3d.model_url)} &nearr;
              </a>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Right Column: Pricing, Owner Edit Actions OR Buyer Checkout -->
      <div>
        <div class="card-cyber" style="padding: 28px; background: var(--bg-surface-container); border: 1px solid var(--border-medium); border-radius: var(--radius-xl); position: sticky; top: 100px;">
          
          <div class="flex items-center justify-between" style="margin-bottom: 16px;">
            <span class="tag-mono">${Auth.escapeHtml(p.category_name || 'Hardware')}</span>
            <span class="font-mono text-xs" style="color: var(--text-muted);">Views: ${p.views}</span>
          </div>

          <h1 style="font-size: 1.65rem; line-height: 1.3; margin: 0 0 12px 0;">${Auth.escapeHtml(p.title)}</h1>
          <p style="color: var(--text-muted); font-size: 0.92rem; line-height: 1.5; margin-bottom: 20px;">
            ${Auth.escapeHtml(p.short_description || '')}
          </p>

          <!-- Price Display -->
          <div style="padding: 16px; background: var(--bg-surface-high); border-radius: 10px; margin-bottom: 20px; border: 1px solid var(--border-subtle);">
            <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Listed Price</div>
            <div class="font-mono font-bold" style="font-size: 1.85rem; color: var(--primary); margin-top: 2px;">
              ${price} <span style="font-size: 0.9rem; color: var(--text-muted); font-weight: normal;">${p.is_free ? '' : 'USD'}</span>
            </div>
          </div>

          <!-- Dynamic Action Area: Owner Controls VS Buyer Checkout -->
          ${isOwner ? `
            <!-- OWNER CONTROLS (User is creator of this project) -->
            <div style="padding: 16px; background: rgba(0, 255, 136, 0.08); border: 1px solid rgba(0, 255, 136, 0.25); border-radius: 8px; margin-bottom: 20px; text-align: center;">
              <div class="flex items-center justify-center gap-2" style="color: var(--status-online); font-weight: 600; font-size: 0.92rem;">
                <span class="material-symbols-outlined" style="font-size: 20px;">verified_user</span>
                You are the Creator of this Project
              </div>
              <p style="color: var(--text-muted); font-size: 0.82rem; margin: 4px 0 0 0;">
                You have full permission to modify details, update price, or delete this project.
              </p>
            </div>

            <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;">
              <button class="btn btn-primary btn-lg" onclick="openEditProjectModal()" style="width: 100%; justify-content: center;">
                <span class="material-symbols-outlined">edit_note</span>
                Edit Project Details
              </button>

              <button class="btn btn-secondary btn-lg" onclick="handleDeleteOwnProject(${p.id})" style="width: 100%; justify-content: center; color: #ff5357; border-color: rgba(255, 83, 87, 0.4);">
                <span class="material-symbols-outlined">delete_forever</span>
                Delete This Project
              </button>
            </div>
          ` : `
            <!-- BUYER / VISITOR ACTIONS -->
            <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;">
              ${!p.is_free ? `
                <button class="btn btn-primary btn-lg" onclick="buyProjectNow(${p.id}, '${encodeURIComponent(p.title)}', ${Number(p.price || 0)}, '${p.seller_username}')" style="width: 100%; justify-content: center;">
                  <span class="material-symbols-outlined">payments</span>
                  Buy &amp; Download ($${Number(p.price || 0).toFixed(2)})
                </button>
              ` : `
                <button class="btn btn-primary btn-lg" onclick="showToast('Free project blueprints and schematics unlocked!', 'success')" style="width: 100%; justify-content: center;">
                  <span class="material-symbols-outlined">download</span>
                  Free Download
                </button>
              `}

              <button class="btn btn-secondary btn-lg" onclick="window.openInquiryModal()" style="width: 100%; justify-content: center;">
                <span class="material-symbols-outlined">chat</span>
                Contact Maker / Inquire
              </button>
            </div>
          `}

          <!-- Maker Info Card -->
          <div style="border-top: 1px solid var(--border-subtle); padding-top: 20px;">
            <div class="text-xs" style="color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px;">Created By</div>
            <div class="flex items-center gap-3">
              <div style="width: 42px; height: 42px; border-radius: 50%; background: var(--bg-surface-high); border: 1.5px solid var(--primary); display: flex; align-items: center; justify-content: center;">
                <span class="material-symbols-outlined" style="font-size: 24px; color: var(--primary);">person</span>
              </div>
              <div>
                <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">${Auth.escapeHtml(p.seller_name || p.seller_username)}</div>
                <div class="font-mono text-xs" style="color: var(--primary);">@${Auth.escapeHtml(p.seller_username)}</div>
              </div>
            </div>
            <div class="text-xs font-mono" style="color: var(--text-muted); margin-top: 12px;">
              Published: ${dateStr}
            </div>
          </div>

        </div>
      </div>

    </div>
  `;
}

window.buyProjectNow = function(projectId, encodedTitle, price, makerName) {
  const title = decodeURIComponent(encodedTitle);
  Payment.open({
    projectId,
    projectTitle: title,
    projectPrice: price,
    makerName,
    onComplete: () => {
      showToast('Order completed! Thank you for supporting this maker.', 'success');
    }
  });
};

window.switchMainImage = function(src, thumbEl) {
  const mainImg = document.getElementById('main-project-img');
  if (mainImg) mainImg.src = src;
  document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
  if (thumbEl) thumbEl.classList.add('active');
};

window.handleToggleFavorite = async function(projectId) {
  try {
    const resp = await API.favorites.toggle(projectId);
    showToast(resp.message, 'success');
    const btn = document.getElementById('favorite-btn');
    if (btn) {
      if (resp.favorited) {
        btn.classList.add('btn-primary');
        btn.classList.remove('btn-secondary');
        btn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 16px;">bookmark_added</span> Saved';
      } else {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
        btn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 16px;">bookmark</span> Save to Favorites';
      }
    }
  } catch (err) {
    showToast('Please sign in to save projects.', 'error');
  }
};

window.openInquiryModal = function() {
  const modal = document.getElementById('inquiry-modal');
  if (modal) modal.style.display = 'flex';
};

window.closeInquiryModal = function() {
  const modal = document.getElementById('inquiry-modal');
  if (modal) modal.style.display = 'none';
};

window.handleSendInquiry = async function(event) {
  event.preventDefault();
  const msgInput = document.getElementById('inquiry-message');
  const alertEl = document.getElementById('inquiry-alert');
  const btn = document.getElementById('inquiry-submit-btn');

  if (!msgInput || !msgInput.value.trim() || !currentProject) return;

  btn.disabled = true;
  btn.innerHTML = '<span class="material-symbols-outlined spin" style="font-size: 16px;">sync</span> Sending...';

  try {
    await API.requests.create(currentProject.id, msgInput.value.trim());
    if (alertEl) {
      alertEl.className = 'form-alert form-alert-success';
      alertEl.textContent = 'Your message has been sent to the maker!';
      alertEl.style.display = 'block';
    }
    showToast('Message sent to maker!', 'success');
    setTimeout(() => {
      window.closeInquiryModal();
      msgInput.value = '';
      if (alertEl) alertEl.style.display = 'none';
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined">send</span> Send Message';
    }, 1000);
  } catch (err) {
    if (alertEl) {
      alertEl.className = 'form-alert form-alert-error';
      alertEl.textContent = err.message || 'Failed to send message.';
      alertEl.style.display = 'block';
    }
    btn.disabled = false;
    btn.innerHTML = '<span class="material-symbols-outlined">send</span> Send Message';
  }
};

// ============================================================
// OWNER EDIT & DELETE FUNCTIONS
// ============================================================

window.openEditProjectModal = async function() {
  const modal = document.getElementById('edit-project-modal');
  if (!modal || !currentProject) return;

  // Prefill Form Fields
  const form = document.getElementById('edit-project-form');
  if (form) {
    if (form.elements['title']) form.elements['title'].value = currentProject.title || '';
    if (form.elements['short_description']) form.elements['short_description'].value = currentProject.short_description || '';
    if (form.elements['description']) form.elements['description'].value = currentProject.description || '';
    if (form.elements['price']) form.elements['price'].value = currentProject.price || '0.00';
    if (form.elements['is_free']) form.elements['is_free'].checked = !!currentProject.is_free;
    if (form.elements['tags']) form.elements['tags'].value = currentProject.tags || '';
    if (form.elements['video_url']) form.elements['video_url'].value = currentProject.video?.video_url || '';
    if (form.elements['model_url']) form.elements['model_url'].value = currentProject.model_3d?.model_url || '';

    // Load category options into edit modal
    const catSelect = document.getElementById('edit-project-category');
    if (catSelect) {
      try {
        const categories = await API.categories.list();
        const cats = Array.isArray(categories) ? categories : (categories.results || []);
        catSelect.innerHTML = cats.map(c => `
          <option value="${c.id}" ${c.id === currentProject.category ? 'selected' : ''}>${Auth.escapeHtml(c.name)}</option>
        `).join('');
      } catch (e) {
        console.warn('Could not refresh categories:', e);
      }
    }
  }

  modal.style.display = 'flex';
};

window.closeEditProjectModal = function() {
  const modal = document.getElementById('edit-project-modal');
  if (modal) modal.style.display = 'none';
};

window.handleSaveProjectEdit = async function(event) {
  event.preventDefault();
  const form = document.getElementById('edit-project-form');
  const alertEl = document.getElementById('edit-project-alert');
  const btn = document.getElementById('edit-project-submit-btn');

  if (!form || !currentProject) return;

  btn.disabled = true;
  btn.innerHTML = '<span class="material-symbols-outlined spin" style="font-size: 16px;">sync</span> Saving...';

  const formData = new FormData(form);
  const isFree = form.elements['is_free'] ? form.elements['is_free'].checked : false;
  formData.set('is_free', isFree ? 'true' : 'false');
  if (isFree) {
    formData.set('price', '0');
  }

  try {
    const updated = await API.projects.update(currentProject.id, formData);
    showToast('Project updated successfully!', 'success');
    window.closeEditProjectModal();
    currentProject = updated;
    renderProjectDetails(updated, true);
  } catch (err) {
    if (alertEl) {
      alertEl.className = 'form-alert form-alert-error';
      alertEl.textContent = err.message || 'Failed to update project.';
      alertEl.style.display = 'block';
    }
    showToast(err.message || 'Update failed', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="material-symbols-outlined">save</span> Save Changes';
  }
};

window.handleDeleteOwnProject = async function(projectId) {
  if (!confirm('Are you sure you want to permanently delete this project? This action cannot be undone.')) {
    return;
  }

  try {
    await API.projects.delete(projectId);
    showToast('Project deleted successfully.', 'success');
    setTimeout(() => {
      window.location.href = '/dashboard/';
    }, 800);
  } catch (err) {
    showToast(err.message || 'Failed to delete project.', 'error');
  }
};
