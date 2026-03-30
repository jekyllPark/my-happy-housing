from django.core.management.base import BaseCommand
from apps.crawler.spiders.applyhome_spider import ApplyHomeSpider
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Crawl applyhome.co.kr for ApplyHome housing data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--save',
            action='store_true',
            help='Save crawled data to database'
        )
        parser.add_argument(
            '--pages',
            type=int,
            default=1,
            help='Number of pages to crawl'
        )

    def handle(self, *args, **options):
        save_data = options.get('save', False)
        num_pages = options.get('pages', 1)

        self.stdout.write(
            self.style.SUCCESS(f'Starting ApplyHome crawler (pages: {num_pages})')
        )

        try:
            spider = ApplyHomeSpider()
            result = spider.crawl()

            self.stdout.write(
                self.style.SUCCESS(
                    f'\nCrawl completed successfully!\n'
                    f'Total items: {result.get("total_items", 0)}\n'
                    f'Processed: {result.get("processed_items", 0)}\n'
                    f'Created: {result.get("created_items", 0)}\n'
                    f'Updated: {result.get("updated_items", 0)}\n'
                    f'Failed: {result.get("failed_items", 0)}'
                )
            )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error during crawl: {e}')
            )
            logger.exception('ApplyHome crawler error')
