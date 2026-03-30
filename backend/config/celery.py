import os
from celery import Celery
from celery.schedules import crontab
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')

app = Celery('my_happy_housing')

app.config_from_object('django.conf:settings', namespace='CELERY')

app.autodiscover_tasks()

app.conf.beat_schedule = {
    'crawl-daily-myhome-3am': {
        'task': 'apps.crawler.tasks.crawl_daily',
        'schedule': crontab(hour=3, minute=0),
        'kwargs': {'source': 'myhome'},
    },
    'crawl-weekly-sunday-5am': {
        'task': 'apps.crawler.tasks.crawl_weekly_update',
        'schedule': crontab(day_of_week=6, hour=5, minute=0),
        'kwargs': {},
    },
}

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
