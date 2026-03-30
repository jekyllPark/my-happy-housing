import os
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.conf import settings

FIXTURE_DIR = os.path.join(settings.BASE_DIR, 'fixtures')
FIXTURE_MODELS = [
    'housing.HousingComplex',
    'housing.Recruitment',
    'housing.SupplyUnit',
    'housing.Eligibility',
]
FIXTURE_FILE = os.path.join(FIXTURE_DIR, 'housing_data.json')


class Command(BaseCommand):
    help = '크롤링된 주택 데이터를 JSON fixture로 덤프'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output',
            type=str,
            default=FIXTURE_FILE,
            help='출력 파일 경로 (기본: fixtures/housing_data.json)',
        )

    def handle(self, *args, **options):
        output_path = options['output']
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        from apps.housing.models import HousingComplex
        count = HousingComplex.objects.count()

        if count == 0:
            self.stdout.write(
                self.style.WARNING('DB에 데이터가 없습니다. 먼저 크롤링을 실행하세요.')
            )
            return

        with open(output_path, 'w', encoding='utf-8') as f:
            call_command(
                'dumpdata',
                *FIXTURE_MODELS,
                format='json',
                indent=2,
                stdout=f,
            )

        file_size = os.path.getsize(output_path)
        size_str = (
            f'{file_size / 1024 / 1024:.1f}MB'
            if file_size > 1024 * 1024
            else f'{file_size / 1024:.0f}KB'
        )

        self.stdout.write(
            self.style.SUCCESS(
                f'Fixture 덤프 완료: {output_path} ({size_str}, {count}개 단지)'
            )
        )
