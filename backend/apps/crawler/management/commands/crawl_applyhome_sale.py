import re
import time
import requests
from bs4 import BeautifulSoup
from django.core.management.base import BaseCommand
from django.conf import settings
from django.contrib.gis.geos import Point
from django.utils import timezone
from datetime import datetime
from apps.housing.models import HousingComplex, Recruitment
from apps.route.services import GeolocationService


class Command(BaseCommand):
    help = 'Crawl applyhome.co.kr for APT sale data'

    def parse_date(self, s):
        if not s:
            return None
        s = s.strip()
        for fmt in ['%Y-%m-%d', '%Y.%m.%d', '%Y/%m/%d']:
            try:
                return datetime.strptime(s, fmt)
            except ValueError:
                continue
        return None

    def handle(self, *args, **options):
        geo = GeolocationService(settings.KAKAO_API_KEY)
        headers = {'User-Agent': 'Mozilla/5.0'}

        all_items = []

        # 1) APT 분양 (full columns: region, type, supply, name, company, phone, 공고일, 청약기간, 당첨발표)
        self.stdout.write('Crawling APT listings...')
        for page in range(1, 25):
            url = 'https://www.applyhome.co.kr/ai/aia/selectAPTLttotPblancListView.do'
            data = {
                'pageIndex': str(page),
                'rentSecd': '', 'suplyAreaCode': '', 'houseDetailSecd': '',
                'houseNm': '', 'beginPd': '2025-01', 'endPd': '2026-12',
                'orderbySecd': '', 'orderbyMth': '', 'pageSelAt': '',
            }
            r = requests.post(url, data=data, timeout=30, headers=headers)
            soup = BeautifulSoup(r.text, 'html.parser')
            rows = soup.select('table tbody tr')
            if not rows:
                break
            for row in rows:
                cells = [td.get_text(strip=True) for td in row.select('td')]
                if len(cells) >= 9:
                    # Parse 청약기간: "2026-04-10 ~ 2026-04-15"
                    period = cells[7]
                    apply_start = ''
                    apply_end = ''
                    if '~' in period:
                        parts = period.split('~')
                        apply_start = parts[0].strip()
                        apply_end = parts[1].strip()

                    all_items.append({
                        'region': cells[0],
                        'apt_type': cells[1],
                        'supply_type': cells[2],
                        'name': cells[3],
                        'company': cells[4],
                        'phone': cells[5],
                        'announce_date': cells[6],  # 모집공고일
                        'apply_start': apply_start,
                        'apply_end': apply_end,
                        'winner_date': cells[8],  # 당첨자발표
                        'source': 'apt',
                    })
            time.sleep(1)

        # 2) 오피스텔/도시형/민간임대
        self.stdout.write('Crawling other listings...')
        for page in range(1, 15):
            url2 = 'https://www.applyhome.co.kr/ai/aia/selectOtherLttotPblancListView.do'
            data2 = {
                'pageIndex': str(page),
                'searchHouseSecd': '', 'suplyAreaCode': '',
                'houseNm': '', 'beginPd': '2025-01', 'endPd': '2026-12',
            }
            r2 = requests.post(url2, data=data2, timeout=30, headers=headers)
            soup2 = BeautifulSoup(r2.text, 'html.parser')
            rows2 = soup2.select('table tbody tr')
            if not rows2:
                break
            for row in rows2:
                cells = [td.get_text(strip=True) for td in row.select('td')]
                if len(cells) >= 6:
                    all_items.append({
                        'region': cells[0],
                        'apt_type': cells[1],
                        'supply_type': '분양주택',
                        'name': cells[2],
                        'company': cells[3],
                        'phone': cells[4],
                        'announce_date': cells[5] if len(cells) > 5 else '',
                        'apply_start': '',
                        'apply_end': '',
                        'winner_date': '',
                        'source': 'other',
                    })
            time.sleep(1)

        self.stdout.write(f'Fetched: {len(all_items)} items')

        # Save to DB
        created = 0
        skipped = 0
        for item in all_items:
            name = item['name']
            if not name:
                continue

            if HousingComplex.objects.filter(name=name).exists():
                skipped += 1
                continue

            code = f"applyhome_{abs(hash(name)) % 100000000}"

            apt_type = item['apt_type']
            if '국민' in apt_type:
                housing_type = 'public_sale'
            elif '공공지원' in apt_type:
                housing_type = 'public_support'
            else:
                housing_type = 'private_sale'

            region = item['region']
            location = None
            address = region

            coords = geo.geocode_address(f"{region} {name}")
            if not coords:
                coords = geo.geocode_address(name)
            if coords:
                location = Point(coords[1], coords[0], srid=4326)
                results = geo.search_keyword(name, size=1)
                if results:
                    address = results[0].get('address', region)

            time.sleep(0.2)

            parts = address.split()
            district = parts[1] if len(parts) > 1 else ''

            c = HousingComplex.objects.create(
                code=code,
                name=name,
                housing_type=housing_type,
                address=address,
                district=district,
                region=region,
                total_units=0,
                operator=item['company'],
                phone=item.get('phone', ''),
                is_active=True,
                location=location,
            )

            # Parse dates
            announce = self.parse_date(item['announce_date'])
            apply_start = self.parse_date(item['apply_start']) or announce
            apply_end = self.parse_date(item['apply_end']) or announce
            winner = self.parse_date(item['winner_date'])

            if not apply_start:
                apply_start = timezone.now()
            if not apply_end:
                apply_end = apply_start

            Recruitment.objects.create(
                recruitment_id=code,
                housing_complex=c,
                target_groups=[],
                total_households=0,
                apply_start=apply_start,
                apply_end=apply_end,
                status='open',
                announcement_date=announce.date() if announce else None,
                announcement_url='https://www.applyhome.co.kr',
                details={
                    'winner_date': item['winner_date'],
                    'announce_date': item['announce_date'],
                    'apply_period': f"{item['apply_start']} ~ {item['apply_end']}" if item['apply_start'] else '',
                    'apt_type': item['apt_type'],
                    'supply_type': item['supply_type'],
                },
            )
            created += 1

        self.stdout.write(self.style.SUCCESS(
            f'Done! Created: {created}, Skipped: {skipped}, Total: {HousingComplex.objects.count()}'
        ))
