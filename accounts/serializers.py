from django.contrib.auth.models import User
from rest_framework import serializers
from .models import UserProfile


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    bio = serializers.SerializerMethodField()
    location = serializers.SerializerMethodField()
    website = serializers.SerializerMethodField()
    phone_number = serializers.SerializerMethodField()
    notify_sms_orders = serializers.SerializerMethodField()
    notify_sms_bounties = serializers.SerializerMethodField()
    notify_sms_chat = serializers.SerializerMethodField()

    is_staff = serializers.BooleanField(read_only=True)
    is_superuser = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "role",
            "avatar",
            "bio",
            "location",
            "website",
            "phone_number",
            "notify_sms_orders",
            "notify_sms_bounties",
            "notify_sms_chat",
            "is_staff",
            "is_superuser",
        ]

    def get_profile(self, obj):
        return UserProfile.objects.filter(user=obj).first()

    def get_role(self, obj):
        profile = self.get_profile(obj)
        if profile:
            return profile.role
        if obj.is_superuser or obj.is_staff:
            return "admin"
        return "both"

    def get_avatar(self, obj):
        profile = self.get_profile(obj)
        if profile and profile.avatar:
            return profile.avatar.url
        return None

    def get_bio(self, obj):
        profile = self.get_profile(obj)
        return profile.bio if profile else ""

    def get_location(self, obj):
        profile = self.get_profile(obj)
        return profile.location if profile else ""

    def get_website(self, obj):
        profile = self.get_profile(obj)
        return profile.website if profile else ""

    def get_phone_number(self, obj):
        profile = self.get_profile(obj)
        return profile.phone_number if profile else ""

    def get_notify_sms_orders(self, obj):
        profile = self.get_profile(obj)
        return profile.notify_sms_orders if profile else True

    def get_notify_sms_bounties(self, obj):
        profile = self.get_profile(obj)
        return profile.notify_sms_bounties if profile else True

    def get_notify_sms_chat(self, obj):
        profile = self.get_profile(obj)
        return profile.notify_sms_chat if profile else True


class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    first_name = serializers.CharField(source="user.first_name", required=False)
    last_name = serializers.CharField(source="user.last_name", required=False)

    class Meta:
        model = UserProfile
        fields = [
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "avatar",
            "bio",
            "location",
            "website",
            "phone_number",
            "notify_sms_orders",
            "notify_sms_bounties",
            "notify_sms_chat",
        ]
