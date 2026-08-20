/**
 * IoT HIVE - Project Publishing & Editing Controller
 * Multi-Tier Pricing, Status, Attachments & Dynamic BOM Builder
 */

(() => {
  'use strict';

  const api = window.IoTHiveAPI || window.API;
  const auth = window.IoTHiveAuth || window.Auth;

  if (!api || !auth) {
    console.error('[IoT Hive] API or Auth module not available.');
    return;
  }

  const categorySelect = document.getElementById('project-category');
  const isFreeCheckbox = document.getElementById('project-is-free');
  const priceInput = document.getElementById('project-price');
  const statusSelect = document.getElementById('project-status');
  const bomContainer = document.getElementById('bom-rows-container');
  const bomTotalDisplay = document.getElementById('bom-total-display');

  // Check for edit mode
  const urlParams = new URLSearchParams(window.location.search);
  const editProjectId = urlParams.get('edit') || urlParams.get('id');

  function calculateBOMTotal() {
    if (!bomContainer || !bomTotalDisplay) return;
    let total = 0;
    const rows = bomContainer.querySelectorAll('.bom-row');
    rows.forEach(row => {
      const qty = parseFloat(row.querySelector('.bom-qty')?.value) || 1;
      const cost = parseFloat(row.querySelector('.bom-cost')?.value) || 0;
      total += (qty * cost);
    });
    bomTotalDisplay.textContent = `Rs. ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  window.addBOMRow = (name = '', partNo = '', qty = 1, cost = '', url = '') => {
    if (!bomContainer) return;
    const tr = document.createElement('tr');
    tr.className = 'bom-row';
    tr.innerHTML = `
      <td>
        <input type="text" class="input-cyber bom-name" placeholder="e.g. ESP32 NodeMCU" value="${auth.escapeHtml(name || '')}" required style="padding: 6px 10px; font-size: 0.85rem;">
      </td>
      <td>
        <input type="text" class="input-cyber bom-part" placeholder="ESP32-WROOM-32" value="${auth.escapeHtml(partNo || '')}" style="padding: 6px 10px; font-size: 0.85rem; font-family: var(--font-mono);">
      </td>
      <td style="text-align: center;">
        <input type="number" class="input-cyber bom-qty" value="${qty || 1}" min="1" oninput="window.calcBOM()" style="padding: 6px; font-size: 0.85rem; text-align: center; font-family: var(--font-mono);">
      </td>
      <td>
        <input type="number" step="10" min="0" class="input-cyber bom-cost" placeholder="1800.00" value="${cost || ''}" oninput="window.calcBOM()" style="padding: 6px 10px; font-size: 0.85rem; text-align: right; font-family: var(--font-mono);">
      </td>
      <td>
        <input type="url" class="input-cyber bom-url" placeholder="https://digikey.com/..." value="${auth.escapeHtml(url || '')}" style="padding: 6px 10px; font-size: 0.85rem;">
      </td>
      <td style="text-align: center;">
        <button type="button" class="btn-icon" onclick="window.removeBOMRow(this)" style="width: 28px; height: 28px; color: var(--status-warning);">
          <span class="material-symbols-outlined" style="font-size: 18px;">delete</span>
        </button>
      </td>
    `;
    bomContainer.appendChild(tr);
    calculateBOMTotal();
  };

  window.removeBOMRow = (btn) => {
    btn.closest('tr')?.remove();
    calculateBOMTotal();
  };

  window.calcBOM = calculateBOMTotal;

  async function loadCategories() {
    if (!categorySelect) return;
    try {
      const data = await api.categories.list();
      const categories = Array.isArray(data) ? data : (data.results || []);
      categorySelect.innerHTML = '<option value="">Select Category</option>' + categories.map(cat => `
        <option value="${cat.id}">${auth.escapeHtml(cat.name)}</option>
      `).join('');
    } catch (e) {
      console.error('Error loading categories:', e);
    }
  }

  async function loadExistingProjectForEdit(projectId) {
    try {
      const project = await api.projects.get(projectId);
      if (!project) return;

      document.querySelector('input[name="title"]').value = project.title || '';
      document.querySelector('input[name="short_description"]').value = project.short_description || '';
      document.querySelector('textarea[name="description"]').value = project.description || '';
      document.querySelector('input[name="microcontroller"]').value = project.microcontroller || '';
      if (document.querySelector('input[name="connectivity"]')) {
        document.querySelector('input[name="connectivity"]').value = project.connectivity || '';
      }
      if (document.querySelector('select[name="difficulty"]')) {
        document.querySelector('select[name="difficulty"]').value = project.difficulty || 'intermediate';
      }
      if (document.querySelector('input[name="estimated_build_time"]')) {
        document.querySelector('input[name="estimated_build_time"]').value = project.estimated_build_time || '';
      }
      if (priceInput) priceInput.value = project.price || 0;
      if (isFreeCheckbox) {
        isFreeCheckbox.checked = !!project.is_free;
        if (project.is_free && priceInput) priceInput.disabled = true;
      }
      if (categorySelect && project.category) {
        categorySelect.value = project.category.id || project.category;
      }
      if (statusSelect && project.status) {
        statusSelect.value = project.status;
      }
      if (document.querySelector('textarea[name="source_code"]')) {
        document.querySelector('textarea[name="source_code"]').value = project.source_code || '';
      }
      if (document.querySelector('select[name="source_code_language"]')) {
        document.querySelector('select[name="source_code_language"]').value = project.source_code_language || 'cpp';
      }
      if (document.querySelector('input[name="video_url"]') && project.video) {
        document.querySelector('input[name="video_url"]').value = project.video.youtube_url || '';
      }
      if (document.querySelector('input[name="model_url"]') && project.model_3d) {
        document.querySelector('input[name="model_url"]').value = project.model_3d.embed_url || '';
      }

      // Load Tiers
      if (project.tiers && project.tiers.length) {
        const kitTier = project.tiers.find(t => t.tier_type === 'kit');
        if (kitTier) {
          const kitP = document.getElementById('tier-kit-price');
          const kitD = document.getElementById('tier-kit-desc');
          if (kitP) kitP.value = kitTier.price;
          if (kitD) kitD.value = kitTier.description || '';
        }
        const assembledTier = project.tiers.find(t => t.tier_type === 'assembled');
        if (assembledTier) {
          const assP = document.getElementById('tier-assembled-price');
          const assD = document.getElementById('tier-assembled-desc');
          if (assP) assP.value = assembledTier.price;
          if (assD) assD.value = assembledTier.description || '';
        }
      }

      // Load BOM Items
      if (bomContainer) {
        bomContainer.innerHTML = '';
        if (project.bom_items && project.bom_items.length) {
          project.bom_items.forEach(item => {
            window.addBOMRow(item.name, item.part_number, item.quantity, item.estimated_cost, item.supplier_url);
          });
        }
      }

      // Update submit button text
      const submitBtn = document.getElementById('create-project-submit-btn');
      if (submitBtn) {
        submitBtn.innerHTML = '<span class="material-symbols-outlined">save</span> Save Changes';
      }
    } catch (e) {
      console.error('Error loading project for edit:', e);
    }
  }

  window.handleCreateProject = async (e) => {
    e.preventDefault();
    const form = e.target;
    const btn = document.getElementById('create-project-submit-btn');
    const alertBox = document.getElementById('create-project-alert');

    alertBox.style.display = 'none';
    btn.disabled = true;
    const isEditing = !!editProjectId;
    btn.innerHTML = `<span class="material-symbols-outlined spin">sync</span> ${isEditing ? 'Saving Changes...' : 'Publishing Project...'}`;

    const formData = new FormData(form);
    const selectedStatus = statusSelect ? statusSelect.value : 'published';
    formData.set('status', selectedStatus);

    // Collect Dynamic BOM items
    const bomItems = [];
    const rows = document.querySelectorAll('.bom-row');
    rows.forEach(row => {
      const name = row.querySelector('.bom-name')?.value.trim();
      const partNo = row.querySelector('.bom-part')?.value.trim();
      const qty = parseInt(row.querySelector('.bom-qty')?.value) || 1;
      const cost = parseFloat(row.querySelector('.bom-cost')?.value) || 0;
      const url = row.querySelector('.bom-url')?.value.trim();
      if (name) {
        bomItems.push({
          name,
          part_number: partNo,
          quantity: qty,
          estimated_cost: cost,
          supplier_url: url
        });
      }
    });
    formData.set('bom_data', JSON.stringify(bomItems));
    formData.set('bom_items', JSON.stringify(bomItems));

    // Collect Multi-Tier Offerings
    const tiers = [];
    const basePrice = parseFloat(formData.get('price')) || 0;
    const isFree = isFreeCheckbox?.checked;

    // Tier 1: Digital Blueprint
    tiers.push({
      tier_type: 'digital',
      name: 'Digital Blueprint & Firmware',
      price: isFree ? 0 : basePrice,
      currency: 'LKR',
      description: 'Instant digital access to Gerber PCB files, KiCad schematics, BOM, and firmware code.',
      requires_shipping: false
    });

    // Tier 2: DIY Kit (Optional)
    const kitPrice = parseFloat(document.getElementById('tier-kit-price')?.value);
    const kitDesc = document.getElementById('tier-kit-desc')?.value.trim();
    if (kitPrice > 0) {
      tiers.push({
        tier_type: 'kit',
        name: 'Complete DIY Component Kit',
        price: kitPrice,
        currency: 'LKR',
        description: kitDesc || 'Full electronic parts kit and custom PCB shipped to your doorstep in Sri Lanka.',
        requires_shipping: true
      });
    }

    // Tier 3: Assembled Unit (Optional)
    const assembledPrice = parseFloat(document.getElementById('tier-assembled-price')?.value);
    const assembledDesc = document.getElementById('tier-assembled-desc')?.value.trim();
    if (assembledPrice > 0) {
      tiers.push({
        tier_type: 'assembled',
        name: 'Pre-Assembled & Quality Tested Unit',
        price: assembledPrice,
        currency: 'LKR',
        description: assembledDesc || 'Fully soldered, pre-programmed and enclosure-fitted device ready for instant use.',
        requires_shipping: true
      });
    }

    formData.set('tiers_data', JSON.stringify(tiers));
    formData.set('tiers', JSON.stringify(tiers));

    try {
      let result;
      if (isEditing) {
        result = await api.projects.update(editProjectId, formData);
        if (window.showToast) showToast('Project changes saved successfully!', 'success');
      } else {
        result = await api.projects.create(formData);
        if (window.showToast) showToast('Hardware project created successfully!', 'success');
      }

      setTimeout(() => {
        window.location.href = `/project/${result.id || editProjectId}/`;
      }, 700);
    } catch (err) {
      alertBox.className = 'form-alert form-alert-error';
      alertBox.textContent = err.message || (isEditing ? 'Failed to update project.' : 'Failed to publish project. Please check required fields.');
      alertBox.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = `<span class="material-symbols-outlined">${isEditing ? 'save' : 'rocket_launch'}</span> ${isEditing ? 'Save Changes' : 'Publish Project to IoT HIVE'}`;
    }
  };

  document.addEventListener('DOMContentLoaded', async () => {
    let user = null;
    try {
      user = await auth.getUser();
      if (!user) {
        window.location.href = `/login/?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        return;
      }
    } catch {
      window.location.href = `/login/?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      return;
    }

    const role = (user.role || 'both').toLowerCase();
    const alertBox = document.getElementById('create-project-alert');

    if (role === 'buyer' && !user.is_staff && !user.is_superuser) {
      if (alertBox) {
        alertBox.className = 'role-upgrade-banner';
        alertBox.style.display = 'block';
        alertBox.style.marginBottom = '28px';
        alertBox.innerHTML = `
          <div style="display: flex; gap: 14px; align-items: center;">
            <span class="material-symbols-outlined" style="font-size: 32px; color: #00ff88;">storefront</span>
            <div>
              <h3 style="margin: 0 0 4px 0; color: #fff; font-size: 1.1rem;">Enable Seller Privileges to Publish</h3>
              <p style="margin: 0; font-size: 0.88rem; color: var(--text-muted);">
                Your account is currently set to <strong>Buyer</strong>. To post hardware projects, blueprints, and DIY kits, upgrade your role to <strong>Seller</strong> or <strong>Both (Buyer &amp; Seller)</strong>.
              </p>
            </div>
          </div>
          <div style="margin-top: 14px; display: flex; gap: 10px; align-items: center;">
            <button type="button" id="btn-quick-upgrade-seller" class="btn btn-primary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
              <span class="material-symbols-outlined">upgrade</span>
              1-Click Upgrade to Maker &amp; Seller
            </button>
            <a href="/profile/" class="btn btn-secondary btn-sm">Edit in Profile</a>
          </div>
        `;

        document.getElementById('btn-quick-upgrade-seller')?.addEventListener('click', async () => {
          try {
            const btn = document.getElementById('btn-quick-upgrade-seller');
            btn.disabled = true;
            btn.innerHTML = '<span class="material-symbols-outlined spin">sync</span> Upgrading...';
            await api.auth.updateProfile({ role: 'both' });
            if (window.showToast) showToast('Account role updated to Buyer & Seller! You can now publish.', 'success');
            if (window.loadAuthNav) await loadAuthNav();
            alertBox.style.display = 'none';
          } catch (e) {
            if (window.showToast) showToast(e.message || 'Upgrade failed', 'error');
          }
        });
      }
    }

    await loadCategories();

    if (editProjectId) {
      await loadExistingProjectForEdit(editProjectId);
    } else {
      // Add initial dynamic row if creating new
      window.addBOMRow();
    }

    if (isFreeCheckbox) {
      isFreeCheckbox.addEventListener('change', () => {
        if (isFreeCheckbox.checked) {
          priceInput.value = '0.00';
          priceInput.disabled = true;
        } else {
          priceInput.disabled = false;
          if (priceInput.value === '0.00') priceInput.value = '3500.00';
        }
      });
    }
  });
})();

