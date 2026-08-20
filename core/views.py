from django.shortcuts import render, get_object_or_404
from marketplace.models import Category, Project

def home_view(request):
    return render(request, "frontend/index.html")

def marketplace_view(request):
    return render(request, "frontend/marketplace.html")

def categories_view(request):
    return render(request, "frontend/categories.html")

def project_detail_view(request, pk=None):
    return render(request, "frontend/project-detail.html", {"project_id": pk})

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