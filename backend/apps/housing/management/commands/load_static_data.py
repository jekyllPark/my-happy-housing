from django.core.management.base import BaseCommand
from django.conf import settings
from pathlib import Path
import json
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Load and verify static housing data from JSON files'

    def add_arguments(self, parser):
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed output'
        )

    def handle(self, *args, **options):
        verbose = options.get('verbose', False)

        housing_data_dir = Path(settings.HOUSING_DATA_DIR)

        if not housing_data_dir.exists():
            self.stdout.write(
                self.style.ERROR(f'Data directory not found: {housing_data_dir}')
            )
            return

        files_to_check = [
            'categories.json',
            'deposit_table.json',
            'eligibility.json',
        ]

        all_valid = True

        for file_name in files_to_check:
            file_path = housing_data_dir / file_name
            if not file_path.exists():
                self.stdout.write(
                    self.style.ERROR(f'  ✗ {file_name}: File not found')
                )
                all_valid = False
                continue

            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                file_size = file_path.stat().st_size
                self.stdout.write(
                    self.style.SUCCESS(
                        f'  ✓ {file_name}: Loaded successfully ({file_size} bytes)'
                    )
                )

                if verbose:
                    self.stdout.write(f'    Keys: {list(data.keys())}')

            except json.JSONDecodeError as e:
                self.stdout.write(
                    self.style.ERROR(f'  ✗ {file_name}: Invalid JSON - {str(e)}')
                )
                all_valid = False
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'  ✗ {file_name}: Error - {str(e)}')
                )
                all_valid = False

        if all_valid:
            self.stdout.write(
                self.style.SUCCESS('\nAll static data files loaded successfully!')
            )
        else:
            self.stdout.write(
                self.style.ERROR('\nSome files failed to load. Check the errors above.')
            )
