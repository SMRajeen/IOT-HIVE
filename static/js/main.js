(() => {
  'use strict';

  const api = window.IoTHiveAPI;
  const auth = window.IoTHiveAuth;

  if (!api || !auth) {
    console.error('[IoT Hive] API or Auth module not available.');
    return;
  }

  const page = document.body.dataset.page;


  /*
   * ============================================================
   * HELPERS
   * ============================================================
   */

  function iconFor(category, index) {
    return category.icon ||
      ['⌁', '◉', '⌬', '△', '▣', '◇', '◌', '✦'][index % 8];
  }


  function projectImage(project) {
    return project.images?.[0]?.image
      ? api.resolveUrl(project.images[0].image)
      : '';
  }


  function card(project) {
    const image = projectImage(project);
    const category = project.category_name || 'Uncategorized';

    return `
      <a
        class="project-card"
        href="/project/?id=${encodeURIComponent(project.id)}"
      >

        <div class="project-thumb">

          ${
            image
              ? `
                <img
                  loading="lazy"
                  src="${image}"
                  alt="${auth.escapeHtml(project.title)}"
                >
              `
              : `
                <div class="project-placeholder">
                  IOT / PROJECT
                </div>
              `
          }

          ${
            project.featured
              ? '<span class="project-badge">Featured</span>'
              : ''
          }

        </div>


        <div class="project-body">

          <div class="project-meta">

            <span>
              ${auth.escapeHtml(category)}
            </span>

            <span>
              ${project.is_free ? 'Free' : 'Build / Buy'}
            </span>

          </div>


          <h3>
            ${auth.escapeHtml(project.title)}
          </h3>


          <p>
            ${auth.escapeHtml(
              project.short_description || ''
            )}
          </p>


          <div class="project-foot">

            <span class="price">

              ${
                project.is_free
                  ? 'FREE'
                  : `$${Number(project.price || 0).toFixed(2)}`
              }

            </span>

            <span>
              VIEW ↗
            </span>

          </div>

        </div>

      </a>
    `;
  }


  /*
   * ============================================================
   * HOME — CATEGORIES
   * ============================================================
   */

  async function loadCategories() {

    const host =
      document.querySelector('[data-categories]');

    if (!host) return;

    try {

      const data =
        await api.request('categories/');

      const categories =
        Array.isArray(data)
          ? data
          : data.results || [];


      if (!categories.length) {

        host.innerHTML =
          '<div class="state-card">No categories have been published yet.</div>';

        return;
      }


      host.innerHTML =
        categories
          .slice(0, 12)
          .map(
            (cat, i) => `
              <a
                class="category-card"
                href="/marketplace/?category=${encodeURIComponent(cat.slug)}"
              >

                <span class="category-index">
                  0${i + 1}
                </span>


                <div class="category-icon">
                  ${auth.escapeHtml(iconFor(cat, i))}
                </div>


                <h3>
                  ${auth.escapeHtml(cat.name)}
                </h3>


                <p>
                  ${Number(cat.project_count || 0)}
                  project${Number(cat.project_count || 0) === 1 ? '' : 's'}
                </p>

              </a>
            `
          )
          .join('');

    } catch (error) {

      host.innerHTML = `
        <div class="state-card">
          Categories unavailable.
          ${auth.escapeHtml(error.message)}
        </div>
      `;

    }
  }


  /*
   * ============================================================
   * HOME — FEATURED PROJECTS
   * ============================================================
   */

  async function loadFeatured() {

    const host =
      document.querySelector('[data-featured-projects]');

    if (!host) return;

    try {

      const data =
        await api.request('projects/?featured=true');

      const projects =
        Array.isArray(data)
          ? data
          : data.results || [];


      const count =
        document.querySelector(
          '[data-hero-project-count]'
        );


      if (count) {

        count.textContent =
          projects.length
            ? `${projects.length}+`
            : '—';

      }


      if (!projects.length) {

        host.innerHTML =
          '<div class="state-card">No featured projects are live yet. Publish the first signal.</div>';

        return;
      }


      host.innerHTML =
        projects
          .slice(0, 6)
          .map(card)
          .join('');

    } catch (error) {

      host.innerHTML = `
        <div class="state-card">
          Featured projects unavailable.
          ${auth.escapeHtml(error.message)}
        </div>
      `;

    }
  }


  /*
   * ============================================================
   * PROFILE
   * ============================================================
   */

  async function loadProfile() {

    const host =
      document.querySelector('[data-profile-card]');

    if (!host) return;


    const user =
      await auth.requireAuth();

    if (!user) return;


    const fullName =
      [user.first_name, user.last_name]
        .filter(Boolean)
        .join(' ') ||
      user.username;


    const avatar =
      user.avatar
        ? `
          <img
            src="${api.resolveUrl(user.avatar)}"
            alt="${auth.escapeHtml(fullName)}"
          >
        `
        : `
          <span>
            ${auth.escapeHtml(
              fullName.slice(0, 1).toUpperCase()
            )}
          </span>
        `;


    host.innerHTML = `

      <div class="profile-shell">

        <aside class="profile-aside">

          <div class="avatar">
            ${avatar}
          </div>


          <div>

            <h2>
              ${auth.escapeHtml(fullName)}
            </h2>

            <p>
              @${auth.escapeHtml(user.username)}
            </p>

          </div>

        </aside>


        <div class="profile-details">

          <div class="detail-grid">

            <div class="detail-cell">

              <span>
                EMAIL
              </span>

              <strong>
                ${auth.escapeHtml(user.email || '—')}
              </strong>

            </div>


            <div class="detail-cell">

              <span>
                ROLE
              </span>

              <strong>
                ${auth.escapeHtml(user.role || '—')}
              </strong>

            </div>


            <div class="detail-cell">

              <span>
                LOCATION
              </span>

              <strong>
                ${auth.escapeHtml(
                  user.location || 'Not set'
                )}
              </strong>

            </div>


            <div class="detail-cell">

              <span>
                WEBSITE
              </span>

              ${
                user.website
                  ? `
                    <a
                      href="${auth.escapeHtml(user.website)}"
                      target="_blank"
                      rel="noopener"
                    >
                      ${auth.escapeHtml(user.website)}
                    </a>
                  `
                  : `
                    <strong>
                      Not set
                    </strong>
                  `
              }

            </div>

          </div>


          <div class="bio-block">

            <span class="eyebrow">
              BIO
            </span>

            <p>
              ${auth.escapeHtml(
                user.bio ||
                'No profile bio has been added yet.'
              )}
            </p>

          </div>

        </div>

      </div>
    `;
  }


  /*
   * ============================================================
   * DASHBOARD
   * ============================================================
   */

  async function loadDashboard() {

    if (
      !document.querySelector(
        '[data-dashboard-projects]'
      )
    ) {
      return;
    }


    const user =
      await auth.requireAuth();

    if (!user) return;


    const projectsHost =
      document.querySelector(
        '[data-dashboard-projects]'
      );


    const requestsHost =
      document.querySelector(
        '[data-request-list]'
      );


    let projects = [];
    let requests = [];
    let categories = [];


    try {

      projects =
        await api.request(
          'projects/my-projects/'
        );

      projects =
        Array.isArray(projects)
          ? projects
          : projects.results || [];

    } catch (error) {

      if (projectsHost) {

        projectsHost.innerHTML = `
          <div class="state-card">
            Projects unavailable.
            ${auth.escapeHtml(error.message)}
          </div>
        `;

      }

    }


    try {

      requests =
        await api.request(
          'requests/'
        );

      requests =
        Array.isArray(requests)
          ? requests
          : requests.results || [];

    } catch (error) {

      if (requestsHost) {

        requestsHost.innerHTML = `
          <div class="state-card">
            Requests unavailable.
            ${auth.escapeHtml(error.message)}
          </div>
        `;

      }

    }


    try {

      categories =
        await api.request(
          'categories/'
        );

      categories =
        Array.isArray(categories)
          ? categories
          : categories.results || [];

    } catch {

      categories = [];

    }


    const stats =
      document.querySelectorAll(
        '[data-dashboard-stats] .stat-card strong'
      );


    if (stats.length >= 4) {

      stats[0].textContent =
        projects.length;


      stats[1].textContent =
        projects.reduce(
          (sum, p) =>
            sum + Number(p.views || 0),
          0
        );


      stats[2].textContent =
        projects.filter(
          p => p.featured
        ).length;


      stats[3].textContent =
        requests.length;

    }


    if (projectsHost) {

      projectsHost.innerHTML =
        projects.length

          ? projects
              .map(
                p => `
                  <div class="dashboard-row">

                    <div>

                      <h3>
                        ${auth.escapeHtml(p.title)}
                      </h3>

                      <small>
                        ${auth.escapeHtml(
                          p.category_name ||
                          'Uncategorized'
                        )}
                      </small>

                    </div>


                    <span class="row-stat">
                      ${Number(p.views || 0)}
                      VIEWS
                    </span>


                    <span class="row-stat">

                      ${
                        p.is_free
                          ? 'FREE'
                          : `$${Number(
                              p.price || 0
                            ).toFixed(2)}`
                      }

                    </span>


                    <span class="status-pill ${auth.escapeHtml(
                      p.status || ''
                    )}">

                      ${auth.escapeHtml(
                        p.status || ''
                      )}

                    </span>


                    <div class="row-actions">

                      <button
                        class="mini-button"
                        type="button"
                        data-edit-project="${p.id}"
                      >
                        EDIT
                      </button>


                      <a
                        class="mini-button"
                        href="/project/?id=${encodeURIComponent(p.id)}"
                      >
                        VIEW
                      </a>


                      <button
                        class="mini-button danger"
                        type="button"
                        data-delete-project="${p.id}"
                      >
                        DELETE
                      </button>

                    </div>

                  </div>
                `
              )
              .join('')

          : `
            <div class="state-card">
              You have not created any projects yet.
            </div>
          `;
    }


    if (requestsHost) {

      const inbound =
        requests.filter(
          r =>
            projects.some(
              p =>
                Number(p.id) ===
                Number(r.project)
            )
        );


      requestsHost.innerHTML =
        inbound.length

          ? inbound
              .map(
                r => `
                  <article class="request-row">

                    <div>

                      <div class="request-meta">

                        FROM
                        ${auth.escapeHtml(
                          r.buyer_name || 'BUYER'
                        )}

                        ·

                        ${auth.escapeHtml(
                          r.status || 'pending'
                        )}

                      </div>


                      <h3>
                        ${auth.escapeHtml(
                          r.project_title ||
                          'Project request'
                        )}
                      </h3>


                      <p>
                        ${auth.escapeHtml(
                          r.message ||
                          'No message supplied.'
                        )}
                      </p>

                    </div>


                    <span class="status-pill ${auth.escapeHtml(
                      r.status || 'pending'
                    )}">

                      ${auth.escapeHtml(
                        r.status || 'pending'
                      )}

                    </span>

                  </article>
                `
              )
              .join('')

          : `
            <div class="state-card">
              No incoming project requests yet.
            </div>
          `;
    }


    setupDashboardActions(
      projects,
      categories
    );
  }


  /*
   * ============================================================
   * DASHBOARD CRUD
   * ============================================================
   */

  function setupDashboardActions(
    projects,
    categories
  ) {

    const editPanel =
      document.querySelector(
        '[data-edit-panel]'
      );


    const form =
      document.querySelector(
        '[data-edit-form]'
      );


    if (!editPanel || !form) {

      setupDashboardDeleteButtons();
      return;

    }


    const categorySelect =
      form.querySelector(
        '[data-edit-category]'
      );


    if (categorySelect) {

      categorySelect.innerHTML =
        categories
          .map(
            c => `
              <option value="${c.id}">
                ${auth.escapeHtml(c.name)}
              </option>
            `
          )
          .join('');

    }


    document
      .querySelectorAll(
        '[data-edit-project]'
      )
      .forEach(button => {

        button.addEventListener(
          'click',
          event => {

            event.preventDefault();

            const project =
              projects.find(
                p =>
                  Number(p.id) ===
                  Number(
                    button.dataset.editProject
                  )
              );


            if (!project) return;


            form.elements.id.value =
              project.id;


            form.elements.title.value =
              project.title || '';


            form.elements.category.value =
              project.category || '';


            form.elements.short_description.value =
              project.short_description || '';


            form.elements.description.value =
              project.description || '';


            form.elements.price.value =
              project.price || 0;


            form.elements.status.value =
              project.status || 'draft';


            form.elements.is_free.checked =
              Boolean(project.is_free);


            editPanel.hidden = false;


            editPanel.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });

          }
        );

      });


    document
      .querySelector(
        '[data-cancel-edit]'
      )
      ?.addEventListener(
        'click',
        () => {

          editPanel.hidden = true;

        }
      );


    form.addEventListener(
      'submit',
      async event => {

        event.preventDefault();


        const id =
          form.elements.id.value;


        const message =
          document.querySelector(
            '[data-edit-message]'
          );


        auth.setMessage(
          message,
          ''
        );


        const button =
          form.querySelector(
            'button[type="submit"]'
          );


        auth.setBusy(
          button,
          true
        );


        try {

          await api.request(
            `projects/${id}/`,
            {
              method: 'PUT',

              body: {

                title:
                  form.elements.title.value,

                category:
                  Number(
                    form.elements.category.value
                  ),

                short_description:
                  form.elements.short_description.value,

                description:
                  form.elements.description.value,

                price:
                  form.elements.is_free.checked
                    ? 0
                    : Number(
                        form.elements.price.value || 0
                      ),

                is_free:
                  form.elements.is_free.checked,

                status:
                  form.elements.status.value

              }
            }
          );


          auth.setMessage(
            message,
            'Project updated.',
            true
          );


          setTimeout(
            () => window.location.reload(),
            500
          );


        } catch (error) {

          auth.setMessage(
            message,
            error.message
          );


        } finally {

          auth.setBusy(
            button,
            false
          );

        }

      }
    );


    setupDashboardDeleteButtons();

  }


  function setupDashboardDeleteButtons() {

    document
      .querySelectorAll(
        '[data-delete-project]'
      )
      .forEach(button => {

        button.addEventListener(
          'click',
          async event => {

            event.preventDefault();
            event.stopPropagation();


            const projectId =
              button.dataset.deleteProject;


            if (!projectId) return;


            const confirmed =
              confirm(
                'Delete this project? This cannot be undone.'
              );


            if (!confirmed) {
              return;
            }


            button.disabled = true;


            try {

              await api.request(
                `projects/${encodeURIComponent(projectId)}/`,
                {
                  method: 'DELETE'
                }
              );


              window.location.reload();


            } catch (error) {

              alert(
                error.message ||
                'Unable to delete project.'
              );


              button.disabled = false;

            }

          }
        );

      });

  }


  /*
   * ============================================================
   * CREATE PROJECT
   * ============================================================
   */

  async function setupCreateProject() {

    const form =
      document.querySelector(
        '[data-create-project-form]'
      );


    if (!form) return;


    const user =
      await auth.requireAuth();


    if (!user) return;


    const categorySelect =
      form.querySelector(
        '[data-create-category]'
      );


    const message =
      document.querySelector(
        '[data-create-message]'
      );


    try {

      const data =
        await api.request(
          'categories/'
        );


      const categories =
        Array.isArray(data)
          ? data
          : data.results || [];


      categorySelect.innerHTML =
        '<option value="">Select category</option>' +

        categories
          .map(
            c => `
              <option value="${c.id}">
                ${auth.escapeHtml(c.name)}
              </option>
            `
          )
          .join('');


    } catch (error) {

      categorySelect.innerHTML =
        '<option value="">Categories unavailable</option>';


      auth.setMessage(
        message,
        error.message
      );

    }


    form.addEventListener(
      'submit',
      async event => {

        event.preventDefault();


        auth.setMessage(
          message,
          ''
        );


        if (!form.reportValidity()) {
          return;
        }


        const submit =
          form.querySelector(
            'button[type="submit"]'
          );


        auth.setBusy(
          submit,
          true
        );


        try {

          const payload = {

            title:
              form.elements.title.value,

            category:
              Number(
                form.elements.category.value
              ),

            short_description:
              form.elements.short_description.value,

            description:
              form.elements.description.value,

            price:
              form.elements.is_free.checked
                ? 0
                : Number(
                    form.elements.price.value || 0
                  ),

            is_free:
              form.elements.is_free.checked,

            status:
              form.elements.status.value

          };


          const project =
            await api.request(
              'projects/',
              {
                method: 'POST',
                body: payload
              }
            );


          const files =
            form.elements.images?.files
              ? [...form.elements.images.files]
              : [];


          for (const file of files) {

            const fd =
              new FormData();


            fd.append(
              'project',
              project.id
            );


            fd.append(
              'image',
              file
            );


            await api.request(
              'project-images/',
              {
                method: 'POST',
                body: fd
              }
            );

          }


          if (
            form.elements.video_url &&
            form.elements.video_url.value.trim()
          ) {

            await api.request(
              'project-videos/',
              {
                method: 'POST',

                body: {

                  project:
                    project.id,

                  video_url:
                    form.elements.video_url.value.trim(),

                  title:
                    ''

                }

              }
            );

          }


          if (
            form.elements.model_url &&
            form.elements.model_url.value.trim()
          ) {

            await api.request(
              'project-models-3d/',
              {
                method: 'POST',

                body: {

                  project:
                    project.id,

                  model_url:
                    form.elements.model_url.value.trim(),

                  title:
                    ''

                }

              }
            );

          }


          auth.setMessage(
            message,
            'Project created. Opening it now…',
            true
          );


          setTimeout(
            () => {

              window.location.href =
                `/project/?id=${encodeURIComponent(project.id)}`;

            },
            500
          );


        } catch (error) {

          auth.setMessage(
            message,
            error.message
          );


        } finally {

          auth.setBusy(
            submit,
            false
          );

        }

      }
    );

  }


  /*
   * ============================================================
   * PROJECT DETAIL
   * ============================================================
   */

  async function loadProjectDetail() {

    const host =
      document.querySelector(
        '[data-project-detail]'
      );


    if (!host) return;


    const params =
      new URLSearchParams(
        window.location.search
      );


    const projectId =
      params.get('id');


    if (!projectId) {

      host.innerHTML = `
        <div class="page-container">

          <div class="state-card">
            Project ID is missing.
          </div>

        </div>
      `;

      return;
    }


    try {

      const project =
        await api.request(
          `projects/${encodeURIComponent(projectId)}/`
        );


      await renderProjectDetail(
        host,
        project
      );


    } catch (error) {

      host.innerHTML = `
        <div class="page-container">

          <div class="state-card">

            <strong>
              Project unavailable.
            </strong>

            <br>

            ${auth.escapeHtml(
              error.message
            )}

          </div>

        </div>
      `;

    }

  }


  /*
   * ============================================================
   * PROJECT DETAIL RENDER
   * ============================================================
   */

  async function renderProjectDetail(
    host,
    project
  ) {

    const images =
      Array.isArray(project.images)
        ? project.images
        : [];


    const firstImage =
      images.length &&
      images[0].image
        ? api.resolveUrl(
            images[0].image
          )
        : '';


    const category =
      project.category_name ||
      'Uncategorized';


    const sellerName =
      project.seller_name ||
      project.seller_username ||
      'Seller';


    let currentUser = null;


    try {

      currentUser =
        await api.getCurrentUser();

    } catch {

      currentUser = null;

    }


    const isOwner =
      Boolean(
        currentUser &&
        project.seller &&
        Number(currentUser.id) ===
        Number(project.seller)
      );


    /*
     * VIDEO
     *
     * Serializer returns:
     *
     * {
     *   id,
     *   video_url,
     *   title
     * }
     */

    const videoUrl =
      project.video &&
      project.video.video_url
        ? api.resolveUrl(
            project.video.video_url
          )
        : '';


    /*
     * 3D MODEL
     *
     * Serializer returns:
     *
     * {
     *   id,
     *   model_url,
     *   title
     * }
     */

    const model3DUrl =
      project.model_3d &&
      project.model_3d.model_url
        ? api.resolveUrl(
            project.model_3d.model_url
          )
        : '';


    let actionHtml = '';


    /*
     * ==========================================================
     * OWNER ACTIONS
     * ==========================================================
     */

    if (isOwner) {

      actionHtml = `

        <div class="project-owner-actions">

          <button
            class="button button-primary"
            type="button"
            data-project-edit
          >
            EDIT PROJECT
          </button>


          <button
            class="button button-danger"
            type="button"
            data-project-delete
          >
            DELETE PROJECT
          </button>

        </div>


        <div
          class="project-edit-panel"
          data-project-edit-panel
          hidden
        >

          <div class="section-heading compact">

            <div>

              <p class="eyebrow">

                <span></span>

                EDIT NODE

              </p>


              <h2>

                UPDATE

                <strong>
                  PROJECT.
                </strong>

              </h2>

            </div>


            <button
              class="button button-ghost"
              type="button"
              data-project-edit-cancel
            >
              CLOSE
            </button>

          </div>


          <form data-project-edit-form>


            <div class="form-grid-two">

              <label>

                Title

                <input
                  name="title"
                  maxlength="200"
                  required
                  value="${auth.escapeHtml(
                    project.title || ''
                  )}"
                >

              </label>


              <label>

                Category

                <select
                  name="category"
                  data-project-edit-category
                  required
                >
                </select>

              </label>

            </div>


            <label>

              Short description

              <input
                name="short_description"
                maxlength="300"
                required
                value="${auth.escapeHtml(
                  project.short_description || ''
                )}"
              >

            </label>


            <label>

              Description

              <textarea
                name="description"
                rows="8"
                required
              >${auth.escapeHtml(
                project.description || ''
              )}</textarea>

            </label>


            <div class="form-grid-two">

              <label>

                Price

                <input
                  type="number"
                  name="price"
                  min="0"
                  step="0.01"
                  value="${Number(
                    project.price || 0
                  )}"
                >

              </label>


              <label>

                Status

                <select name="status">

                  <option
                    value="draft"
                    ${
                      project.status === 'draft'
                        ? 'selected'
                        : ''
                    }
                  >
                    Draft
                  </option>


                  <option
                    value="published"
                    ${
                      project.status === 'published'
                        ? 'selected'
                        : ''
                    }
                  >
                    Published
                  </option>


                  <option
                    value="sold"
                    ${
                      project.status === 'sold'
                        ? 'selected'
                        : ''
                    }
                  >
                    Sold
                  </option>


                  <option
                    value="archived"
                    ${
                      project.status === 'archived'
                        ? 'selected'
                        : ''
                    }
                  >
                    Archived
                  </option>

                </select>

              </label>

            </div>


            <label class="check-field">

              <input
                type="checkbox"
                name="is_free"
                ${
                  project.is_free
                    ? 'checked'
                    : ''
                }
              >

              <span>
                Mark as free
              </span>

            </label>


            <div
              class="form-message"
              data-project-edit-message
              role="alert"
            ></div>


            <button
              class="button button-primary"
              type="submit"
            >
              SAVE CHANGES
            </button>


          </form>

        </div>

      `;

    }


    /*
     * ==========================================================
     * BUYER ACTION
     * ==========================================================
     */

    else if (currentUser) {

      actionHtml = `

        <button
          class="button button-primary"
          type="button"
          data-open-request
          data-project-title="${auth.escapeHtml(
            project.title || ''
          )}"
        >
          REQUEST PROJECT
        </button>

      `;

    }


    /*
     * ==========================================================
     * LOGGED OUT ACTION
     * ==========================================================
     */

    else {

      actionHtml = `

        <a
          class="button button-primary"
          href="/login/?next=${encodeURIComponent(
            window.location.pathname +
            window.location.search
          )}"
        >
          LOGIN TO REQUEST
        </a>

      `;

    }


    /*
     * ==========================================================
     * PROJECT MEDIA ACTIONS
     * ==========================================================
     */

    const mediaButtonsHtml = `

      ${
        videoUrl
          ? `
            <a
              class="button button-primary"
              href="${auth.escapeHtml(videoUrl)}"
              target="_blank"
              rel="noopener noreferrer"
            >
              WATCH VIDEO
            </a>
          `
          : ''
      }


      ${
        model3DUrl
          ? `
            <a
              class="button button-ghost"
              href="${auth.escapeHtml(model3DUrl)}"
              target="_blank"
              rel="noopener noreferrer"
            >
              VIEW 3D MODEL
            </a>
          `
          : ''
      }

    `;


    /*
     * ==========================================================
     * MAIN HTML
     * ==========================================================
     */

    host.innerHTML = `

      <div class="page-container">


        <div class="project-detail-layout">


          <div class="project-detail-content">


            <!-- MEDIA -->

            <div class="project-detail-media">

              <div class="project-image-glow"></div>


              <div class="project-main-image">

                ${
                  firstImage
                    ? `
                      <img
                        src="${auth.escapeHtml(firstImage)}"
                        alt="${auth.escapeHtml(
                          project.title
                        )}"
                        data-main-project-image
                      >
                    `
                    : `
                      <div class="project-placeholder">
                        IOT / PROJECT
                      </div>
                    `
                }

              </div>


              ${
                images.length > 1
                  ? `
                    <div class="project-image-gallery">

                      ${images
                        .map(
                          (item, index) => {

                            const imageUrl =
                              item.image
                                ? api.resolveUrl(
                                    item.image
                                  )
                                : '';


                            return `

                              <button
                                type="button"
                                class="project-gallery-thumb ${
                                  index === 0
                                    ? 'active'
                                    : ''
                                }"
                                data-gallery-image="${auth.escapeHtml(
                                  imageUrl
                                )}"
                              >

                                <img
                                  src="${auth.escapeHtml(
                                    imageUrl
                                  )}"
                                  alt="${auth.escapeHtml(
                                    project.title
                                  )} image ${index + 1}"
                                >

                              </button>

                            `;

                          }
                        )
                        .join('')}

                    </div>
                  `
                  : ''
              }

            </div>


            <!-- PROJECT INFORMATION -->

            <div class="project-detail-copy">


              <p class="eyebrow">

                <span></span>

                ${auth.escapeHtml(category)}

              </p>


              <h1>

                ${auth.escapeHtml(
                  project.title
                )}

              </h1>


              <p class="project-detail-lead">

                ${auth.escapeHtml(
                  project.short_description || ''
                )}

              </p>


              <div class="project-detail-description">

                <h2>
                  ABOUT THIS PROJECT
                </h2>

                <p>

                  ${auth.escapeHtml(
                    project.description || ''
                  )}

                </p>

              </div>


              <div class="project-detail-meta">


                <div>

                  <span>
                    SELLER
                  </span>

                  <strong>

                    ${auth.escapeHtml(
                      sellerName
                    )}

                  </strong>

                </div>


                <div>

                  <span>
                    VIEWS
                  </span>

                  <strong>

                    ${Number(
                      project.views || 0
                    )}

                  </strong>

                </div>


                <div>

                  <span>
                    CATEGORY
                  </span>

                  <strong>

                    ${auth.escapeHtml(
                      category
                    )}

                  </strong>

                </div>


              </div>


              <div class="project-detail-price">

                ${
                  project.is_free
                    ? 'FREE'
                    : `$${Number(
                        project.price || 0
                      ).toFixed(2)}`
                }

              </div>


              <!-- VIDEO / 3D -->

              ${
                videoUrl || model3DUrl
                  ? `
                    <div
                      class="project-detail-actions"
                      style="
                        display:flex;
                        flex-wrap:wrap;
                        gap:12px;
                        margin-top:24px;
                      "
                    >

                      ${mediaButtonsHtml}

                    </div>
                  `
                  : ''
              }


              <!-- OWNER / REQUEST -->

              <div
                class="project-detail-actions"
                style="
                  display:flex;
                  flex-wrap:wrap;
                  gap:12px;
                  margin-top:24px;
                "
              >

                ${actionHtml}

              </div>


            </div>


          </div>


        </div>


      </div>

    `;


    /*
     * ==========================================================
     * IMAGE GALLERY
     * ==========================================================
     */

    const mainImage =
      host.querySelector(
        '[data-main-project-image]'
      );


    const thumbnails =
      host.querySelectorAll(
        '[data-gallery-image]'
      );


    thumbnails.forEach(
      thumbnail => {

        thumbnail.addEventListener(
          'click',
          event => {

            event.preventDefault();


            const imageUrl =
              thumbnail.dataset.galleryImage;


            if (
              mainImage &&
              imageUrl
            ) {

              mainImage.src =
                imageUrl;

            }


            thumbnails.forEach(
              item => {

                item.classList.remove(
                  'active'
                );

              }
            );


            thumbnail.classList.add(
              'active'
            );

          }
        );

      }
    );


    /*
     * ==========================================================
     * OWNER CRUD
     * ==========================================================
     */

    if (isOwner) {

      setupProjectOwnerActions(
        host,
        project
      );

    }

  }


  /*
   * ============================================================
   * PROJECT OWNER EDIT / DELETE
   * ============================================================
   */

  async function setupProjectOwnerActions(
    host,
    project
  ) {

    const editButton =
      host.querySelector(
        '[data-project-edit]'
      );


    const deleteButton =
      host.querySelector(
        '[data-project-delete]'
      );


    const editPanel =
      host.querySelector(
        '[data-project-edit-panel]'
      );


    const cancelButton =
      host.querySelector(
        '[data-project-edit-cancel]'
      );


    const form =
      host.querySelector(
        '[data-project-edit-form]'
      );


    /*
     * EDIT OPEN
     */

    if (
      editButton &&
      editPanel
    ) {

      editButton.addEventListener(
        'click',
        async event => {

          event.preventDefault();


          editPanel.hidden = false;


          editPanel.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });


          const categorySelect =
            form?.querySelector(
              '[data-project-edit-category]'
            );


          if (
            categorySelect &&
            !categorySelect.children.length
          ) {

            try {

              const data =
                await api.request(
                  'categories/'
                );


              const categories =
                Array.isArray(data)
                  ? data
                  : data.results || [];


              categorySelect.innerHTML =
                categories
                  .map(
                    category => `
                      <option
                        value="${category.id}"
                        ${
                          Number(category.id) ===
                          Number(project.category)
                            ? 'selected'
                            : ''
                        }
                      >
                        ${auth.escapeHtml(
                          category.name
                        )}
                      </option>
                    `
                  )
                  .join('');


            } catch {

              categorySelect.innerHTML = `
                <option value="">
                  Categories unavailable
                </option>
              `;

            }

          }

        }
      );

    }


    /*
     * EDIT CLOSE
     */

    if (cancelButton) {

      cancelButton.addEventListener(
        'click',
        event => {

          event.preventDefault();

          editPanel.hidden = true;

        }
      );

    }


    /*
     * SAVE EDIT
     */

    if (form) {

      form.addEventListener(
        'submit',
        async event => {

          event.preventDefault();


          const message =
            form.querySelector(
              '[data-project-edit-message]'
            );


          const button =
            form.querySelector(
              'button[type="submit"]'
            );


          auth.setMessage(
            message,
            ''
          );


          if (!form.reportValidity()) {
            return;
          }


          auth.setBusy(
            button,
            true
          );


          try {

            await api.request(
              `projects/${encodeURIComponent(project.id)}/`,
              {
                method: 'PUT',

                body: {

                  title:
                    form.elements.title.value,

                  category:
                    Number(
                      form.elements.category.value
                    ),

                  short_description:
                    form.elements.short_description.value,

                  description:
                    form.elements.description.value,

                  price:
                    form.elements.is_free.checked
                      ? 0
                      : Number(
                          form.elements.price.value || 0
                        ),

                  is_free:
                    form.elements.is_free.checked,

                  status:
                    form.elements.status.value

                }

              }
            );


            auth.setMessage(
              message,
              'Project updated successfully.',
              true
            );


            setTimeout(
              () => {
                window.location.reload();
              },
              600
            );


          } catch (error) {

            auth.setMessage(
              message,
              error.message
            );


          } finally {

            auth.setBusy(
              button,
              false
            );

          }

        }
      );

    }


    /*
     * DELETE
     */

    if (deleteButton) {

      deleteButton.addEventListener(
        'click',
        async event => {

          event.preventDefault();


          const confirmed =
            confirm(
              `Delete "${project.title}"?\n\nThis cannot be undone.`
            );


          if (!confirmed) {
            return;
          }


          deleteButton.disabled = true;


          try {

            await api.request(
              `projects/${encodeURIComponent(project.id)}/`,
              {
                method: 'DELETE'
              }
            );


            window.location.href =
              '/dashboard/';


          } catch (error) {

            alert(
              `Unable to delete project.\n\n${
                error.message ||
                'Unknown error.'
              }`
            );


            deleteButton.disabled = false;

          }

        }
      );

    }

  }


  /*
   * ============================================================
   * REQUEST MODAL
   * ============================================================
   */

  function setupRequestModal() {

    const modal =
      document.querySelector(
        '[data-request-modal]'
      );


    if (!modal) {

      console.error(
        '[IoT Hive] Request modal not found.'
      );

      return;

    }


    const form =
      modal.querySelector(
        '[data-request-form]'
      );


    const closeButtons =
      modal.querySelectorAll(
        '[data-modal-close]'
      );


    /*
     * OPEN
     */

    function openModal(projectTitle) {

      const projectName =
        modal.querySelector(
          '[data-request-project-name]'
        );


      if (projectName) {

        projectName.textContent =
          projectTitle ||
          'Project';

      }


      const message =
        modal.querySelector(
          '[data-request-message]'
        );


      if (message) {

        auth.setMessage(
          message,
          ''
        );

      }


      modal.setAttribute(
        'aria-hidden',
        'false'
      );


      /*
       * Make sure the modal is actually visible.
       * This also handles CSS that depends on display.
       */

      modal.style.display =
        'flex';

      modal.style.visibility =
        'visible';

      modal.style.opacity =
        '1';

      modal.style.pointerEvents =
        'auto';


      document.body.style.overflow =
        'hidden';


      const textarea =
        form?.querySelector(
          'textarea[name="message"]'
        );


      if (textarea) {

        setTimeout(
          () => textarea.focus(),
          100
        );

      }

    }


    /*
     * CLOSE
     */

    function closeModal() {

      modal.setAttribute(
        'aria-hidden',
        'true'
      );


      modal.style.display =
        '';

      modal.style.visibility =
        '';

      modal.style.opacity =
        '';

      modal.style.pointerEvents =
        '';


      document.body.style.overflow =
        '';


      if (form) {

        form.reset();

      }


      const message =
        modal.querySelector(
          '[data-request-message]'
        );


      if (message) {

        auth.setMessage(
          message,
          ''
        );

      }

    }


    /*
     * CLOSE BUTTONS
     */

    closeButtons.forEach(
      button => {

        button.addEventListener(
          'click',
          event => {

            event.preventDefault();
            event.stopPropagation();

            closeModal();

          }
        );

      }
    );


    /*
     * CLICK BACKDROP
     */

    modal.addEventListener(
      'click',
      event => {

        if (
          event.target === modal
        ) {

          closeModal();

        }

      }
    );


    /*
     * ESC
     */

    document.addEventListener(
      'keydown',
      event => {

        if (
          event.key === 'Escape' &&
          modal.getAttribute(
            'aria-hidden'
          ) === 'false'
        ) {

          closeModal();

        }

      }
    );


    /*
     * REQUEST BUTTON
     *
     * Event delegation is important because
     * the button is created dynamically by
     * renderProjectDetail().
     */

    document.addEventListener(
      'click',
      event => {

        const requestButton =
          event.target.closest(
            '[data-open-request]'
          );


        if (!requestButton) {
          return;
        }


        event.preventDefault();
        event.stopPropagation();


        const projectTitle =
          requestButton.dataset.projectTitle ||
          document
            .querySelector(
              '[data-project-detail] h1'
            )
            ?.textContent
            ?.trim() ||
          'Project';


        openModal(
          projectTitle
        );

      }
    );


    /*
     * SUBMIT
     */

    if (form) {

      form.addEventListener(
        'submit',
        async event => {

          event.preventDefault();


          const message =
            modal.querySelector(
              '[data-request-message]'
            );


          const projectId =
            new URLSearchParams(
              window.location.search
            ).get('id');


          if (!projectId) {

            auth.setMessage(
              message,
              'Project ID is missing.'
            );

            return;

          }


          const user =
            await auth.requireAuth();


          if (!user) {
            return;
          }


          const submitButton =
            form.querySelector(
              'button[type="submit"]'
            );


          const requestMessage =
            form.elements.message.value.trim();


          if (!requestMessage) {

            auth.setMessage(
              message,
              'Please enter a message.'
            );

            return;

          }


          auth.setMessage(
            message,
            ''
          );


          auth.setBusy(
            submitButton,
            true
          );


          try {

            await api.request(
              'requests/',
              {
                method: 'POST',

                body: {

                  project:
                    Number(projectId),

                  message:
                    requestMessage

                }

              }
            );


            auth.setMessage(
              message,
              'Request sent successfully.',
              true
            );


            form.reset();


            setTimeout(
              () => {

                closeModal();

              },
              1000
            );


          } catch (error) {

            console.error(
              '[IoT Hive] Request failed:',
              error
            );


            auth.setMessage(
              message,
              error.message ||
              'Unable to send request.'
            );


          } finally {

            auth.setBusy(
              submitButton,
              false
            );

          }

        }
      );

    }

  }


  /*
   * ============================================================
   * INITIALIZE
   * ============================================================
   */

  document.addEventListener(
    'DOMContentLoaded',
    async () => {

      if (page === 'home') {

        loadCategories();
        loadFeatured();

      }


      if (page === 'profile') {

        loadProfile();

      }


      if (page === 'dashboard') {

        loadDashboard();

      }


      if (page === 'create-project') {

        setupCreateProject();

      }


      if (page === 'project') {

        /*
         * Initialize modal FIRST.
         *
         * The request button itself is created later
         * by renderProjectDetail().
         */
        setupRequestModal();

        await loadProjectDetail();

      }

    }
  );

})();