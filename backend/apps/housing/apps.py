from django.apps import AppConfig
from django.core.cache import cache
import json
import logging

logger = logging.getLogger(__name__)


class HousingConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.housing'

    def ready(self):
        from django.conf import settings
        from pathlib import Path

        housing_data_dir = settings.HOUSING_DATA_DIR

        cache_key = 'housing_static_data'
        if cache.get(cache_key) is None:
            try:
                data = {}
                for json_file in ['categories.json', 'deposit_table.json', 'eligibility.json']:
                    file_path = Path(housing_data_dir) / json_file
                    if file_path.exists():
                        with open(file_path, 'r', encoding='utf-8') as f:
                            data[json_file.replace('.json', '')] = json.load(f)
                cache.set(cache_key, data, None)
                logger.info('Static housing data loaded successfully')
            except Exception as e:
                logger.error(f'Failed to load static housing data: {e}')
