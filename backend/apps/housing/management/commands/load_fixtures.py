import os
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.conf import settings

FIXTURE_DIR = os.path.join(settings.BASE_DIR, 'fixtures')
FIXTURE_FILE = os.path.join(FIXTURE_DIR, 'housing_data.json')


class Command(BaseCommand):
    help = 'JSON fixture에서 주택 데이터 로드 (초기 세팅용)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--input',
            type=str,
            default=FIXTURE_FILE,
            help='입력 파일 경로 (기본: fixtures/housing_data.json)',
        )

    def handle(self, *args, **options):
        input_path = options['input']

        if not os.path.exists(input_path):
            self.stdout.write(
                self.style.ERROR(
                    f'Fixture 파일이 없습니다: {input_path}\n'
                    '먼저 크롤링 후 dump_fixtures를 실행하세요.'
                )
            )
            return

        from apps.housing.models import HousingComplex
        existing = HousingComplex.objects.count()

        if existing > 0:
            self.stdout.write(
                self.style.WARNING(
                    f'DB에 이미 {existing}개 단지가 있습니다. '
                    '기존 데이터를 덮어씁니다.'
                )
            )

        call_command('loaddata', input_path, verbosity=1)

        loaded = HousingComplex.objects.count()
        self.stdout.write(
            self.style.SUCCESS(f'Fixture 로드 완료: {loaded}개 단지')
        )
