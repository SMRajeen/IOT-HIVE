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

    const config = {
      ...options,
      headers,
      credentials: 'same-origin'
    };

    try {
      const response = await fetch(url, config);

      if (response.status === 204) {
        return null;
      }

      const contentType = response.headers.get('content-type') || '';
      let data = {};
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { text };
      }

      if (!response.ok) {
        const errorMsg = data.detail || data.error || data.message || (typeof data === 'object' ? Object.values(data).flat().join(' ') : null) || `Request failed (${response.status})`;
        throw new Error(errorMsg);
      }

      return data;
    } catch (error) {
      console.error(`API Error [${options.method || 'GET'} ${url}]:`, error.message);
      throw error;
    }
  }

  // --- Authentication Endpoints ---
  auth = {
    csrf: () => this.request('auth/csrf/'),
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
    logout: () => this.request('auth/logout/', { method: 'POST' }),
    me: () => this.request('auth/me/'),
    updateProfile: (formDataOrJson) => {
      const isForm = formDataOrJson instanceof FormData;
      return this.request('auth/profile/', {
        method: 'PATCH',
        body: isForm ? formDataOrJson : JSON.stringify(formDataOrJson)
      });
    },
    passwordResetRequest: (email) => this.request('auth/password-reset/', {
      method: 'POST',
      body: JSON.stringify({ email })
    }),
    passwordResetConfirm: (uidb64, token, newPassword) => this.request('auth/password-reset-confirm/', {
      method: 'POST',
      body: JSON.stringify({ uidb64, token, new_password: newPassword })
    }),
  };

  // --- Categories Endpoints ---
  categories = {
    list: () => this.request('categories/'),
    get: (slug) => this.request(`categories/${slug}/`),
  };

  // --- Projects Endpoints ---
  projects = {
    list: (params = {}) => {
      const query = new URLSearchParams();
      Object.keys(params).forEach(k => {
        if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
          query.append(k, params[k]);
        }
      });
      const qStr = query.toString();
      return this.request(`projects/${qStr ? '?' + qStr : ''}`);
    },
    get: (id) => this.request(`projects/${id}/`),
    create: (formData) => this.request('projects/', {
      method: 'POST',
      body: formData,
    }),
    update: (id, data) => this.request(`projects/${id}/`, {
      method: 'PATCH',
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),
    delete: (id) => this.request(`projects/${id}/`, {
      method: 'DELETE'
    }),
    myProjects: () => this.request('projects/my-projects/'),
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
    create: (projectId, message) => this.request('requests/', {
      method: 'POST',
      body: JSON.stringify({ project: projectId, message })
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
  };

  // --- Admin Panel Endpoints ---
  admin = {
    stats: () => this.request('admin/stats/'),
    users: () => this.request('admin/users/'),
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
