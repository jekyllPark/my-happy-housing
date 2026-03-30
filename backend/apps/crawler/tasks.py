from celery import shared_task
import logging
from datetime import datetime

from django.core.management import call_command

from .models import CrawlLog

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def crawl_daily(self, source='myhome'):
    """
    Daily crawl task - runs at 3 AM daily
    """
    crawl_log = CrawlLog.objects.create(
        source=source,
        status='running'
    )

    try:
        logger.info(f'Starting daily crawl for {source}')

        if source == 'myhome':
            from .spiders.myhome_spider import MyHomeSpider
            spider = MyHomeSpider()
            result = spider.crawl()
        elif source == 'lh':
            from .spiders.lh_spider import LHSpider
            spider = LHSpider()
            result = spider.crawl()
        elif source == 'applyhome':
            from .spiders.applyhome_spider import ApplyHomeSpider
            spider = ApplyHomeSpider()
            result = spider.crawl()
        else:
            raise ValueError(f'Unknown source: {source}')

        crawl_log.status = 'success'
        crawl_log.completed_at = datetime.now()
        crawl_log.total_items = result.get('total_items', 0)
        crawl_log.processed_items = result.get('processed_items', 0)
        crawl_log.created_items = result.get('created_items', 0)
        crawl_log.updated_items = result.get('updated_items', 0)
        crawl_log.failed_items = result.get('failed_items', 0)
        crawl_log.logs = result.get('logs', [])

        logger.info(f'Crawl completed: {result}')

    except Exception as exc:
        logger.error(f'Crawl failed: {exc}')
        crawl_log.status = 'failed'
        crawl_log.completed_at = datetime.now()
        crawl_log.error_message = str(exc)

        self.retry(exc=exc, countdown=60)

    finally:
        crawl_log.save()

    # 크롤링 성공 시 fixture 자동 갱신
    if crawl_log.status == 'success':
        try:
            call_command('dump_fixtures')
            logger.info('Fixture dump completed after crawl')
        except Exception as e:
            logger.warning(f'Fixture dump failed (non-critical): {e}')

    return {
        'source': source,
        'status': crawl_log.status,
        'log_id': crawl_log.id,
    }


@shared_task(bind=True, max_retries=3)
def crawl_weekly_update(self):
    """
    Weekly crawl task - runs on Sunday at 5 AM
    Crawls all sources for comprehensive update
    """
    sources = ['myhome', 'lh', 'applyhome']
    results = []

    for source in sources:
        try:
            result = crawl_daily.apply_async(kwargs={'source': source})
            results.append({
                'source': source,
                'task_id': result.id,
            })
        except Exception as e:
            logger.error(f'Failed to start crawl for {source}: {e}')
            results.append({
                'source': source,
                'error': str(e),
            })

    return {
        'weekly_update': True,
        'results': results,
    }


@shared_task(bind=True, max_retries=3)
def crawl_site(self, source, **kwargs):
    """
    Generic crawl task for a specific site
    """
    return crawl_daily.apply_async(kwargs={'source': source}).get()
