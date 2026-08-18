/**
 * IoT HIVE - Project Publishing Controller
 * Phase 2: Multi-Tier Pricing & Dynamic BOM Builder
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
  const bomContainer = document.getElementById('bom-rows-container');
  const bomTotalDisplay = document.getElementById('bom-total-display');

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
        <input type="text" class="input-cyber bom-name" placeholder="e.g. ESP32 NodeMCU" value="${auth.escapeHtml(name)}" required style="padding: 6px 10px; font-size: 0.85rem;">
      </td>
      <td>
        <input type="text" class="input-cyber bom-part" placeholder="ESP32-WROOM-32" value="${auth.escapeHtml(partNo)}" style="padding: 6px 10px; font-size: 0.85rem; font-family: var(--font-mono);">
      </td>
      <td style="text-align: center;">
        <input type="number" class="input-cyber bom-qty" value="${qty}" min="1" oninput="window.calcBOM()" style="padding: 6px; font-size: 0.85rem; text-align: center; font-family: var(--font-mono);">
      </td>
      <td>
        <input type="number" step="10" min="0" class="input-cyber bom-cost" placeholder="1800.00" value="${cost}" oninput="window.calcBOM()" style="padding: 6px 10px; font-size: 0.85rem; text-align: right; font-family: var(--font-mono);">
      </td>
      <td>
        <input type="url" class="input-cyber bom-url" placeholder="https://digikey.com/..." value="${auth.escapeHtml(url)}" style="padding: 6px 10px; font-size: 0.85rem;">
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

  window.handleCreateProject = async (e) => {
    e.preventDefault();
    const form = e.target;
    const btn = document.getElementById('create-project-submit-btn');
    const alertBox = document.getElementById('create-project-alert');

    alertBox.style.display = 'none';
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined spin">sync</span> Publishing Project...';

    const formData = new FormData(form);
    formData.set('status', 'published');

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
    formData.append('bom_items', JSON.stringify(bomItems));

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

    formData.append('tiers', JSON.stringify(tiers));

    try {
      const created = await api.projects.create(formData);
      if (window.showToast) showToast('Hardware project published successfully!', 'success');
      setTimeout(() => {
        window.location.href = `/project/${created.id}/`;
      }, 800);
    } catch (err) {
      alertBox.className = 'form-alert form-alert-error';
      alertBox.textContent = err.message || 'Failed to publish project. Please check required fields.';
      alertBox.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined">rocket_launch</span> Publish Project to IoT HIVE';
    }
  };

  document.addEventListener('DOMContentLoaded', async () => {
    let user = null;
    try {
      user = await auth.getUser();
      if (!user) {
        window.location.href = '/login/?next=/create-project/';
        return;
      }
    } catch {
      window.location.href = '/login/?next=/create-project/';
      return;
    }

    // Role check: If user is only a buyer, show upgrade banner
    const role = (user.role || 'both').toLowerCase();
    const alertBox = document.getElementById('create-project-alert');

    if (role === 'buyer') {
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

