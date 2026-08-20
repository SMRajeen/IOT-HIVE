/**
 * IoT HIVE - Project Details Controller
 * Phase 1 Design System Restored (Superb Cyber HUD Specs)
 * Phase 2: Multi-Tier Commerce & Sri Lanka Card Checkout
 * Phase 3: Verified Reviews, Community Makes Gallery & Live Chat
 */

(() => {
  'use strict';

  const api = window.IoTHiveAPI || window.API;
  const auth = window.IoTHiveAuth || window.Auth;

  if (!api || !auth) {
    console.error('[IoT Hive] API or Auth module not available.');
    return;
  }

  let currentProject = null;
  let currentUser = null;
  let isOwner = false;
  let activeTab = 'overview';
  let selectedTierIndex = 0;
  let currentReviewRating = 5;

  // Extract Project ID from URL (/project/123/ or /project/123)
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const projectId = pathParts[pathParts.length - 1];

  function formatLKR(amount) {
    const num = Number(amount || 0);
    return `Rs. ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function getYouTubeEmbedUrl(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = String(url).match(regExp);
    if (match && match[2].length === 11) {
      const origin = window.location.origin || '';
      return `https://www.youtube.com/embed/${match[2]}?rel=0&modestbranding=1&origin=${encodeURIComponent(origin)}`;
    }
    return url.includes('embed/') ? url : null;
  }

  function getAttachmentIcon(fileType, fileName) {
    const type = (fileType || '').toLowerCase();
    const name = (fileName || '').toLowerCase();
    if (type.includes('pdf') || name.endsWith('.pdf')) return 'picture_as_pdf';
    if (type.includes('cad') || type.includes('stl') || name.endsWith('.stl') || name.endsWith('.step') || name.endsWith('.stp')) return 'view_in_ar';
    if (type.includes('firmware') || name.endsWith('.hex') || name.endsWith('.bin') || name.endsWith('.ino')) return 'memory';
    if (type.includes('zip') || name.endsWith('.zip') || name.endsWith('.rar') || name.endsWith('.7z')) return 'folder_zip';
    return 'download';
  }

  function renderStars(rating) {
    if (!rating) return '';
    const r = Math.round(Number(rating));
    let stars = '';
    for (let i = 1; i <= 5; i++) {
      stars += `<span class="material-symbols-outlined" style="font-size: 16px; color: ${i <= r ? '#ffb700' : 'var(--border-medium)'};">star</span>`;
    }
    return stars;
  }

  function getActiveTier() {
    if (!currentProject) return null;
    const tiers = currentProject.tiers || [];
    if (tiers.length > 0 && tiers[selectedTierIndex]) {
      return tiers[selectedTierIndex];
    }
    return {
      id: null,
      tier_type: 'digital',
      name: 'Digital Blueprint & Firmware',
      price: currentProject.price || 0,
      currency: 'LKR',
      description: 'Instant digital access to KiCad schematics, Gerber PCB files, BOM, and firmware code.',
      requires_shipping: false
    };
  }

  function renderTierOptions() {
    const tiers = (currentProject.tiers && currentProject.tiers.length > 0) ? currentProject.tiers : [
      {
        id: null,
        tier_type: 'digital',
        name: 'Digital Blueprint & Firmware',
        price: currentProject.price || 0,
        currency: 'LKR',
        description: 'Instant digital access to schematics, Gerbers, BOM, and firmware code.',
        requires_shipping: false
      }
    ];

    return tiers.map((tier, idx) => {
      const isSelected = idx === selectedTierIndex;
      const isPhysical = tier.requires_shipping || tier.tier_type === 'kit' || tier.tier_type === 'assembled';
      const icon = tier.tier_type === 'assembled' ? 'precision_manufacturing' : (tier.tier_type === 'kit' ? 'inventory_2' : 'terminal');
      const badge = tier.tier_type === 'assembled' ? 'ASSEMBLED UNIT' : (tier.tier_type === 'kit' ? 'DIY PARTS KIT' : 'DIGITAL BLUEPRINT');

      return `
        <div class="card-cyber tier-option-card ${isSelected ? 'tier-selected' : ''}" 
             onclick="window.selectHardwareTier(${idx})" 
             style="cursor: pointer; padding: 14px 16px; margin-bottom: 10px; border-radius: 10px; transition: all 0.2s; border: 1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}; background: ${isSelected ? 'rgba(0, 229, 255, 0.08)' : 'var(--bg-surface-low)'};">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="material-symbols-outlined" style="font-size: 20px; color: ${isSelected ? 'var(--primary)' : 'var(--text-muted)'};">${icon}</span>
              <strong style="font-size: 0.95rem; color: ${isSelected ? 'var(--text-primary)' : 'var(--text-secondary)'};">${auth.escapeHtml(tier.name)}</strong>
            </div>
            <span class="font-mono font-bold" style="color: var(--primary); font-size: 1.05rem;">
              ${tier.price == 0 ? 'Free' : formatLKR(tier.price)}
            </span>
          </div>
          <p style="color: var(--text-muted); font-size: 0.8rem; margin: 4px 0 6px; line-height: 1.4;">
            ${auth.escapeHtml(tier.description || '')}
          </p>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="hardware-chip" style="font-size: 0.68rem; padding: 2px 6px;">${badge}</span>
            <span class="text-xs" style="color: var(--text-muted); font-size: 0.72rem;">
              ${isPhysical ? '&bull; Doorstep courier delivery' : '&bull; Instant Unlock'}
            </span>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderProject(project) {
    const container = document.getElementById('project-detail-content');
    if (!container) return;

    const img = project.images?.[0]?.image ? api.resolveUrl(project.images[0].image) : '';
    const creator = project.seller_name || project.seller_username || 'Maker';
    const activeTier = getActiveTier();
    const isFree = project.is_free || (activeTier && activeTier.price == 0);
    const priceDisplay = isFree ? 'Free / Open-Source' : formatLKR(activeTier.price);

    const mcu = project.microcontroller || 'Universal MCU';
    const connectivity = project.connectivity || 'Standalone';
    const difficulty = (project.difficulty || 'intermediate').toUpperCase();
    const buildTime = project.estimated_build_time || '1-2 Hours';
    const reviews = project.reviews || [];
    const avgRating = project.average_rating ? Number(project.average_rating).toFixed(1) : null;
    const canManage = isOwner || (currentUser && (currentUser.is_staff || currentUser.is_superuser));

    container.innerHTML = `
      <!-- Breadcrumb & Header Bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: var(--space-6);">
        <div style="display: flex; align-items: center; gap: 8px; font-family: var(--font-mono); font-size: 0.85rem; color: var(--text-muted);">
          <a href="/marketplace/" style="color: var(--primary);">Marketplace</a>
          <span>/</span>
          <span>${auth.escapeHtml(project.category_name || 'Hardware')}</span>
          <span>/</span>
          <span style="color: var(--text-primary);">${auth.escapeHtml(project.title)}</span>
        </div>

        <div class="flex items-center gap-2">
          ${canManage ? `
            <a href="/create-project/?edit=${project.id}" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
              <span class="material-symbols-outlined" style="font-size: 16px;">edit</span>
              Edit Project
            </a>
            <button onclick="window.handleDeleteProject()" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 6px; color: #ff5357;">
              <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
              Delete
            </button>
          ` : `
            <button id="favorite-btn" onclick="window.toggleFavorite()" class="btn btn-secondary btn-sm">
              <span class="material-symbols-outlined" id="fav-icon">bookmark_border</span>
              <span id="fav-text">Save</span>
            </button>
            <button onclick="window.startChatWithMaker()" class="btn btn-primary btn-sm">
              <span class="material-symbols-outlined">chat</span>
              Live Chat Maker
            </button>
          `}
        </div>
      </div>

      <!-- Main Layout: 2 Columns (Content 70% | Sidebar 30%) -->
      <div class="project-layout-grid">
        
        <!-- Left Column: Specs, Cover, Tabs & Content -->
        <div class="project-main-col">
          <!-- Title & Rating Header -->
          <div style="margin-bottom: 20px;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">
              <span class="tag-mono" style="background: rgba(0,229,255,0.1); color: var(--primary); border: 1px solid rgba(0,229,255,0.3);">
                ${auth.escapeHtml(project.category_name || 'Electronics')}
              </span>
              ${avgRating ? `
                <div style="display: flex; align-items: center; gap: 4px; font-size: 0.85rem; font-family: var(--font-mono); color: #ffb700;">
                  <span class="material-symbols-outlined" style="font-size: 16px;">star</span>
                  <strong>${avgRating}</strong>
                  <span style="color: var(--text-muted);">(${reviews.length} review${reviews.length === 1 ? '' : 's'})</span>
                </div>
              ` : `
                <span style="color: var(--text-muted); font-size: 0.82rem; font-family: var(--font-mono);">No reviews yet</span>
              `}
              <span class="tag-mono" style="color: var(--text-muted);">${project.views || 0} views</span>
              ${project.status === 'draft' ? `<span class="badge" style="background: rgba(255, 183, 0, 0.15); color: #ffb700; border: 1px solid rgba(255, 183, 0, 0.3);">DRAFT</span>` : ''}
            </div>

            <h1 style="font-size: 2.2rem; margin: 0 0 10px; line-height: 1.2;">${auth.escapeHtml(project.title)}</h1>
            <p style="color: var(--text-secondary); font-size: 1.05rem; line-height: 1.5; margin: 0;">
              ${auth.escapeHtml(project.short_description || '')}
            </p>
          </div>

          <!-- ============================================================ -->
          <!-- RESTORED SUPERB PHASE 1 CYBER HUD HARDWARE SPEC GRID -->
          <!-- ============================================================ -->
          <div class="hardware-spec-grid">
            <div class="hardware-spec-card">
              <div class="hardware-spec-label">
                <span class="material-symbols-outlined" style="font-size: 15px; color: var(--primary);">memory</span>
                MICROCONTROLLER
              </div>
              <div class="hardware-spec-val">${auth.escapeHtml(mcu)}</div>
            </div>

            <div class="hardware-spec-card">
              <div class="hardware-spec-label">
                <span class="material-symbols-outlined" style="font-size: 15px; color: #00ff88;">wifi</span>
                CONNECTIVITY
              </div>
              <div class="hardware-spec-val">${auth.escapeHtml(connectivity)}</div>
            </div>

            <div class="hardware-spec-card">
              <div class="hardware-spec-label">
                <span class="material-symbols-outlined" style="font-size: 15px; color: var(--status-warning);">speed</span>
                DIFFICULTY
              </div>
              <div class="hardware-spec-val">${difficulty}</div>
            </div>

            <div class="hardware-spec-card">
              <div class="hardware-spec-label">
                <span class="material-symbols-outlined" style="font-size: 15px; color: var(--primary-container);">schedule</span>
                BUILD TIME
              </div>
              <div class="hardware-spec-val">${auth.escapeHtml(buildTime)}</div>
            </div>
          </div>

          <!-- Cover Image or Hero Media -->
          <div class="card-cyber" style="padding: 0; overflow: hidden; margin-bottom: 24px; max-height: 420px; background: #000; border-radius: var(--radius-lg); position: relative;">
            ${img
              ? `<img src="${img}" alt="${auth.escapeHtml(project.title)}" style="width: 100%; height: 420px; object-fit: cover;">`
              : `<div style="height: 300px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--bg-surface-high); color: var(--text-muted);">
                  <span class="material-symbols-outlined" style="font-size: 64px; color: var(--primary);">memory</span>
                  <span style="font-size: 0.9rem; margin-top: 8px; font-family: var(--font-mono);">OPEN SOURCE HARDWARE</span>
                 </div>`
            }
          </div>

          <!-- Project Navigation Tabs (6 Tabs including Phase 3 Reviews & Community Makes) -->
          <div class="project-tabs-nav" style="margin-bottom: 20px;">
            <button class="project-tab-btn ${activeTab === 'overview' ? 'active' : ''}" onclick="window.switchTab('overview')">
              <span class="material-symbols-outlined" style="font-size: 18px;">menu_book</span>
              Overview &amp; Guide
            </button>
            <button class="project-tab-btn ${activeTab === 'bom' ? 'active' : ''}" onclick="window.switchTab('bom')">
              <span class="material-symbols-outlined" style="font-size: 18px;">list_alt</span>
              Bill of Materials (${(project.bom_items || []).length})
            </button>
            <button class="project-tab-btn ${activeTab === 'code' ? 'active' : ''}" onclick="window.switchTab('code')">
              <span class="material-symbols-outlined" style="font-size: 18px;">terminal</span>
              Firmware &amp; Code
            </button>
            <button class="project-tab-btn ${activeTab === 'files' ? 'active' : ''}" onclick="window.switchTab('files')">
              <span class="material-symbols-outlined" style="font-size: 18px;">folder_zip</span>
              Blueprints &amp; Files (${(project.attachments || []).length})
            </button>
            <button class="project-tab-btn ${activeTab === 'reviews' ? 'active' : ''}" onclick="window.switchTab('reviews')">
              <span class="material-symbols-outlined" style="font-size: 18px; color: #ffb700;">star</span>
              Reviews &amp; Makes (${reviews.length})
            </button>
            <button class="project-tab-btn ${activeTab === 'media' ? 'active' : ''}" onclick="window.switchTab('media')">
              <span class="material-symbols-outlined" style="font-size: 18px;">view_in_ar</span>
              3D CAD &amp; Video
            </button>
          </div>

          <!-- Tab Content Containers -->
          <div id="tab-content-container">
            ${renderActiveTabContent(project)}
          </div>

        </div>

        <!-- Right Column: Multi-Tier Purchase Box & Maker Card -->
        <div class="project-sidebar-sticky">
          <!-- Multi-Tier Offering Card -->
          <div class="card-cyber" style="padding: 24px; margin-bottom: 20px; background: var(--bg-surface-container); border: 1px solid var(--border-medium); border-radius: var(--radius-xl);">
            <div style="font-size: 0.75rem; font-family: var(--font-mono); color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px;">SELECT HARDWARE TIER</div>
            
            <!-- Tier Cards -->
            <div id="tier-options-list" style="margin-bottom: 16px;">
              ${renderTierOptions()}
            </div>

            <!-- Active Tier Summary & Checkout Action -->
            <div style="border-top: 1px solid var(--border-subtle); padding-top: 16px; margin-top: 8px;">
              <div class="flex items-center justify-between" style="margin-bottom: 12px;">
                <span style="font-size: 0.85rem; color: var(--text-muted);">Selected Tier Price:</span>
                <span id="sidebar-price-display" class="font-mono font-bold" style="font-size: 1.45rem; color: var(--primary);">${priceDisplay}</span>
              </div>

              ${isOwner ? `
                <div class="tag-mono" style="text-align: center; padding: 10px; background: var(--bg-surface-high); border-radius: 6px; color: var(--primary);">
                  You are the creator of this project
                </div>
              ` : `
                <button type="button" class="btn btn-primary btn-lg" onclick="window.handleTierCheckout()" style="width: 100%; justify-content: center; margin-bottom: 10px;">
                  <span class="material-symbols-outlined">payments</span>
                  <span id="sidebar-buy-btn-label">${isFree ? 'Download Blueprint' : 'Order Hardware / Buy'}</span>
                </button>
                <div style="text-align: center; font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; justify-content: center; gap: 6px;">
                  <span class="material-symbols-outlined" style="font-size: 14px; color: var(--status-success);">verified_user</span>
                  PayHere &bull; Visa / Mastercard &bull; Sri Lanka Delivery
                </div>
              `}
            </div>
          </div>

          <!-- Maker Profile & Live Chat Card -->
          <div class="card-cyber" style="padding: 22px; background: var(--bg-surface-container); border-radius: var(--radius-xl); border: 1px solid var(--border-medium);">
            <div style="font-size: 0.75rem; font-family: var(--font-mono); color: var(--text-muted); text-transform: uppercase; margin-bottom: 12px;">CREATED BY</div>
            <div class="flex items-center gap-3" style="margin-bottom: 16px;">
              <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--bg-surface-high); display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-medium); color: var(--primary); font-weight: 700; font-size: 1.15rem;">
                ${creator.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <strong style="font-size: 1.05rem; color: var(--text-primary);">${auth.escapeHtml(creator)}</strong>
                <div class="text-xs" style="color: #00ff88; font-family: var(--font-mono); display: flex; align-items: center; gap: 4px;">
                  <span class="material-symbols-outlined" style="font-size: 13px;">verified</span> Verified Maker
                </div>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px;">
              <button onclick="window.startChatWithMaker()" class="btn btn-primary btn-sm" style="width: 100%; justify-content: center;">
                <span class="material-symbols-outlined" style="font-size: 16px;">forum</span>
                Live Chat with Maker
              </button>
              <button onclick="window.openInquiryModal()" class="btn btn-ghost btn-sm" style="width: 100%; justify-content: center;">
                <span class="material-symbols-outlined" style="font-size: 16px;">mail</span>
                Send Custom Inquiry
              </button>
            </div>
          </div>

        </div>

      </div>
    `;

    // Highlight code blocks if Prism is loaded
    if (window.Prism) {
      setTimeout(() => window.Prism.highlightAll(), 50);
    }
  }

  function renderActiveTabContent(project) {
    if (activeTab === 'overview') {
      const descHtml = project.description
        ? project.description.replace(/\n/g, '<br>').replace(/### (.*?)(<br>|$)/g, '<h3 style="margin: 20px 0 8px; color: var(--primary);">$1</h3>').replace(/## (.*?)(<br>|$)/g, '<h2 style="margin: 24px 0 10px; color: var(--text-primary);">$1</h2>')
        : '<p style="color: var(--text-muted);">No detailed documentation provided.</p>';

      return `
        <div class="card-cyber" style="padding: 28px; background: var(--bg-surface-container); border-radius: var(--radius-xl);">
          <h3 style="font-size: 1.2rem; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; color: var(--primary);">
            <span class="material-symbols-outlined">menu_book</span>
            Project Build Guide &amp; Technical Specs
          </h3>
          <div style="line-height: 1.7; font-size: 0.95rem; color: var(--text-secondary);">
            ${descHtml}
          </div>
        </div>
      `;
    }

    if (activeTab === 'bom') {
      const items = project.bom_items || [];
      let totalCost = 0;
      let totalParts = 0;

      items.forEach(it => {
        const qty = it.quantity || 1;
        totalParts += qty;
        totalCost += qty * Number(it.estimated_cost || 0);
      });

      return `
        <div class="card-cyber" style="padding: 28px; background: var(--bg-surface-container); border-radius: var(--radius-xl);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 20px;">
            <div>
              <h3 style="font-size: 1.2rem; margin: 0; display: flex; align-items: center; gap: 8px; color: var(--primary);">
                <span class="material-symbols-outlined">list_alt</span>
                Interactive Bill of Materials (BOM)
              </h3>
              <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 4px;">
                Complete list of electrical components, sensors, modules, and hardware parts.
              </p>
            </div>
            ${items.length > 0 ? `
              <button onclick="window.exportBOMCSV()" class="btn btn-secondary btn-sm">
                <span class="material-symbols-outlined" style="font-size: 16px;">download</span>
                Export CSV
              </button>
            ` : ''}
          </div>

          ${items.length === 0 ? `
            <div style="padding: 36px; text-align: center; color: var(--text-muted);">
              <span class="material-symbols-outlined" style="font-size: 40px; color: var(--text-muted);">inventory_2</span>
              <p style="margin-top: 8px;">No BOM components specified for this project.</p>
            </div>
          ` : `
            <div class="bom-table-wrap">
              <table class="bom-table">
                <thead>
                  <tr>
                    <th>Component Name</th>
                    <th>Part Number / MPN</th>
                    <th style="text-align: center;">Qty</th>
                    <th style="text-align: right;">Est. Unit (LKR)</th>
                    <th style="text-align: right;">Subtotal (LKR)</th>
                    <th style="text-align: center;">Source</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map(it => {
                    const lineTotal = (it.quantity || 1) * Number(it.estimated_cost || 0);
                    return `
                      <tr>
                        <td><strong>${auth.escapeHtml(it.name)}</strong></td>
                        <td style="font-family: var(--font-mono); color: var(--text-muted); font-size: 0.82rem;">${auth.escapeHtml(it.part_number || '-')}</td>
                        <td style="text-align: center;"><span class="bom-qty-badge">${it.quantity || 1}</span></td>
                        <td style="text-align: right; font-family: var(--font-mono);">${formatLKR(it.estimated_cost)}</td>
                        <td style="text-align: right; font-family: var(--font-mono); font-weight: 600; color: var(--primary);">${formatLKR(lineTotal)}</td>
                        <td style="text-align: center;">
                          ${it.supplier_url ? `
                            <a href="${auth.escapeHtml(it.supplier_url)}" target="_blank" rel="noopener" class="btn btn-ghost btn-xs" style="padding: 3px 8px; font-size: 0.75rem;">
                              <span class="material-symbols-outlined" style="font-size: 13px;">open_in_new</span> Buy
                            </a>
                          ` : '<span style="color: var(--text-muted); font-size: 0.75rem;">-</span>'}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <div class="bom-summary-bar">
              <div style="font-size: 0.9rem; color: var(--text-muted);">
                Total Parts: <strong style="color: var(--text-primary); font-family: var(--font-mono);">${totalParts} items (${items.length} line items)</strong>
              </div>
              <div style="font-size: 1.05rem;">
                Estimated BOM Cost: <strong style="color: var(--primary); font-family: var(--font-mono);">${formatLKR(totalCost)}</strong>
              </div>
            </div>
          `}
        </div>
      `;
    }

    if (activeTab === 'code') {
      const code = project.source_code || '';
      const lang = project.source_code_language || 'cpp';

      return `
        <div class="card-cyber" style="padding: 28px; background: var(--bg-surface-container); border-radius: var(--radius-xl);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="font-size: 1.2rem; margin: 0; display: flex; align-items: center; gap: 8px; color: var(--primary);">
              <span class="material-symbols-outlined">terminal</span>
              Embedded Firmware &amp; Source Code
            </h3>
            ${code ? `
              <button id="copy-code-btn" onclick="window.copySourceCode()" class="btn btn-secondary btn-sm">
                <span class="material-symbols-outlined" style="font-size: 16px;">content_copy</span>
                Copy Code
              </button>
            ` : ''}
          </div>

          ${!code ? `
            <div style="padding: 36px; text-align: center; color: var(--text-muted);">
              <span class="material-symbols-outlined" style="font-size: 40px;">code_off</span>
              <p style="margin-top: 8px;">No firmware source code attached directly to this project page.</p>
            </div>
          ` : `
            <div class="code-viewer-container">
              <div class="code-viewer-header">
                <span class="code-lang-tag">
                  <span class="material-symbols-outlined" style="font-size: 15px;">code</span>
                  ${lang.toUpperCase()}
                </span>
                <span style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">
                  ${code.split('\n').length} lines
                </span>
              </div>
              <pre class="code-viewer-pre"><code class="language-${lang}">${auth.escapeHtml(code)}</code></pre>
            </div>
          `}
        </div>
      `;
    }

    if (activeTab === 'files') {
      const files = project.attachments || [];
      return `
        <div class="card-cyber" style="padding: 28px; background: var(--bg-surface-container); border-radius: var(--radius-xl);">
          <h3 style="font-size: 1.2rem; margin-bottom: 6px; display: flex; align-items: center; gap: 8px; color: var(--primary);">
            <span class="material-symbols-outlined">folder_zip</span>
            Downloadable Hardware Blueprints &amp; Assets
          </h3>
          <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 20px;">
            Direct download archives including KiCad schematics, Gerber PCB files, 3D printable STLs, and compiled firmware binaries.
          </p>

          ${files.length === 0 ? `
            <div style="padding: 36px; text-align: center; color: var(--text-muted);">
              <span class="material-symbols-outlined" style="font-size: 40px;">folder_off</span>
              <p style="margin-top: 8px;">No file attachments uploaded for this project yet.</p>
            </div>
          ` : files.map(f => {
            const url = api.resolveUrl(f.file_url || f.file);
            const icon = getAttachmentIcon(f.file_type, f.file_name || f.title);
            const isPdf = (f.file_type || '').toLowerCase().includes('pdf') || (f.file_name || '').toLowerCase().endsWith('.pdf');
            return `
              <div class="attachment-card" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: var(--bg-surface-low); border: 1px solid var(--border-subtle); border-radius: 10px; margin-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 14px;">
                  <div class="attachment-icon-box" style="width: 42px; height: 42px; border-radius: 8px; background: rgba(0, 229, 255, 0.1); border: 1px solid rgba(0, 229, 255, 0.3); display: flex; align-items: center; justify-content: center; color: var(--primary);">
                    <span class="material-symbols-outlined">${icon}</span>
                  </div>
                  <div>
                    <strong style="font-size: 0.95rem; color: var(--text-primary);">${auth.escapeHtml(f.title || f.file_name || 'Hardware Asset')}</strong>
                    <div style="display: flex; gap: 8px; font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; align-items: center;">
                      <span class="tag-mono" style="font-size: 0.7rem; padding: 1px 6px;">${(f.file_type || 'RAW').toUpperCase()}</span>
                      ${f.file_size ? `<span>${auth.escapeHtml(f.file_size)}</span>` : ''}
                    </div>
                  </div>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                  ${isPdf ? `
                    <a href="${url}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">
                      <span class="material-symbols-outlined" style="font-size: 16px;">visibility</span>
                      View PDF
                    </a>
                  ` : ''}
                  <a href="${url}" download class="btn btn-primary btn-sm">
                    <span class="material-symbols-outlined" style="font-size: 16px;">download</span>
                    Download
                  </a>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    // ============================================================
    // PHASE 3: REVIEWS & COMMUNITY MAKES TAB
    // ============================================================
    if (activeTab === 'reviews') {
      const reviews = project.reviews || [];
      const avgRating = project.average_rating ? Number(project.average_rating).toFixed(1) : null;
      const makesCount = project.community_makes_count || 0;

      // Extract build photos for community gallery
      const makesWithImages = reviews.filter(r => r.build_image || r.build_image_url);

      return `
        <div class="card-cyber" style="padding: 28px; background: var(--bg-surface-container); border-radius: var(--radius-xl);">
          
          <!-- Rating Stats Banner -->
          <div class="review-stats-banner">
            <div>
              <div class="review-score-big">${avgRating || '—'}</div>
              <div class="star-rating-row" style="margin: 4px 0 6px;">
                ${renderStars(avgRating || 0)}
              </div>
              <div style="font-size: 0.8rem; color: var(--text-muted); font-family: var(--font-mono);">
                Based on ${reviews.length} review${reviews.length === 1 ? '' : 's'}
              </div>
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 12px;">
                <div>
                  <h4 style="margin: 0; font-size: 1.1rem; color: var(--text-primary);">Community Makes &amp; Ratings</h4>
                  <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 2px;">
                    ${makesCount} verified builder${makesCount === 1 ? '' : 's'} have completed and shared their hardware build.
                  </p>
                </div>
                <button onclick="window.openReviewModal()" class="btn btn-primary btn-sm">
                  <span class="material-symbols-outlined" style="font-size: 16px;">add_photo_alternate</span>
                  Post Your Make / Review
                </button>
              </div>
            </div>
          </div>

          <!-- Community Makes Gallery -->
          ${makesWithImages.length > 0 ? `
            <div style="margin-bottom: 24px;">
              <h4 style="font-size: 0.95rem; font-family: var(--font-mono); color: var(--primary); text-transform: uppercase; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                <span class="material-symbols-outlined" style="font-size: 16px;">photo_library</span>
                Community Makes Gallery (${makesWithImages.length})
              </h4>
              <div class="community-makes-gallery">
                ${makesWithImages.map(m => {
                  const imgUrl = api.resolveUrl(m.build_image_url || m.build_image);
                  return `
                    <div class="community-make-card" onclick="window.openLightbox('${imgUrl}')" title="Click to expand make by ${auth.escapeHtml(m.user_name || m.user_username)}">
                      <img src="${imgUrl}" alt="Hardware Make">
                      <div class="maker-overlay">@${auth.escapeHtml(m.user_username)}</div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Reviews Feed -->
          <div>
            <h4 style="font-size: 0.95rem; font-family: var(--font-mono); color: var(--text-muted); text-transform: uppercase; margin-bottom: 16px;">
              All Reviews &amp; Feedback
            </h4>

            ${reviews.length === 0 ? `
              <div style="padding: 36px; text-align: center; color: var(--text-muted);">
                <span class="material-symbols-outlined" style="font-size: 40px; color: #ffb700;">rate_review</span>
                <h4 style="margin: 10px 0 4px; color: var(--text-primary);">No reviews yet</h4>
                <p style="font-size: 0.9rem; margin-bottom: 16px;">Be the first maker to build and review this project!</p>
                <button onclick="window.openReviewModal()" class="btn btn-secondary btn-sm">
                  Write the First Review
                </button>
              </div>
            ` : reviews.map(r => {
              const makeImg = r.build_image_url || r.build_image ? api.resolveUrl(r.build_image_url || r.build_image) : '';
              return `
                <div class="review-item-card">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--bg-surface-high); border: 1px solid var(--border-medium); display: flex; align-items: center; justify-content: center; color: var(--primary); font-weight: 700; font-size: 0.9rem;">
                        ${(r.user_name || r.user_username || 'M').substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                          <strong style="font-size: 0.92rem; color: var(--text-primary);">${auth.escapeHtml(r.user_name || r.user_username)}</strong>
                          ${r.is_verified_buyer ? `
                            <span class="verified-buyer-badge">
                              <span class="material-symbols-outlined" style="font-size: 13px;">verified</span> Verified Buyer
                            </span>
                          ` : ''}
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">${r.created_formatted || 'Recently'}</div>
                      </div>
                    </div>

                    <div class="star-rating-row">
                      ${renderStars(r.rating)}
                    </div>
                  </div>

                  ${r.title ? `<h5 style="margin: 6px 0 4px; font-size: 0.98rem; color: var(--text-primary);">${auth.escapeHtml(r.title)}</h5>` : ''}
                  <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5; margin: 0 0 10px;">
                    ${auth.escapeHtml(r.comment)}
                  </p>

                  ${makeImg ? `
                    <div style="display: inline-block; cursor: pointer;" onclick="window.openLightbox('${makeImg}')">
                      <img src="${makeImg}" alt="Hardware build photo" style="max-height: 140px; border-radius: 6px; border: 1px solid var(--border-subtle); object-fit: cover;">
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>

        </div>
      `;
    }

    if (activeTab === 'media') {
      const rawVid = project.video?.video_url || project.video_url;
      const embedUrl = getYouTubeEmbedUrl(rawVid);
      const model3d = project.model_3d?.model_url || project.model_url;

      return `
        <div class="card-cyber" style="padding: 28px; background: var(--bg-surface-container); border-radius: var(--radius-xl);">
          <h3 style="font-size: 1.2rem; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; color: var(--primary);">
            <span class="material-symbols-outlined">view_in_ar</span>
            3D CAD &amp; Video Demonstrations
          </h3>

          ${embedUrl ? `
            <div style="margin-bottom: 24px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h4 style="font-size: 0.95rem; margin: 0; color: var(--text-muted); font-family: var(--font-mono);">VIDEO WALKTHROUGH</h4>
                ${rawVid ? `
                  <a href="${auth.escapeHtml(rawVid)}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-xs" style="display: inline-flex; align-items: center; gap: 4px; color: #ff5357;">
                    <span class="material-symbols-outlined" style="font-size: 14px;">smart_display</span> Watch on YouTube &rarr;
                  </a>
                ` : ''}
              </div>
              <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px; border: 1px solid var(--border-medium); background: #000;">
                <iframe src="${auth.escapeHtml(embedUrl)}" 
                        style="position: absolute; top:0; left: 0; width: 100%; height: 100%; border:0;" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                        allowfullscreen
                        referrerpolicy="strict-origin-when-cross-origin"></iframe>
              </div>
            </div>
          ` : ''}

          ${model3d ? `
            <div>
              <h4 style="font-size: 0.95rem; margin-bottom: 8px; color: var(--text-muted); font-family: var(--font-mono);">3D CAD MODEL / STL VIEWER</h4>
              <a href="${auth.escapeHtml(model3d)}" target="_blank" rel="noopener" class="btn btn-secondary">
                <span class="material-symbols-outlined">view_in_ar</span> Open 3D CAD Blueprint
              </a>
            </div>
          ` : ''}

          ${!embedUrl && !model3d ? `
            <div style="padding: 32px; text-align: center; color: var(--text-muted);">
              <span class="material-symbols-outlined" style="font-size: 36px; margin-bottom: 8px;">videocam_off</span>
              <p>No video walkthrough or 3D models attached to this project.</p>
            </div>
          ` : ''}
        </div>
      `;
    }

    return '';
  }

  // --- Window Global Handlers ---

  window.handleDeleteProject = async () => {
    if (!currentProject) return;
    if (!confirm(`Are you sure you want to permanently delete "${currentProject.title}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.projects.delete(currentProject.id);
      if (window.showToast) showToast('Project deleted successfully.', 'success');
      setTimeout(() => {
        window.location.href = '/marketplace/';
      }, 700);
    } catch (e) {
      if (window.showToast) showToast(e.message || 'Failed to delete project.', 'error');
    }
  };

  window.selectHardwareTier = (idx) => {
    selectedTierIndex = idx;
    const tier = getActiveTier();
    if (!tier) return;

    // Update Tier UI classes
    document.querySelectorAll('.tier-option-card').forEach((el, i) => {
      if (i === idx) {
        el.classList.add('tier-selected');
        el.style.borderColor = 'var(--primary)';
        el.style.background = 'rgba(0, 229, 255, 0.08)';
      } else {
        el.classList.remove('tier-selected');
        el.style.borderColor = 'var(--border-subtle)';
        el.style.background = 'var(--bg-surface-low)';
      }
    });

    // Update Price display
    const priceDisplay = tier.price == 0 ? 'Free / Open-Source' : formatLKR(tier.price);
    const sidePrice = document.getElementById('sidebar-price-display');
    if (sidePrice) sidePrice.textContent = priceDisplay;

    const sideBuyBtnLabel = document.getElementById('sidebar-buy-btn-label');
    if (sideBuyBtnLabel) {
      sideBuyBtnLabel.textContent = tier.price == 0 ? 'Download Blueprint' : (tier.requires_shipping ? 'Order Hardware Kit' : 'Buy Digital Blueprint');
    }
  };

  window.switchTab = (tabName) => {
    activeTab = tabName;
    document.querySelectorAll('.project-tab-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.currentTarget) {
      event.currentTarget.classList.add('active');
    }

    const container = document.getElementById('tab-content-container');
    if (container && currentProject) {
      container.innerHTML = renderActiveTabContent(currentProject);
      if (tabName === 'code' && window.Prism) {
        setTimeout(() => window.Prism.highlightAll(), 50);
      }
    }
  };

  window.handleTierCheckout = () => {
    if (!currentUser) {
      if (window.showToast) showToast('Please log in or create an account to proceed with checkout.', 'info');
      setTimeout(() => window.location.href = `/login/?next=/project/${projectId}/`, 1000);
      return;
    }

    const tier = getActiveTier();
    if (!tier) return;

    if (tier.price == 0) {
      // Free download
      window.switchTab('files');
      if (window.showToast) showToast('Free project unlocked! Download files from the Blueprints tab.', 'success');
      return;
    }

    if (window.Payment) {
      window.Payment.openCheckout({
        projectId: currentProject.id,
        tierId: tier.id,
        tierType: tier.tier_type,
        tierName: tier.name,
        title: currentProject.title,
        price: tier.price,
        currency: tier.currency || 'LKR',
        requiresShipping: tier.requires_shipping,
        maker: currentProject.seller_username
      }, (order) => {
        window.switchTab('files');
      });
    }
  };

  window.copySourceCode = () => {
    if (!currentProject || !currentProject.source_code) return;
    navigator.clipboard.writeText(currentProject.source_code).then(() => {
      const btn = document.getElementById('copy-code-btn');
      if (btn) {
        btn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 16px;">check</span> Copied!';
        setTimeout(() => {
          btn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 16px;">content_copy</span> Copy Code';
        }, 2000);
      }
      if (window.showToast) showToast('Firmware code copied to clipboard!', 'success');
    });
  };

  window.exportBOMCSV = () => {
    if (!currentProject || !currentProject.bom_items) return;
    const items = currentProject.bom_items;
    let csv = 'Component Name,Part Number / MPN,Quantity,Estimated Unit Cost (LKR),Line Subtotal (LKR),Supplier URL\n';
    items.forEach(it => {
      const lineTotal = (it.quantity || 1) * Number(it.estimated_cost || 0);
      csv += `"${it.name.replace(/"/g, '""')}","${(it.part_number || '').replace(/"/g, '""')}",${it.quantity || 1},${it.estimated_cost || 0},${lineTotal},"${(it.supplier_url || '').replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${currentProject.slug || 'project'}_BOM.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  window.toggleFavorite = async () => {
    if (!currentUser) {
      if (window.showToast) showToast('Please log in to save favorites.', 'info');
      return;
    }
    try {
      const res = await api.favorites.toggle(currentProject.id);
      const icon = document.getElementById('fav-icon');
      const text = document.getElementById('fav-text');
      if (icon && text) {
        if (res.favorited) {
          icon.textContent = 'bookmark';
          text.textContent = 'Saved';
          if (window.showToast) showToast('Project saved to favorites!', 'success');
        } else {
          icon.textContent = 'bookmark_border';
          text.textContent = 'Save';
          if (window.showToast) showToast('Removed from favorites.', 'info');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  window.startChatWithMaker = () => {
    if (!currentUser) {
      if (window.showToast) showToast('Please log in to start a live chat.', 'info');
      setTimeout(() => window.location.href = `/login/?next=/project/${projectId}/`, 800);
      return;
    }
    if (window.CyberChat) {
      window.CyberChat.openChatWithUser(
        currentProject.seller,
        currentProject.seller_name || currentProject.seller_username,
        currentProject.id,
        currentProject.title
      );
    } else {
      window.openInquiryModal();
    }
  };

  window.openInquiryModal = () => {
    const modal = document.getElementById('inquiry-modal');
    if (modal) modal.style.display = 'flex';
  };

  window.closeInquiryModal = () => {
    const modal = document.getElementById('inquiry-modal');
    if (modal) modal.style.display = 'none';
  };

  window.handleSendInquiry = async (e) => {
    e.preventDefault();
    const msgInput = document.getElementById('inquiry-message');
    const msg = msgInput.value.trim();
    if (!msg) return;

    const btn = document.getElementById('inquiry-submit-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined spin">sync</span> Sending...';

    try {
      await api.requests.create(currentProject.id, msg);
      window.closeInquiryModal();
      msgInput.value = '';
      if (window.showToast) showToast('Inquiry sent to maker! You can also chat via the live messenger.', 'success');
    } catch (err) {
      const alert = document.getElementById('inquiry-alert');
      alert.className = 'form-alert form-alert-error';
      alert.textContent = err.message || 'Failed to send message.';
      alert.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined">send</span> Send Message';
    }
  };

  // --- Phase 3 Review & Community Make Handlers ---

  window.openReviewModal = () => {
    if (!currentUser) {
      if (window.showToast) showToast('Please log in to submit a review or community make.', 'info');
      setTimeout(() => window.location.href = `/login/?next=/project/${projectId}/`, 800);
      return;
    }
    const modal = document.getElementById('review-modal');
    if (modal) modal.style.display = 'flex';
  };

  window.closeReviewModal = () => {
    const modal = document.getElementById('review-modal');
    if (modal) modal.style.display = 'none';
  };

  window.setReviewRating = (val) => {
    currentReviewRating = val;
    const input = document.getElementById('review-rating-val');
    if (input) input.value = val;

    document.querySelectorAll('.star-select').forEach((el, idx) => {
      if (idx < val) {
        el.style.color = '#ffb700';
      } else {
        el.style.color = 'var(--border-medium)';
      }
    });
  };

  window.handleReviewSubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('review-submit-btn');
    const alert = document.getElementById('review-alert');
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined spin">sync</span> Submitting...';

    try {
      const formData = new FormData(document.getElementById('review-form'));
      formData.set('rating', currentReviewRating);

      await api.projects.reviews.submit(currentProject.id, formData);
      window.closeReviewModal();
      if (window.showToast) showToast('Review and build photo shared with the community!', 'success');

      // Reload project details
      await loadProjectDetails();
      window.switchTab('reviews');
    } catch (err) {
      if (alert) {
        alert.className = 'form-alert form-alert-error';
        alert.textContent = err.message || 'Failed to post review.';
        alert.style.display = 'block';
      }
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined">send</span> Submit Review';
    }
  };

  window.openLightbox = (imgUrl) => {
    const modal = document.getElementById('image-lightbox-modal');
    const img = document.getElementById('lightbox-img');
    if (modal && img) {
      img.src = imgUrl;
      modal.style.display = 'flex';
    }
  };

  window.closeLightbox = () => {
    const modal = document.getElementById('image-lightbox-modal');
    if (modal) modal.style.display = 'none';
  };

  async function loadProjectDetails() {
    try {
      currentUser = await auth.getUser();
    } catch (e) {
      currentUser = null;
    }

    try {
      currentProject = await api.projects.get(projectId);
      if (currentUser && currentProject.seller === currentUser.id) {
        isOwner = true;
      }
      renderProject(currentProject);
    } catch (err) {
      const container = document.getElementById('project-detail-content');
      if (container) {
        container.innerHTML = `
          <div class="card-cyber" style="padding: 48px; text-align: center;">
            <span class="material-symbols-outlined" style="font-size: 48px; color: var(--status-warning);">error</span>
            <h2 style="margin: 12px 0 8px;">Hardware Project Not Found</h2>
            <p style="color: var(--text-muted); margin-bottom: 20px;">The requested hardware project may have been moved or removed.</p>
            <a href="/marketplace/" class="btn btn-primary">Back to Hardware Directory</a>
          </div>
        `;
      }
    }
  }

  document.addEventListener('DOMContentLoaded', loadProjectDetails);
})();
