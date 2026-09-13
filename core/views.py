from django.shortcuts import render, get_object_or_404
from marketplace.models import Category, Project

from marketplace.serializers import ProjectSerializer
from rest_framework.renderers import JSONRenderer
from django.db.models import Avg, Count

def home_view(request):
    return render(request, "frontend/index.html")

def marketplace_view(request):
    return render(request, "frontend/marketplace.html")

def categories_view(request):
    return render(request, "frontend/categories.html")

def project_detail_view(request, pk=None):
    initial_project_json = "null"
    if pk:
        try:
            project = (
                Project.objects.filter(pk=pk)
                .select_related("seller", "seller__profile", "category", "video", "model_3d")
                .prefetch_related("tiers", "bom_items", "attachments", "images", "reviews__user", "reviews__user__profile")
                .annotate(
                    _avg_rating=Avg('reviews__rating'),
                    _review_count=Count('reviews', distinct=True),
                    _bom_count=Count('bom_items', distinct=True),
                )
                .first()
            )
            if project:
                user = request.user
                if project.status == "published" or (user.is_authenticated and (user == project.seller or user.is_staff or user.is_superuser)):
                    serializer = ProjectSerializer(project, context={"request": request})
                    initial_project_json = JSONRenderer().render(serializer.data).decode("utf-8")
        except Exception as e:
            initial_project_json = "null"

    return render(request, "frontend/project-detail.html", {
        "project_id": pk,
        "initial_project_json": initial_project_json
    })

def create_project_view(request):
    return render(request, "frontend/create-project.html")

def about_view(request):
    return render(request, "frontend/about.html")

def dashboard_view(request):
    return render(request, "frontend/dashboard.html")

def project_requests_view(request):
    return render(request, "frontend/project-requests.html")

def favorites_view(request):
    return render(request, "frontend/favorites.html")

def profile_view(request):
    return render(request, "frontend/profile.html")

def login_view(request):
    return render(request, "frontend/login.html")

def register_view(request):
    return render(request, "frontend/register.html")

def admin_panel_view(request):
    return render(request, "frontend/admin-panel.html")

def bounties_view(request):
    return render(request, "frontend/bounties.html")

def privacy_policy_view(request):
    return render(request, "frontend/privacy-policy.html")

def promo_view(request):
    return render(request, "frontend/promo.html")