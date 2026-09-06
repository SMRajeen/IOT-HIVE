import os
from pathlib import Path
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env file
load_dotenv(BASE_DIR / '.env')

# Quick-start development settings - unsuitable for production
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-8-z7w4zviklyjx4-l+k-b5^bcg^v$op7alpojivc$)3m_kmz7b')

DEBUG = os.getenv('DEBUG', 'True').lower() in ('true', '1', 'yes')

allowed_hosts_env = os.getenv('ALLOWED_HOSTS', '*')
if allowed_hosts_env == '*':
    ALLOWED_HOSTS = ['*']
else:
    ALLOWED_HOSTS = [h.strip() for h in allowed_hosts_env.split(',') if h.strip()]

csrf_origins_env = os.getenv(
    'CSRF_TRUSTED_ORIGINS',
    'https://*.onrender.com,https://*.railway.app,https://*.fly.dev,http://127.0.0.1,http://localhost'
)
CSRF_TRUSTED_ORIGINS = [o.strip() for o in csrf_origins_env.split(',') if o.strip()]

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',

    'whitenoise.runserver_nostatic',
    'django.contrib.staticfiles',

    'cloudinary_storage',
    'cloudinary',

    'rest_framework',
    'corsheaders',

    'core',
    'accounts',
    'marketplace',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / "templates"],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database
# Support PostgreSQL via DATABASE_URL / POSTGRES_URL / SUPABASE_DB_URL or fallback to local SQLite
raw_db_url = (
    os.getenv('DATABASE_URL')
    or os.getenv('POSTGRES_URL')
    or os.getenv('SUPABASE_DB_URL')
    or os.getenv('SUPABASE_DATABASE_URL')
)

supabase_env = os.getenv('SUPABASE_URL', '')
if not raw_db_url and (supabase_env.startswith('postgres://') or supabase_env.startswith('postgresql://')):
    raw_db_url = supabase_env

db_host = os.getenv('DB_HOST') or os.getenv('POSTGRES_HOST') or os.getenv('SUPABASE_HOST')

if raw_db_url and (raw_db_url.startswith('postgres://') or raw_db_url.startswith('postgresql://')):
    try:
        import dj_database_url
        is_transaction_pooler = ':6543' in raw_db_url or 'pgbouncer=true' in raw_db_url.lower()
        DATABASES = {
            'default': dj_database_url.config(
                default=raw_db_url,
                conn_max_age=0 if is_transaction_pooler else 600,
                conn_health_checks=True,
                ssl_require=True,
            )
        }
    except ImportError:
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': BASE_DIR / 'db.sqlite3',
            }
        }
elif db_host:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('DB_NAME') or os.getenv('POSTGRES_DB') or 'postgres',
            'USER': os.getenv('DB_USER') or os.getenv('POSTGRES_USER') or 'postgres',
            'PASSWORD': os.getenv('DB_PASSWORD') or os.getenv('POSTGRES_PASSWORD', ''),
            'HOST': db_host,
            'PORT': os.getenv('DB_PORT') or os.getenv('POSTGRES_PORT') or '5432',
            'CONN_MAX_AGE': 600,
            'OPTIONS': {
                'sslmode': 'require',
            }
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATICFILES_DIRS = [
    BASE_DIR / 'static',
]
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Media files & Cloudinary Upload Storage (Root paths: projects/images/, profiles/, projects/attachments/)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

CLOUDINARY_CLOUD_NAME = os.getenv('CLOUDINARY_CLOUD_NAME')
CLOUDINARY_API_KEY = os.getenv('CLOUDINARY_API_KEY')
CLOUDINARY_API_SECRET = os.getenv('CLOUDINARY_API_SECRET')

# Support standard CLOUDINARY_URL format (cloudinary://API_KEY:API_SECRET@CLOUD_NAME)
cloudinary_url = os.getenv('CLOUDINARY_URL')
if cloudinary_url and not (CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET):
    try:
        import urllib.parse
        parsed = urllib.parse.urlparse(cloudinary_url)
        CLOUDINARY_CLOUD_NAME = parsed.hostname
        CLOUDINARY_API_KEY = parsed.username
        CLOUDINARY_API_SECRET = parsed.password
    except Exception:
        pass

if CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET:
    CLOUDINARY_STORAGE = {
        'CLOUD_NAME': CLOUDINARY_CLOUD_NAME,
        'API_KEY': CLOUDINARY_API_KEY,
        'API_SECRET': CLOUDINARY_API_SECRET,
        'PREFIX': '',
        'RESOURCE_TYPE': 'auto',
    }
    DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'
    STORAGES = {
        'default': {
            'BACKEND': 'cloudinary_storage.storage.MediaCloudinaryStorage',
        },
        'staticfiles': {
            'BACKEND': 'whitenoise.storage.CompressedStaticFilesStorage',
        },
    }
else:
    DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'
    STORAGES = {
        'default': {
            'BACKEND': 'django.core.files.storage.FileSystemStorage',
        },
        'staticfiles': {
            'BACKEND': 'whitenoise.storage.CompressedStaticFilesStorage',
        },
    }

# WhiteNoise Cache Expiry (1 year for versioned static assets)
WHITENOISE_MAX_AGE = 31536000

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
CORS_ALLOW_ALL_ORIGINS = True

# Django REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.BasicAuthentication',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '120/minute',
        'user': '300/minute',
        'auth_anon': '15/minute',
    },
}

# ============================================================
# SRI LANKA & INTERNATIONAL PAYMENT GATEWAYS CONFIGURATION
# ============================================================
DEFAULT_CURRENCY = 'LKR'

# PayHere (Sri Lanka's Central Bank Approved Payment Gateway)


# ============================================================
# SMS Gateway Configuration (Notify.lk / Twilio / Console)
# ============================================================
SMS_GATEWAY = os.getenv('SMS_GATEWAY', 'notifylk').lower()
TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID', '')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN', '')
TWILIO_PHONE_NUMBER = os.getenv('TWILIO_PHONE_NUMBER', '')

NOTIFY_LK_USER_ID = os.getenv('NOTIFY_LK_USER_ID', '')
NOTIFY_LK_API_KEY = os.getenv('NOTIFY_LK_API_KEY', '')
NOTIFY_LK_SENDER_ID = os.getenv('NOTIFY_LK_SENDER_ID', 'IOTHIVE')

# ============================================================
# Email Notification Configuration (Gmail SMTP / Console)
# ============================================================
EMAIL_BACKEND = os.getenv(
    'EMAIL_BACKEND',
    'django.core.mail.backends.smtp.EmailBackend' if os.getenv('EMAIL_HOST_PASSWORD') else 'django.core.mail.backends.console.EmailBackend'
)
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True').lower() in ('true', '1', 'yes')
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', 'iothive221@gmail.com')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', f'IoT HIVE <{EMAIL_HOST_USER}>')
EMAIL_TIMEOUT = int(os.getenv('EMAIL_TIMEOUT', 10))

# ============================================================
# OAuth Social Login (Google & Facebook)
# ============================================================
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET', '')
FACEBOOK_APP_ID = os.getenv('FACEBOOK_APP_ID', '')
FACEBOOK_APP_SECRET = os.getenv('FACEBOOK_APP_SECRET', '')

