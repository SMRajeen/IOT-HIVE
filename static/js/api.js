/**
 * IoT HIVE - Centralized REST API Client
 * Compatible with window.API and window.IoTHiveAPI
 */

class ApiClient {
  constructor() {
    this.baseUrl = '/api/';
    this.csrfToken = this.getCookie('csrftoken');
  }

  getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }

  resolveUrl(value) {
    if (!value) return '';
    if (typeof value !== 'string') return value;
    if (value.startsWith('http://') || value.startsWith('https://')) return value;
    try {
      return new URL(value, window.location.origin).href;
    } catch {
      return value;
    }
  }

  async fetchCsrf() {
    try {
      const resp = await fetch('/api/auth/csrf/', { credentials: 'same-origin' });
      const data = await resp.json();
      if (data && data.csrfToken) {
        this.csrfToken = data.csrfToken;
      }
    } catch (e) {
      console.warn('CSRF token fetch note:', e);
    }
    return this.csrfToken;
  }

  async request(endpoint, options = {}) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    const url = `${this.baseUrl}${cleanEndpoint}`;
    const headers = options.headers || {};

    if (!this.csrfToken) {
      this.csrfToken = this.getCookie('csrftoken');
      if (!this.csrfToken) {
        await this.fetchCsrf();
      }
    }

    if (this.csrfToken) {
      headers['X-CSRFToken'] = this.csrfToken;
    }

    const isFormData = options.body instanceof FormData;
    if (!isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    let requestBody = options.body;
    if (requestBody !== undefined && requestBody !== null && typeof requestBody === 'object' && !isFormData) {
      requestBody = JSON.stringify(requestBody);
    }

    const config = {
      ...options,
      body: requestBody,
      headers,
      credentials: 'same-origin',
    };

    try {
      const response = await fetch(url, config);

      if (response.status === 204) {
        return null;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = data.detail || data.message || Object.values(data)[0] || 'An error occurred';
        const err = new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
        err.status = response.status;
        err.data = data;
        throw err;
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // --- Authentication Endpoints ---
  auth = {
    csrf: () => this.request('auth/csrf/'),
    me: () => this.request('auth/me/'),
    login: (usernameOrCredentials, password) => {
      let payload;
      if (typeof usernameOrCredentials === 'object' && usernameOrCredentials !== null) {
        payload = usernameOrCredentials;
      } else {
        payload = { username: usernameOrCredentials, password: password };
      }
      return this.request('auth/login/', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    register: (userData) => this.request('auth/register/', {
      method: 'POST',
      body: JSON.stringify(userData)
    }),
    logout: () => this.request('auth/logout/', {
      method: 'POST'
    }),
    updateProfile: (data) => this.request('auth/profile/', {
      method: 'PATCH',
      body: data instanceof FormData ? data : JSON.stringify(data)
    }),
    deleteAccount: (password) => this.request('auth/delete-account/', {
      method: 'POST',
      body: JSON.stringify({ password })
    }),
    socialLogin: (socialData) => this.request('auth/social-login/', {
      method: 'POST',
      body: JSON.stringify(socialData)
    }),
    passwordResetRequest: (email) => this.request('auth/password-reset/', {
      method: 'POST',
      body: JSON.stringify({ email })
    }),
    passwordResetConfirm: (uidb64, token, newPassword) => this.request('auth/password-reset-confirm/', {
      method: 'POST',
      body: JSON.stringify({ uidb64, token, new_password: newPassword })
    }),
  };

  // --- Category Endpoints ---
  categories = {
    list: () => this.request('categories/'),
    get: (slug) => this.request(`categories/${slug}/`),
    create: (data) => this.request('categories/', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    delete: (slugOrId) => this.request(`categories/${slugOrId}/`, {
      method: 'DELETE'
    }),
  };

  // --- Projects Endpoints ---
  projects = {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return this.request(`projects/${query ? '?' + query : ''}`);
    },
    get: (id) => this.request(`projects/${id}/`),
    create: (formData) => this.request('projects/', {
      method: 'POST',
      body: formData
    }),
    update: (id, formData) => this.request(`projects/${id}/`, {
      method: 'PATCH',
      body: formData
    }),
    delete: (id) => this.request(`projects/${id}/`, {
      method: 'DELETE'
    }),
    myProjects: () => this.request('projects/my-projects/'),
    reviews: {
      list: (projectId) => this.request(`projects/${projectId}/reviews/`),
      submit: (projectId, formData) => this.request(`projects/${projectId}/reviews/`, {
        method: 'POST',
        body: formData instanceof FormData ? formData : JSON.stringify(formData)
      }),
    },
  };

  // --- Favorites Endpoints ---
  favorites = {
    list: () => this.request('favorites/'),
    toggle: (projectId) => this.request('favorites/toggle/', {
      method: 'POST',
      body: JSON.stringify({ project: projectId })
    }),
    remove: (id) => this.request(`favorites/${id}/`, { method: 'DELETE' }),
  };

  // --- Inquiries & Requests Endpoints ---
  requests = {
    list: () => this.request('requests/'),
    sent: () => this.request('requests/sent/'),
    received: () => this.request('requests/received/'),
    create: (projectId, message) => this.request('requests/', {
      method: 'POST',
      body: JSON.stringify({ project: projectId, requirements: message, message: message })
    }),
    reply: (id, replyText) => this.request(`requests/${id}/reply/`, {
      method: 'POST',
      body: JSON.stringify({ reply: replyText })
    }),
    updateStatus: (id, status) => this.request(`requests/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }),
  };

  // --- Orders & Payment Gateway Endpoints ---
  orders = {
    list: () => this.request('orders/'),
    create: (data) => this.request('orders/', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    get: (id) => this.request(`orders/${id}/`),
    updateShipping: (id, data) => this.request(`orders/${id}/update_shipping/`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),
  };

  // --- Payments Endpoints ---
  payments = {
    payhereInitiate: (data) => this.request('payments/payhere/initiate/', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    cardCharge: (data) => this.request('payments/card-charge/', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  };

  // --- Bounties & Custom Hardware Commissions (Phase 3) ---
  bounties = {
    list: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return this.request(`bounties/${query ? '?' + query : ''}`);
    },
    stats: () => this.request('bounties/stats/'),
    myBounties: () => this.request('bounties/my-bounties/'),
    awardedBounties: () => this.request('bounties/awarded-bounties/'),
    get: (id) => this.request(`bounties/${id}/`),
    create: (data) => this.request('bounties/', {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data)
    }),
    updateStatus: (bountyId, status) => this.request(`bounties/${bountyId}/update-status/`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }),
    delete: (id) => this.request(`bounties/${id}/`, {
      method: 'DELETE'
    }),
    submitProposal: (bountyId, data) => this.request(`bounties/${bountyId}/submit_proposal/`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    acceptProposal: (bountyId, proposalId) => this.request(`bounties/${bountyId}/accept_proposal/`, {
      method: 'POST',
      body: JSON.stringify({ proposal_id: proposalId })
    }),
  };


  // --- Real Phone Number SMS & Event Notifications (Phase 4) ---
  notifications = {
    testSMS: (phoneNumber = '') => this.request('notifications/test-sms/', {
      method: 'POST',
      body: JSON.stringify({ phone_number: phoneNumber })
    }),
    logs: () => this.request('notifications/logs/'),
    updatePreferences: (data) => this.request('notifications/preferences/', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  };

  // --- Real-Time Chat & Direct In-App Messaging (Phase 3) ---
  chat = {
    conversations: () => this.request('chat/conversations/'),
    messages: (userId, projectId = null, bountyId = null) => {
      let q = `user_id=${userId}`;
      if (projectId) q += `&project_id=${projectId}`;
      if (bountyId) q += `&bounty_id=${bountyId}`;
      return this.request(`chat/messages/?${q}`);
    },
    send: (recipientId, message, projectId = null, bountyId = null) => this.request('chat/send/', {
      method: 'POST',
      body: JSON.stringify({
        recipient_id: recipientId,
        message: message,
        project_id: projectId,
        bounty_id: bountyId,
      })
    }),
    unreadCount: () => this.request('chat/unread-count/'),
  };

  // --- Admin Panel Endpoints ---
  admin = {
    stats: () => this.request('admin/stats/'),
    users: () => this.request('admin/users/'),
    createUser: (userData) => this.request('admin/users/', {
      method: 'POST',
      body: JSON.stringify(userData)
    }),
    updateUser: (id, data) => this.request(`admin/users/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),
    deleteUser: (id) => this.request(`admin/users/${id}/`, {
      method: 'DELETE'
    }),
    projects: () => this.request('admin/projects/'),
    updateProject: (id, data) => this.request(`admin/projects/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),
    deleteProject: (id) => this.request(`admin/projects/${id}/`, {
      method: 'DELETE'
    }),
    orders: () => this.request('admin/orders/'),
  };
}

// Instantiate and expose on all global namespaces
const apiClientInstance = new ApiClient();
window.API = apiClientInstance;
window.IoTHiveAPI = apiClientInstance;
