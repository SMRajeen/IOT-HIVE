from django.urls import path
from .views import (
     register,
     login_view,
     logout_view,
     current_user,
     csrf_token,
     profile_view,
     password_reset_request,
     password_reset_confirm,
     delete_account,
     social_login,
)

urlpatterns = [
     path("register/", register, name="register"),
     path("login/", login_view, name="login"),
     path("logout/", logout_view, name="logout"),
     path("me/", current_user, name="current-user"),
     path("profile/", profile_view, name="profile-api"),
     path("csrf/", csrf_token, name="csrf-token"),
     path("delete-account/", delete_account, name="delete-account"),
     path("social-login/", social_login, name="social-login"),
     path("password-reset/", password_reset_request, name="password-reset-request"),
     path("password-reset-confirm/", password_reset_confirm, name="password-reset-confirm"),
]

