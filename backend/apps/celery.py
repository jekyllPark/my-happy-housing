import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')

from django.conf import settings

app = Celery('my_happy_housing')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
