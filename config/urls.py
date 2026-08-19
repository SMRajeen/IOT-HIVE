from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static

from core import views as core_views

urlpatterns = [
    # Django Admin
    path("admin/", admin.site.urls),

    # Authentication & Profile REST API
    path("api/auth/", include("accounts.urls")),

    # Marketplace REST API
    path("api/", include("marketplace.urls")),

    # Frontend Web Views
    path("", core_views.home_view, name="home"),
    path("marketplace/", core_views.marketplace_view, name="marketplace"),
    path("categories/", core_views.categories_view, name="categories"),
    path("bounties/", core_views.bounties_view, name="bounties"),
    path("project/", core_views.project_detail_view, name="project"),
    path("project/<int:pk>/", core_views.project_detail_view, name="project-detail-pk"),
    path("create-project/", core_views.create_project_view, name="create-project"),
    path("about/", core_views.about_view, name="about"),
    path("how-it-works/", core_views.about_view, name="how-it-works"),
    path("dashboard/", core_views.dashboard_view, name="dashboard"),
    path("requests/", core_views.project_requests_view, name="requests"),
    path("project-requests/", core_views.project_requests_view, name="project-requests"),
    path("favorites/", core_views.favorites_view, name="favorites"),
    path("profile/", core_views.profile_view, name="profile"),
    path("login/", core_views.login_view, name="login"),
    path("register/", core_views.register_view, name="register"),
    path("admin-panel/", core_views.admin_panel_view, name="admin-panel"),
    path("privacy-policy/", core_views.privacy_policy_view, name="privacy-policy"),
]

if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT
    )
