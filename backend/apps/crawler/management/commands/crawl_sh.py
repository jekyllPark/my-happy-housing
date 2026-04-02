from django.core.management.base import BaseCommand
from apps.crawler.spiders.sh_spider import SHSpider
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Crawl i-sh.co.kr for SH서울주택도시공사 housing data'

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
            self.style.SUCCESS(f'Starting SH crawler (pages: {num_pages}, save: {save_data})')
        )

        try:
            spider = SHSpider()
            result = spider.crawl(pages=num_pages, save=save_data)

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

            if result.get('logs'):
                self.stdout.write('\nLogs:')
                for log in result['logs'][:50]:
                    self.stdout.write(f'  {log}')

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error during crawl: {e}')
            )
            logger.exception('SH crawler error')
