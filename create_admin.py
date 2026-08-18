import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from accounts.models import UserProfile

username = os.getenv('DJANGO_SUPERUSER_USERNAME', 'IOT-HIVE')
email = os.getenv('DJANGO_SUPERUSER_EMAIL', 'rajeenm2003@gmail.com')
password = os.getenv('DJANGO_SUPERUSER_PASSWORD', 'IotHive2026!Admin')

user, created = User.objects.get_or_create(
    username=username,
    defaults={'email': email, 'is_staff': True, 'is_superuser': True}
)

user.email = email
user.is_staff = True
user.is_superuser = True
user.set_password(password)
user.save()

profile, _ = UserProfile.objects.get_or_create(user=user)
profile.role = 'admin'
profile.save()

if created:
    print(f"[OK] Successfully created superuser '{username}' for Render deployment.")
else:
    print(f"[OK] Successfully synchronized superuser '{username}' credentials for Render deployment.")
