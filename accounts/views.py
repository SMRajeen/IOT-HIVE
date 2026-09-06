import json
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.utils.text import slugify
from django.db.models import Q
from django.middleware.csrf import get_token

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import AnonRateThrottle
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response

from .models import UserProfile
from .serializers import UserSerializer, UserProfileSerializer


class AuthAnonRateThrottle(AnonRateThrottle):
    scope = 'auth_anon'


def _get_request_data(request):
    """Safely extracts dictionary payload from request.data."""
    data = getattr(request, "data", {})
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except Exception:
            data = {}
    if not isinstance(data, dict):
        data = {}
    return data


@api_view(["GET"])
@permission_classes([AllowAny])
def csrf_token(request):
    return Response({
        "csrfToken": get_token(request)
    })


def _generate_unique_username(last_name, first_name="", email=""):
    """Auto-generates a unique username derived from last name with collision fallback."""
    base = slugify(last_name or "").replace("-", "")
    if not base:
        base = slugify(first_name or "").replace("-", "")
    if not base and email:
        base = slugify(email.split("@")[0]).replace("-", "")
    if not base:
        base = "maker"
    
    base = base.lower()
    username = base
    counter = 1
    while User.objects.filter(username__iexact=username).exists():
        username = f"{base}-{counter}"
        counter += 1
    return username


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AuthAnonRateThrottle])
def register(request):
    data = _get_request_data(request)
    first_name = data.get("first_name", "").strip()
    last_name = data.get("last_name", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "")
    role = data.get("role", "both")
    username = data.get("username", "").strip()

    if not email:
        return Response(
            {"detail": "Please enter an email address."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not password:
        return Response(
            {"detail": "Please enter a password."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if len(password) < 6:
        return Response(
            {"detail": "Password must be at least 6 characters long."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if User.objects.filter(email__iexact=email).exists():
        return Response(
            {"detail": "An account with this email already exists."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Auto-generate unique username if not manually specified
    if not username:
        username = _generate_unique_username(last_name, first_name, email)
    elif User.objects.filter(username__iexact=username).exists():
        return Response(
            {"detail": "This username is already taken. Please choose another one."},
            status=status.HTTP_400_BAD_REQUEST
        )

    valid_roles = ["buyer", "seller", "both"]
    if role not in valid_roles:
        role = "both"

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
    )

    UserProfile.objects.create(
        user=user,
        role=role,
    )

    return Response(
        {
            "message": "Your account has been created successfully! Please sign in with your credentials.",
            "username": user.username,
            "email": user.email,
        },
        status=status.HTTP_201_CREATED
    )


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AuthAnonRateThrottle])
def login_view(request):
    data = _get_request_data(request)
    identifier = (data.get("username") or data.get("email") or "").strip()
    password = data.get("password", "")

    if not identifier or not password:
        return Response(
            {"detail": "Please enter your username/email and password."},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = None
    if "@" in identifier:
        user = User.objects.filter(email__iexact=identifier).first()
        if user:
            user = authenticate(request, username=user.username, password=password)
    else:
        user = authenticate(request, username=identifier, password=password)

    if not user:
        return Response(
            {"detail": "Invalid credentials. Please verify your username/email and password."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # Ensure profile exists for users created via CLI / createsuperuser
    UserProfile.objects.get_or_create(
        user=user,
        defaults={"role": "admin" if (user.is_staff or user.is_superuser) else "both"}
    )

    login(request, user)
    return Response(
        {
            "message": f"Welcome back, {user.first_name or user.username}!",
            "user": UserSerializer(user).data,
        }
    )


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AuthAnonRateThrottle])
def password_reset_request(request):
    """Initiates a password reset flow securely via email."""
    data = _get_request_data(request)
    identifier = (data.get("email") or data.get("username") or data.get("identifier") or "").strip()

    if not identifier:
        return Response(
            {"detail": "Please enter your registered username or email address."},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = User.objects.filter(
        Q(email__iexact=identifier) | Q(username__iexact=identifier)
    ).first()

    if user and user.email:
        uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        reset_url = request.build_absolute_uri(f"/login/?reset_uid={uidb64}&reset_token={token}")

        subject = "IoT HIVE - Password Reset Request"
        message_body = (
            f"Hello @{user.username},\n\n"
            f"We received a request to reset your password on IoT HIVE.\n\n"
            f"Please click the secure link below to choose a new password:\n"
            f"{reset_url}\n\n"
            f"If you did not request a password reset, please ignore this email. Your account remains secure.\n\n"
            f"— The IoT HIVE Team"
        )
        html_message = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background-color: #080c14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #080c14; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="540" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; background-color: #0f172a; border: 1px solid rgba(0, 229, 255, 0.3); border-radius: 16px; padding: 36px 30px; box-shadow: 0 10px 40px rgba(0,0,0,0.6);">
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <span style="font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">IoT <span style="color: #00e5ff;">HIVE</span></span>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 12px;">
              <h2 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">Password Reset Request</h2>
            </td>
          </tr>
          <tr>
            <td style="color: #94a3b8; font-size: 15px; line-height: 1.6; padding-bottom: 24px; text-align: center;">
              Hello <strong style="color: #f1f5f9;">@{user.username}</strong>,<br>
              We received a request to reset your password on IoT HIVE. Please click the button below to choose a new password:
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 28px;">
              <a href="{reset_url}" target="_blank" style="background: linear-gradient(135deg, #0066ff 0%, #00e5ff 100%); color: #ffffff; padding: 14px 32px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 15px; display: inline-block; box-shadow: 0 4px 18px rgba(0, 229, 255, 0.4);">
                Reset Password
              </a>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid rgba(148, 163, 184, 0.15); padding-top: 20px; color: #64748b; font-size: 13px; line-height: 1.5; text-align: center;">
              If you did not request this password reset, please ignore this email. Your account remains secure.<br><br>
              If the button above does not work, copy and paste this URL into your browser:<br>
              <a href="{reset_url}" style="color: #00e5ff; word-break: break-all;">{reset_url}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
        try:
            from django.core.mail import send_mail
            from django.conf import settings
            send_mail(
                subject=subject,
                message=message_body,
                html_message=html_message,
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "IoT HIVE <iothive221@gmail.com>"),
                recipient_list=[user.email],
                fail_silently=False,
            )
            print(f"\n==================== [IoT HIVE PASSWORD RESET EMAIL] ====================\nTo: {user.email}\nSubject: {subject}\n\n{message_body}\n==========================================================================\n")
        except Exception as e:
            print(f"\n==================== [IoT HIVE PASSWORD RESET EMAIL (FALLBACK)] ====================\nTo: {user.email}\nSubject: {subject}\n\n{message_body}\n===================================================================================\n")

    return Response(
        {
            "message": "If an account matching that username/email exists, a password reset link has been dispatched to the registered email."
        },
        status=status.HTTP_200_OK
    )


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AuthAnonRateThrottle])
def password_reset_confirm(request):
    """Confirms password reset using uidb64 and token."""
    data = _get_request_data(request)
    uidb64 = data.get("uidb64", "").strip()
    token = data.get("token", "").strip()
    new_password = data.get("new_password", "")

    if not uidb64 or not token or not new_password:
        return Response(
            {"detail": "uidb64, token, and new_password are all required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if len(new_password) < 6:
        return Response(
            {"detail": "Password must be at least 6 characters long."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None

    if user is None or not default_token_generator.check_token(user, token):
        return Response(
            {"detail": "The password reset link is invalid or has expired."},
            status=status.HTTP_400_BAD_REQUEST
        )

    user.set_password(new_password)
    user.save()

    return Response(
        {"message": "Your password has been successfully reset. You can now log in."},
        status=status.HTTP_200_OK
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    logout(request)
    return Response(
        {"message": "You have been logged out."}
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def current_user(request):
    if not request.user.is_authenticated:
        return Response(None, status=status.HTTP_200_OK)
    return Response(
        UserSerializer(request.user).data
    )


@api_view(["GET", "POST", "PUT", "PATCH"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def profile_view(request):
    user = request.user
    profile, _ = UserProfile.objects.get_or_create(user=user)

    if request.method == "GET":
        return Response(UserSerializer(user).data)

    data = _get_request_data(request)
    first_name = data.get("first_name")
    last_name = data.get("last_name")
    email = data.get("email")
    username = data.get("username")
    bio = data.get("bio")
    location = data.get("location")
    website = data.get("website")
    role = data.get("role")

    if username is not None and username.strip():
        new_username = slugify(username.strip()).replace("_", "-") or username.strip().lower()
        if User.objects.filter(username__iexact=new_username).exclude(pk=user.pk).exists():
            return Response(
                {"detail": "This username is already in use by another maker. Please pick another."},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.username = new_username

    if first_name is not None:
        user.first_name = first_name.strip()
    if last_name is not None:
        user.last_name = last_name.strip()
    if email is not None and email.strip():
        if User.objects.filter(email__iexact=email.strip()).exclude(pk=user.pk).exists():
            return Response(
                {"detail": "This email address is already associated with another account."},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.email = email.strip()
    user.save()

    if bio is not None:
        profile.bio = bio.strip()
    if location is not None:
        profile.location = location.strip()
    if website is not None:
        profile.website = website.strip()
    if role in ["buyer", "seller", "both"]:
        profile.role = role

    phone_number = data.get("phone_number")
    notify_sms_orders = data.get("notify_sms_orders")
    notify_sms_bounties = data.get("notify_sms_bounties")
    notify_sms_chat = data.get("notify_sms_chat")

    if phone_number is not None:
        profile.phone_number = phone_number.strip()
    if notify_sms_orders is not None:
        profile.notify_sms_orders = str(notify_sms_orders).lower() in ["true", "1", "yes"]
    if notify_sms_bounties is not None:
        profile.notify_sms_bounties = str(notify_sms_bounties).lower() in ["true", "1", "yes"]
    if notify_sms_chat is not None:
        profile.notify_sms_chat = str(notify_sms_chat).lower() in ["true", "1", "yes"]

    if "avatar" in request.FILES:
        profile.avatar = request.FILES["avatar"]

    profile.save()

    return Response(
        {
            "message": "Profile updated successfully.",
            "user": UserSerializer(user).data,
        }
    )


@api_view(["POST", "DELETE"])
@permission_classes([IsAuthenticated])
def delete_account(request):
    """Permanently delete user account and all associated data."""
    user = request.user
    data = _get_request_data(request)
    password = data.get("password", "")

    if user.has_usable_password():
        if not password or not user.check_password(password):
            return Response(
                {"detail": "Incorrect password. Please verify your current password to delete your account."},
                status=status.HTTP_400_BAD_REQUEST
            )

    username = user.username
    logout(request)
    user.delete()

    return Response(
        {"message": f"Your account @{username} and profile have been permanently deleted."},
        status=status.HTTP_200_OK
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def social_login(request):
    """Google and Facebook OAuth token / credential login handler."""
    data = _get_request_data(request)
    provider = data.get("provider", "google").lower()
    email = data.get("email", "").strip()
    first_name = data.get("first_name", "").strip()
    last_name = data.get("last_name", "").strip()
    id_token_val = data.get("id_token") or data.get("token") or data.get("credential")

    if not email:
        return Response(
            {"detail": f"{provider.capitalize()} authentication failed: Email address is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = User.objects.filter(email__iexact=email).first()
    if user:
        # Prevent unauthorized takeover of existing accounts with passwords or staff access
        if (user.is_staff or user.is_superuser or user.has_usable_password()) and not id_token_val:
            return Response(
                {"detail": f"An account with email '{email}' already exists. Please log in using your account password."},
                status=status.HTTP_400_BAD_REQUEST
            )
    else:
        gen_username = _generate_unique_username(last_name, first_name, email)
        user = User.objects.create_user(
            username=gen_username,
            email=email,
            first_name=first_name,
            last_name=last_name,
        )
        user.set_unusable_password()
        user.save()
        UserProfile.objects.create(user=user, role="both")

    login(request, user)

    return Response(
        {
            "message": f"Successfully signed in with {provider.capitalize()}.",
            "user": UserSerializer(user).data,
        }
    )

