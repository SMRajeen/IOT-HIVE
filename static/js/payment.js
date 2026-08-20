/**
 * IoT HIVE - Sri Lanka & International Card Payment Gateway
 * Supports PayHere Gateway (LKR) + Direct Visa / Mastercard / Amex Processing + Courier Delivery
 */

class PaymentGateway {
  constructor() {
    this.modalEl = null;
    this.checkoutData = null;
    this.onCompleteCallback = null;
    this.initModal();
  }

  initModal() {
    const existing = document.getElementById('payment-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'payment-modal';
    modal.style.cssText = `
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(0, 0, 0, 0.88); backdrop-filter: blur(10px);
      display: none; align-items: center; justify-content: center;
      padding: 20px;
    `;

    modal.innerHTML = `
      <div class="card-cyber" style="max-width: 580px; width: 100%; padding: 32px; background: var(--bg-surface-container); box-shadow: 0 24px 60px rgba(0,0,0,0.9); border: 1px solid var(--border-medium); border-radius: 16px; position: relative; max-height: 90vh; overflow-y: auto;">
        
        <!-- Header -->
        <div class="flex items-center justify-between" style="margin-bottom: 20px;">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined" style="color: var(--primary); font-size: 26px;">lock</span>
            <div>
              <h2 style="font-size: 1.35rem; margin: 0;">Secure Checkout</h2>
              <div class="text-xs" style="color: var(--text-muted);">256-Bit SSL Encrypted &bull; Sri Lanka &amp; Global Rails</div>
            </div>
          </div>
          <button type="button" class="btn-icon" onclick="Payment.closeModal()" style="width: 32px; height: 32px;">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <!-- Order Summary Box -->
        <div id="payment-summary-box" style="padding: 16px 20px; background: var(--bg-surface-high); border-radius: 10px; margin-bottom: 14px; border: 1px solid var(--border-subtle);">
          <div class="flex items-center justify-between" style="margin-bottom: 6px;">
            <span id="payment-project-title" style="font-weight: 700; font-size: 1.05rem; color: var(--text-primary);">Project Title</span>
            <span id="payment-project-price" class="font-mono font-bold" style="font-size: 1.3rem; color: var(--primary);">Rs. 0.00</span>
          </div>
          <div class="text-xs" style="color: var(--text-muted); display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span>Maker: <strong id="payment-maker-name" style="color: var(--text-secondary);">@maker</strong></span>
            <span id="payment-tier-label" class="hardware-chip" style="font-size: 0.72rem;">DIGITAL BLUEPRINT</span>
          </div>

          <!-- Itemized Breakdown: Base Price + 8% Escrow Fee = Total Bill -->
          <div style="background: var(--bg-surface-low); border-radius: 8px; padding: 10px 14px; font-size: 0.85rem; border-left: 3px solid var(--primary); margin-top: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: var(--text-muted);">
              <span>Hardware / Blueprint Item</span>
              <span id="fee-item-base" class="font-mono">Rs. 0.00</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: var(--primary);">
              <span style="display: flex; align-items: center; gap: 4px;">
                <span class="material-symbols-outlined" style="font-size: 14px;">verified_user</span>
                IoT HIVE Escrow &amp; SafePay (8%)
              </span>
              <span id="fee-platform-cut" class="font-mono">+Rs. 0.00</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 1px dashed var(--border-medium); padding-top: 6px; margin-top: 6px; font-weight: 700; color: var(--text-primary);">
              <span>Total Amount Payable</span>
              <span id="fee-total-bill" class="font-mono" style="color: var(--primary); font-size: 1.05rem;">Rs. 0.00</span>
            </div>
          </div>
        </div>

        <!-- SafePay Escrow Guarantee Badge -->
        <div style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: rgba(0, 255, 136, 0.06); border: 1px dashed rgba(0, 255, 136, 0.3); border-radius: 8px; margin-bottom: 16px; font-size: 0.8rem; color: #00ff88;">
          <span class="material-symbols-outlined" style="font-size: 18px;">lock_clock</span>
          <span><strong>IoT HIVE SafePay™ Escrow:</strong> Payment is held securely until prototype delivery is verified.</span>
        </div>

        <!-- Checkout View Container -->
        <div id="checkout-view-container">
          
          <!-- Shipping Address Section (Displayed for Physical Kit / Assembled Tiers) -->
          <div id="shipping-section-box" style="display: none; margin-bottom: 20px; padding: 16px; background: var(--bg-surface-low); border-radius: 10px; border: 1px solid var(--border-subtle);">
            <div style="font-weight: 600; font-size: 0.92rem; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; color: var(--primary);">
              <span class="material-symbols-outlined" style="font-size: 18px;">local_shipping</span>
              Sri Lanka Delivery Address
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
              <input type="text" id="ship-name" class="input-cyber" placeholder="Recipient Full Name *" required style="padding: 8px 12px; font-size: 0.88rem;">
              <input type="tel" id="ship-phone" class="input-cyber" placeholder="Mobile Phone (07xxxxxxxx) *" required style="padding: 8px 12px; font-size: 0.88rem;">
            </div>

            <div style="margin-bottom: 12px;">
              <input type="text" id="ship-address" class="input-cyber" placeholder="Street Address / House No / Road *" required style="padding: 8px 12px; font-size: 0.88rem;">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
              <select id="ship-city" class="input-cyber" style="padding: 8px 10px; font-size: 0.85rem; background: var(--bg-surface-high);">
                <option value="Colombo">Colombo</option>
                <option value="Gampaha">Gampaha</option>
                <option value="Kalutara">Kalutara</option>
                <option value="Kandy">Kandy</option>
                <option value="Galle">Galle</option>
                <option value="Matara">Matara</option>
                <option value="Kurunegala">Kurunegala</option>
                <option value="Jaffna">Jaffna</option>
                <option value="Anuradhapura">Anuradhapura</option>
                <option value="Other">Other City</option>
              </select>

              <select id="ship-district" class="input-cyber" style="padding: 8px 10px; font-size: 0.85rem; background: var(--bg-surface-high);">
                <option value="Western Province">Western</option>
                <option value="Central Province">Central</option>
                <option value="Southern Province">Southern</option>
                <option value="North Western">North Western</option>
                <option value="Northern Province">Northern</option>
                <option value="Eastern Province">Eastern</option>
                <option value="Sabaragamuwa">Sabaragamuwa</option>
                <option value="Uva Province">Uva</option>
              </select>

              <input type="text" id="ship-postal" class="input-cyber" placeholder="Postal Code" style="padding: 8px 10px; font-size: 0.85rem;" value="00100">
            </div>
          </div>

          <!-- Payment Tabs -->
          <div style="display: flex; gap: 8px; margin-bottom: 18px; border-bottom: 1px solid var(--border-medium); padding-bottom: 8px;">
            <button type="button" id="tab-card-btn" class="btn btn-secondary btn-sm active" onclick="Payment.switchMethod('card')" style="flex: 1; justify-content: center; font-size: 0.88rem;">
              <span class="material-symbols-outlined" style="font-size: 18px;">credit_card</span>
              Visa / Mastercard
            </button>
            <button type="button" id="tab-payhere-btn" class="btn btn-ghost btn-sm" onclick="Payment.switchMethod('payhere')" style="flex: 1; justify-content: center; font-size: 0.88rem;">
              <span class="material-symbols-outlined" style="font-size: 18px;">account_balance_wallet</span>
              PayHere Sri Lanka
            </button>
          </div>

          <!-- Tab Content 1: Direct Card Checkout -->
          <div id="method-card-container">
            <form onsubmit="Payment.processCardCharge(event)">
              <div id="card-alert-box" style="display: none; margin-bottom: 14px;"></div>

              <div class="input-group" style="margin-bottom: 14px;">
                <label class="input-label" style="font-size: 0.82rem;">Cardholder Name *</label>
                <input type="text" id="card-name" class="input-cyber" placeholder="Name as printed on card" required style="padding: 8px 12px; font-size: 0.88rem;">
              </div>

              <div class="input-group" style="margin-bottom: 14px;">
                <label class="input-label" style="font-size: 0.82rem; display: flex; justify-content: space-between;">
                  <span>Card Number *</span>
                  <span id="card-brand-badge" class="tag-mono text-xs" style="color: var(--primary);">VISA / MASTER</span>
                </label>
                <input type="text" id="card-number" class="input-cyber" placeholder="4111 2222 3333 4444" maxlength="19" required oninput="Payment.formatCardInput(this)" style="padding: 8px 12px; font-family: var(--font-mono); font-size: 0.95rem;">
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px;">
                <div class="input-group">
                  <label class="input-label" style="font-size: 0.82rem;">Expiry Date *</label>
                  <input type="text" id="card-expiry" class="input-cyber" placeholder="MM/YY" maxlength="5" required oninput="Payment.formatExpiry(this)" style="padding: 8px 12px; font-family: var(--font-mono); font-size: 0.88rem;">
                </div>

                <div class="input-group">
                  <label class="input-label" style="font-size: 0.82rem;">Security Code (CVV) *</label>
                  <input type="password" id="card-cvv" class="input-cyber" placeholder="123" maxlength="4" required style="padding: 8px 12px; font-family: var(--font-mono); font-size: 0.88rem;">
                </div>
              </div>

              <button type="submit" id="card-submit-btn" class="btn btn-primary btn-lg" style="width: 100%; justify-content: center;">
                <span class="material-symbols-outlined">payments</span>
                Pay <span id="card-pay-btn-label">Rs. 0.00</span>
              </button>
            </form>
          </div>

          <!-- Tab Content 2: PayHere Sri Lanka -->
          <div id="method-payhere-container" style="display: none; text-align: center; padding: 12px 0;">
            <div style="padding: 20px; background: rgba(0, 229, 255, 0.05); border: 1px solid rgba(0, 229, 255, 0.2); border-radius: 10px; margin-bottom: 20px;">
              <div style="font-weight: 700; font-size: 1.1rem; color: var(--primary); margin-bottom: 6px;">PayHere Sri Lanka Checkout</div>
              <p style="color: var(--text-muted); font-size: 0.88rem; line-height: 1.5; margin: 0;">
                Pay securely using your local Sri Lankan credit/debit card, Genie, Frimi, eZ Cash, or mCash via the central bank certified gateway.
              </p>
            </div>

            <button type="button" id="payhere-submit-btn" class="btn btn-primary btn-lg" onclick="Payment.processPayHere()" style="width: 100%; justify-content: center;">
              <span class="material-symbols-outlined">open_in_new</span>
              Continue to PayHere Gateway
            </button>
          </div>

        </div>

        <!-- Success Confirmation View -->
        <div id="payment-success-view" style="display: none; text-align: center; padding: 12px 0;">
          <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(0, 255, 136, 0.15); border: 1px solid #00ff88; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: #00ff88;">
            <span class="material-symbols-outlined" style="font-size: 36px;">check_circle</span>
          </div>

          <h3 style="font-size: 1.45rem; margin-bottom: 8px;">Payment Successful!</h3>
          <p style="color: var(--text-muted); font-size: 0.92rem; margin-bottom: 20px;" id="success-msg-label">
            Your transaction has been verified. Your hardware order is confirmed!
          </p>

          <div style="padding: 16px; background: var(--bg-surface-high); border-radius: 10px; margin-bottom: 24px; text-align: left; border: 1px solid var(--border-subtle); font-size: 0.88rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span style="color: var(--text-muted);">Transaction ID:</span>
              <strong id="success-txn-id" class="font-mono" style="color: var(--primary);">HIVE-LK-...</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span style="color: var(--text-muted);">Status:</span>
              <span class="hardware-chip" style="background: rgba(0,255,136,0.15); color: #00ff88;">PAID &amp; CONFIRMED</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Fulfillment:</span>
              <span id="success-fulfillment-type" style="color: var(--text-primary);">Instant Digital Access</span>
            </div>
          </div>

          <div class="flex items-center justify-center gap-3">
            <button type="button" class="btn btn-secondary" onclick="Payment.closeModal()">Close</button>
            <a href="/dashboard/" class="btn btn-primary">
              <span class="material-symbols-outlined">dashboard</span>
              View Orders in Dashboard
            </a>
          </div>
        </div>

      </div>
    `;

    document.body.appendChild(modal);
    this.modalEl = modal;
  }

  openCheckout(data, onComplete) {
    this.checkoutData = data;
    this.onCompleteCallback = onComplete;

    const modal = document.getElementById('payment-modal');
    if (!modal) this.initModal();

    // Reset views
    document.getElementById('checkout-view-container').style.display = 'block';
    document.getElementById('payment-success-view').style.display = 'none';

    // Populate Info
    const currency = data.currency || 'LKR';
    const baseAmount = Number(data.price || 0);
    const platformCut = Math.round(baseAmount * 0.08 * 100) / 100;
    const totalPayable = Math.round((baseAmount + platformCut) * 100) / 100;
    this.checkoutData.totalPayable = totalPayable;

    const baseStr = currency === 'LKR' ? `Rs. ${baseAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : `$${baseAmount.toFixed(2)} USD`;
    const cutStr = currency === 'LKR' ? `+Rs. ${platformCut.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : `+$${platformCut.toFixed(2)}`;
    const totalStr = currency === 'LKR' ? `Rs. ${totalPayable.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : `$${totalPayable.toFixed(2)} USD`;

    document.getElementById('payment-project-title').textContent = data.title || 'Hardware Blueprint';
    document.getElementById('payment-project-price').textContent = totalStr;
    document.getElementById('payment-maker-name').textContent = `@${data.maker || 'creator'}`;
    document.getElementById('payment-tier-label').textContent = (data.tierName || (data.tierType || 'Digital Blueprint')).toUpperCase();
    document.getElementById('card-pay-btn-label').textContent = totalStr;

    // Calculate Itemized Platform Take-Rate & Total Bill (Escrow increases total)
    const feeItemBaseEl = document.getElementById('fee-item-base');
    const feePlatformCutEl = document.getElementById('fee-platform-cut');
    const feeTotalBillEl = document.getElementById('fee-total-bill');

    if (feeItemBaseEl) feeItemBaseEl.textContent = baseStr;
    if (feePlatformCutEl) feePlatformCutEl.textContent = cutStr;
    if (feeTotalBillEl) feeTotalBillEl.textContent = totalStr;

    // Toggle Shipping form if physical tier
    const isPhysical = data.requiresShipping || data.tierType === 'kit' || data.tierType === 'assembled';
    const shippingBox = document.getElementById('shipping-section-box');
    if (shippingBox) {
      shippingBox.style.display = isPhysical ? 'block' : 'none';
      if (isPhysical) {
        document.getElementById('ship-name').required = true;
        document.getElementById('ship-phone').required = true;
        document.getElementById('ship-address').required = true;
      } else {
        document.getElementById('ship-name').required = false;
        document.getElementById('ship-phone').required = false;
        document.getElementById('ship-address').required = false;
      }
    }

    this.switchMethod('card');
    this.modalEl.style.display = 'flex';
  }

  closeModal() {
    if (this.modalEl) this.modalEl.style.display = 'none';
  }

  switchMethod(method) {
    const cardBtn = document.getElementById('tab-card-btn');
    const payhereBtn = document.getElementById('tab-payhere-btn');
    const cardCont = document.getElementById('method-card-container');
    const payhereCont = document.getElementById('method-payhere-container');

    if (method === 'card') {
      cardBtn.classList.add('active', 'btn-secondary');
      cardBtn.classList.remove('btn-ghost');
      payhereBtn.classList.remove('active', 'btn-secondary');
      payhereBtn.classList.add('btn-ghost');
      cardCont.style.display = 'block';
      payhereCont.style.display = 'none';
    } else {
      payhereBtn.classList.add('active', 'btn-secondary');
      payhereBtn.classList.remove('btn-ghost');
      cardBtn.classList.remove('active', 'btn-secondary');
      cardBtn.classList.add('btn-ghost');
      cardCont.style.display = 'none';
      payhereCont.style.display = 'block';
    }
  }

  formatCardInput(input) {
    let v = input.value.replace(/\D/g, '');
    v = v.replace(/(\d{4})(?=\d)/g, '$1 ');
    input.value = v.substring(0, 19);

    const badge = document.getElementById('card-brand-badge');
    if (badge) {
      if (v.startsWith('4')) badge.textContent = 'VISA';
      else if (v.startsWith('5') || v.startsWith('2')) badge.textContent = 'MASTERCARD';
      else if (v.startsWith('3')) badge.textContent = 'AMEX';
      else badge.textContent = 'CARD';
    }
  }

  formatExpiry(input) {
    let v = input.value.replace(/\D/g, '');
    if (v.length >= 2) {
      v = v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    input.value = v.substring(0, 5);
  }

  async processCardCharge(event) {
    event.preventDefault();
    const btn = document.getElementById('card-submit-btn');
    const alertBox = document.getElementById('card-alert-box');

    const cardName = document.getElementById('card-name').value.trim();
    const cardNumber = document.getElementById('card-number').value.trim();
    const cardExpiry = document.getElementById('card-expiry').value.trim();
    const cardCvv = document.getElementById('card-cvv').value.trim();

    const isPhysical = this.checkoutData.requiresShipping || this.checkoutData.tierType === 'kit' || this.checkoutData.tierType === 'assembled';
    const shipName = document.getElementById('ship-name')?.value.trim() || cardName;
    const shipPhone = document.getElementById('ship-phone')?.value.trim() || '';
    const shipAddress = document.getElementById('ship-address')?.value.trim() || '';
    const shipCity = document.getElementById('ship-city')?.value || 'Colombo';
    const shipDistrict = document.getElementById('ship-district')?.value || 'Western';
    const shipPostal = document.getElementById('ship-postal')?.value || '00100';

    if (isPhysical && (!shipPhone || !shipAddress)) {
      alertBox.className = 'form-alert form-alert-error';
      alertBox.textContent = 'Please enter your Sri Lanka delivery address and contact phone number.';
      alertBox.style.display = 'block';
      return;
    }

    alertBox.style.display = 'none';
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined spin" style="font-size: 18px;">sync</span> Processing Authorization...';

    try {
      const payload = {
        project_id: this.checkoutData.projectId,
        tier_id: this.checkoutData.tierId || null,
        card_name: cardName,
        card_number: cardNumber,
        card_expiry: cardExpiry,
        card_cvv: cardCvv,
        payment_method: 'Visa / Mastercard',
        shipping_full_name: shipName,
        shipping_phone: shipPhone,
        shipping_address: shipAddress,
        shipping_city: shipCity,
        shipping_district: shipDistrict,
        shipping_postal_code: shipPostal
      };

      const result = await API.payments.cardCharge(payload);

      // Render Confirmation
      document.getElementById('checkout-view-container').style.display = 'none';
      document.getElementById('payment-success-view').style.display = 'block';
      document.getElementById('success-txn-id').textContent = result.order?.transaction_id || 'HIVE-LK-CONFIRMED';
      document.getElementById('success-fulfillment-type').textContent = isPhysical ? `Shipped to ${shipCity}, Sri Lanka` : 'Instant Download Unlocked';

      if (window.showToast) {
        showToast('Payment successful! Order confirmed.', 'success');
      }

      if (this.onCompleteCallback) {
        this.onCompleteCallback(result.order);
      }
    } catch (err) {
      alertBox.className = 'form-alert form-alert-error';
      alertBox.textContent = err.message || 'Card authorization failed. Please verify card details.';
      alertBox.style.display = 'block';
    } finally {
      btn.disabled = false;
      const totalAmount = Number(this.checkoutData.totalPayable || this.checkoutData.price || 0);
      const cur = this.checkoutData.currency || 'LKR';
      btn.innerHTML = `<span class="material-symbols-outlined">payments</span> Pay ${cur === 'LKR' ? `Rs. ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `$${totalAmount.toFixed(2)}`}`;
    }
  }

  async processPayHere() {
    const btn = document.getElementById('payhere-submit-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined spin" style="font-size: 18px;">sync</span> Generating PayHere Gateway Session...';

    try {
      const isPhysical = this.checkoutData.requiresShipping || this.checkoutData.tierType === 'kit' || this.checkoutData.tierType === 'assembled';
      const shipName = document.getElementById('ship-name')?.value.trim() || 'Valued Maker';
      const shipPhone = document.getElementById('ship-phone')?.value.trim() || '0770000000';
      const shipAddress = document.getElementById('ship-address')?.value.trim() || 'Colombo, Sri Lanka';
      const shipCity = document.getElementById('ship-city')?.value || 'Colombo';

      const payload = {
        project_id: this.checkoutData.projectId,
        tier_id: this.checkoutData.tierId || null,
        shipping_full_name: shipName,
        shipping_phone: shipPhone,
        shipping_address: shipAddress,
        shipping_city: shipCity
      };

      const payData = await API.payments.payhereInitiate(payload);

      // Auto-submit PayHere payment via dynamic form or mock simulation
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = payData.sandbox ? 'https://sandbox.payhere.lk/pay/checkout' : 'https://www.payhere.lk/pay/checkout';
      form.target = '_blank';

      Object.keys(payData).forEach(key => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = payData[key];
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);

      // Display post-submission instructions
      document.getElementById('checkout-view-container').style.display = 'none';
      document.getElementById('payment-success-view').style.display = 'block';
      document.getElementById('success-txn-id').textContent = payData.order_id;
      document.getElementById('success-msg-label').textContent = 'PayHere checkout window opened. Your order will update automatically once authorized.';
      document.getElementById('success-fulfillment-type').textContent = isPhysical ? `Delivery to ${shipCity}` : 'Digital Download';
    } catch (err) {
      if (window.showToast) showToast(err.message || 'PayHere gateway session error', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined">open_in_new</span> Continue to PayHere Gateway';
    }
  }
}

// Global instance
window.Payment = new PaymentGateway();
