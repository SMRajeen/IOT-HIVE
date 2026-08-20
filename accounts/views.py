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

    login(request, user)

    return Response(
        {
            "message": "Welcome to IoT Hive! Your account has been created.",
            "user": UserSerializer(user).data,
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

    username_to_auth = identifier
    user_obj = User.objects.filter(
        Q(email__iexact=identifier) | Q(username__iexact=identifier)
    ).first()
    if user_obj:
        username_to_auth = user_obj.username

    user = authenticate(
        request,
        username=username_to_auth,
        password=password
    )

    if user is None and username_to_auth != identifier:
        user = authenticate(
            request,
            username=identifier,
            password=password
        )

    if user is None:
        return Response(
            {"detail": "Incorrect username/email or password."},
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
            "message": "Welcome back! Login successful.",
            "user": UserSerializer(user).data,
        }
    )


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([AuthAnonRateThrottle])
def password_reset_request(request):
    """Initiates a password reset flow by email or username."""
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

    if not user:
        return Response(
            {"detail": f"No account found matching '{identifier}'. Please check your spelling."},
            status=status.HTTP_404_NOT_FOUND
        )

    uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)

    return Response(
        {
            "message": f"Account verified for @{user.username}.",
            "uidb64": uidb64,
            "token": token,
            "username": user.username,
            "reset_url": f"/login/?reset_uid={uidb64}&reset_token={token}",
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
@permission_classes([IsAuthenticated])
def current_user(request):
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

    if not email:
        return Response(
            {"detail": f"{provider.capitalize()} authentication failed: Email address is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = User.objects.filter(email__iexact=email).first()
    if not user:
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

