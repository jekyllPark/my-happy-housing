import logging
import re
import json
import requests
from bs4 import BeautifulSoup
from typing import List, Dict

logger = logging.getLogger(__name__)


def _parse_int(s: str) -> int:
    try:
        return int(re.sub(r'[^\d]', '', s or ''))
    except (ValueError, TypeError):
        return 0


def _parse_float(s: str) -> float:
    try:
        return float(re.sub(r'[^\d.]', '', s or ''))
    except (ValueError, TypeError):
        return 0


def _extract_complex_names(html_text: str) -> Dict[str, str]:
    """
    Extract complex names from wrtancFloorplan JS variable.
    Maps sbdLgoNo → human-readable name like "용인시 서천2"
    """
    complexes = {}
    match = re.search(r'wrtancFloorplan\s*=\s*JSON\.parse\(\'(.*?)\'\)', html_text)
    if not match:
        return complexes

    try:
        decoded = match.group(1).encode('raw_unicode_escape').decode('utf-8')
        data = json.loads(decoded)

        sbd_order = {}
        for group in data:
            for item in group:
                code = item.get('sbdLgoNo', '')
                sn = item.get('sn', 0)
                fname = item.get('cmnAhflNm', '')
                parts = fname.replace('.jpg', '').replace('.png', '').split('_')
                if len(parts) >= 2 and code and code not in complexes:
                    complexes[code] = f'{parts[0]} {parts[1]}'
                    sbd_order[code] = sn
    except Exception as e:
        logger.warning(f'Failed to parse floorplan data: {e}')

    return complexes


def scrape_lh_detail(announcement_url: str) -> Dict:
    """
    Scrape supply unit info AND application dates from LH announcement detail page.
    Returns dict with 'units' and 'dates'.
    """
    if not announcement_url or 'apply.lh.or.kr' not in announcement_url:
        return {'units': [], 'dates': {}}

    try:
        r = requests.get(
            announcement_url,
            timeout=15,
            headers={'User-Agent': 'Mozilla/5.0'},
        )
        r.raise_for_status()
        r.encoding = 'utf-8'
        soup = BeautifulSoup(r.text, 'html.parser')
    except Exception as e:
        logger.warning(f'Failed to fetch LH page: {e}')
        return {'units': [], 'dates': {}}

    # Extract all schedule dates
    dates = {}
    date_patterns = [
        ('apply_start', 'apply_end', r'(?<!\S서류)접수기간\s*:?\s*(\d{4}\.\d{2}\.\d{2})\s*~\s*(\d{4}\.\d{2}\.\d{2})'),
        ('document_announcement', None, r'서류제출대상자\s*발표일?\s*:?\s*(\d{4}\.\d{2}\.\d{2})'),
        ('document_start', 'document_end', r'서류접수기간\s*:?\s*(\d{4}\.\d{2}\.\d{2})\s*~\s*(\d{4}\.\d{2}\.\d{2})'),
        ('winner_announcement', None, r'당첨자\s*발표일?\s*:?\s*(\d{4}\.\d{2}\.\d{2})'),
    ]

    full_text = soup.get_text(' ', strip=True)
    for pattern_info in date_patterns:
        if len(pattern_info) == 3:
            key1, key2, pattern = pattern_info
        else:
            continue
        match = re.search(pattern, full_text)
        if match:
            dates[key1] = match.group(1).replace('.', '-')
            if key2 and match.lastindex >= 2:
                dates[key2] = match.group(2).replace('.', '-')

    # Extract complex names from JS
    complex_names = _extract_complex_names(r.text)

    # Build sbdLgoNo order from floorplan sn
    sbd_list = []
    try:
        fp_match = re.search(r'wrtancFloorplan\s*=\s*JSON\.parse\(\'(.*?)\'\)', r.text)
        if fp_match:
            decoded = fp_match.group(1).encode('raw_unicode_escape').decode('utf-8')
            fp_data = json.loads(decoded)
            seen = set()
            for group in fp_data:
                for item in group:
                    code = item.get('sbdLgoNo', '')
                    sn = item.get('sn', 0)
                    if code and code not in seen:
                        seen.add(code)
                        sbd_list.append((sn, code))
            sbd_list.sort()
    except Exception:
        pass

    # Map table index → sbdLgoNo (tables appear in sbd order)
    sbd_codes = [code for _, code in sbd_list]

    # Extract per-complex addresses from "소재지" text
    complex_addresses = {}
    address_els = soup.find_all(string=re.compile(r'소재지'))
    addr_index = 0
    for el in address_els:
        parent = el.parent
        if not parent:
            continue
        text = parent.get_text(' ', strip=True)
        addr_match = re.search(
            r'소재지\s*:?\s*([\uAC00-\uD7A3가-힣\w\s\d\-\(\),]+?)(?:\s*전화|$)',
            text
        )
        if addr_match:
            addr = addr_match.group(1).strip()
            # Skip if it's a contact address (contains 층, 전화번호)
            if '층' in addr or '전화' in addr:
                continue
            if addr_index < len(sbd_codes):
                complex_addresses[sbd_codes[addr_index]] = addr
                addr_index += 1

    # Geocode complex addresses
    _addr_coords_cache = {}
    try:
        from django.conf import settings
        from apps.route.services import GeolocationService
        api_key = getattr(settings, 'KAKAO_API_KEY', '')
        if api_key:
            geo = GeolocationService(api_key)
            for addr in set(complex_addresses.values()):
                coords = geo.geocode_address(addr)
                if coords:
                    _addr_coords_cache[addr] = (coords[0], coords[1])  # lat, lng
    except Exception as e:
        logger.warning(f'Failed to geocode complex addresses: {e}')

    units = []
    tables = soup.select('table')
    table_idx = 0

    for table in tables:
        caption = table.select_one('caption')
        if not caption:
            continue
        caption_text = caption.get_text(strip=True)
        headers = [th.get_text(strip=True) for th in table.select('thead th')]
        header_str = ' '.join(headers)

        rows = table.select('tbody tr')
        if not rows:
            continue

        # Skip empty tables
        first_cells = [td.get_text(strip=True) for td in rows[0].select('td')]
        if not first_cells or '조회된 데이터가 없습니다' in ' '.join(first_cells):
            continue

        # Type A: 주택형 안내 (국민임대 등 - 면적/세대수/보증금 구조)
        if '주택형' in caption_text:
            sbd_code = sbd_codes[table_idx] if table_idx < len(sbd_codes) else ''
            complex_label = complex_names.get(sbd_code, f'단지 {table_idx + 1}')
            table_idx += 1

            for row in rows:
                cells = [td.get_text(strip=True) for td in row.select('td')]
                if len(cells) < 3:
                    continue

                area = _parse_float(cells[0])
                total_units = _parse_int(cells[1])
                supply_count = _parse_int(cells[2])

                deposit = 0
                rent = 0
                deposit_note = ''
                if len(cells) > 3:
                    if cells[3] == '공고문 확인':
                        deposit_note = '공고문 참고'
                    else:
                        deposit = _parse_int(cells[3])
                if len(cells) > 4:
                    if cells[4] == '공고문 확인':
                        if not deposit_note:
                            deposit_note = '공고문 참고'
                    else:
                        rent = _parse_int(cells[4])

                complex_addr = complex_addresses.get(sbd_code, '')
                complex_lat, complex_lng = _addr_coords_cache.get(complex_addr, (0, 0))

                units.append({
                    'unit_type': f'{complex_label} {area}㎡',
                    'area': area,
                    'total_units': total_units,
                    'supply_count': supply_count,
                    'deposit': deposit,
                    'rent': rent,
                    'deposit_note': deposit_note,
                    'complex_label': complex_label,
                    'complex_address': complex_addr,
                    'complex_lat': complex_lat,
                    'complex_lng': complex_lng,
                })
            continue

        # Type B: 매입임대/리츠 (지역, 상세지역, 주택유형, 공급호수, 당첨자수, 모집인원)
        if ('상세지역' in header_str or '주택정보' in header_str) and ('공급호수' in header_str or '모집인원' in header_str):
            # Map header names to column indices
            h_map = {h: i for i, h in enumerate(headers)}

            for row in rows:
                cells = [td.get_text(strip=True) for td in row.select('td')]
                if len(cells) < 4:
                    continue

                region_val = cells[0] if len(cells) > 0 else ''
                detail_val = cells[1] if len(cells) > 1 else ''
                type_val = cells[2] if len(cells) > 2 else ''

                # 공급호수 = actual units available
                supply_units_val = _parse_int(cells[3]) if len(cells) > 3 else 0
                # 당첨자수 (skip)
                # 모집인원 = number of applicants being recruited (including reserves)
                recruit_val = _parse_int(cells[5]) if len(cells) > 5 else 0

                area = _parse_float(re.sub(r'[^\d.]', '', type_val))

                complex_label = detail_val.strip()
                complex_addr = detail_val

                units.append({
                    'unit_type': f'{region_val} {detail_val} {type_val}'.strip(),
                    'area': area,
                    'total_units': supply_units_val,  # 공급호수
                    'supply_count': recruit_val,       # 모집인원
                    'deposit': 0,
                    'rent': 0,
                    'deposit_note': '공고문 참고',
                    'complex_label': complex_label,
                    'complex_address': complex_addr,
                    'complex_lat': 0,
                    'complex_lng': 0,
                })
            continue

        # Type C: 지역, 공급호수, 전용면적, 임대보증금, 월임대료 구조
        if '전용면적' in header_str and ('임대보증금' in header_str or '월임대료' in header_str):
            for row in rows:
                cells = [td.get_text(strip=True) for td in row.select('td')]
                if len(cells) < 3:
                    continue

                region_val = cells[0] if len(cells) > 0 else ''
                supply_val = cells[1] if len(cells) > 1 else ''
                area_val = cells[2] if len(cells) > 2 else ''

                area = _parse_float(area_val)
                supply_count = _parse_int(supply_val)
                deposit = _parse_int(cells[3]) if len(cells) > 3 else 0
                rent = _parse_int(cells[4]) if len(cells) > 4 else 0

                units.append({
                    'unit_type': f'{region_val} {area}㎡',
                    'area': area,
                    'total_units': supply_count,
                    'supply_count': supply_count,
                    'deposit': deposit,
                    'rent': rent,
                    'deposit_note': '' if deposit else '공고문 참고',
                    'complex_label': region_val,
                    'complex_address': '',
                    'complex_lat': 0,
                    'complex_lng': 0,
                })
            continue

    # If units have no deposit data, try PDF parsing
    has_deposit = any(u['deposit'] > 0 for u in units)
    if not has_deposit and units:
        pdf_deposits = _extract_deposit_from_pdf(soup, announcement_url)
        if pdf_deposits:
            for u in units:
                # Match by area: "26A" pattern from PDF → area 26.xx from unit
                area_int = str(int(u['area'])) if u['area'] else ''
                for hty, info in pdf_deposits.items():
                    if area_int and hty.startswith(area_int):
                        u['deposit'] = info['deposit']
                        u['rent'] = info['rent']
                        u['deposit_note'] = ''
                        break

    # Extract eligibility/income criteria from PDF
    eligibility = _extract_eligibility_from_pdf(soup, announcement_url)

    return {'units': units, 'dates': dates, 'eligibility': eligibility}


def _extract_deposit_from_pdf(soup, announcement_url: str) -> Dict[str, Dict]:
    """
    Try to download and parse the PDF attachment for deposit/rent info.
    Returns dict mapping housing_type (e.g. '26A') → {deposit, rent, deposit_max, rent_min}
    """
    deposit_map = {}

    try:
        # Find PDF file IDs
        pdf_ids = []
        for fid in re.findall(r"fileDownLoad\D+(\d+)", str(soup)):
            pdf_ids.append(fid)

        if not pdf_ids:
            return deposit_map

        # Try to download PDF (prefer the second one as it's usually PDF format)
        base_url = announcement_url.split('/lhapply/')[0] + '/lhapply'
        pdf_content = None
        for fid in pdf_ids[:6]:
            try:
                r = requests.get(
                    f'{base_url}/lhFile.do?fileid={fid}',
                    timeout=15,
                    headers={'User-Agent': 'Mozilla/5.0'},
                )
                if r.content[:5] == b'%PDF-':
                    pdf_content = r.content
                    break
            except Exception:
                continue

        if not pdf_content:
            return deposit_map

        import io
        import pdfplumber
        pdf = pdfplumber.open(io.BytesIO(pdf_content))

        # Search first 5 pages for deposit tables
        for pg in pdf.pages[:5]:
            tables = pg.extract_tables()
            for table in tables:
                if not table or len(table) < 4:
                    continue

                # Check if this looks like a deposit table
                header_text = ' '.join(str(cell) for row in table[:3] for cell in row if cell)
                if '임대보증금' not in header_text and '보증금' not in header_text:
                    continue

                # Parse rows for deposit data
                for row in table[3:]:
                    if not row or not row[0]:
                        continue

                    hty = str(row[0]).strip().replace('\n', ' ')
                    if not hty or hty == 'None':
                        continue

                    # Clean housing type: "26A\n26A1" → "26A"
                    hty_clean = hty.split()[0] if hty else ''
                    if not re.match(r'\d', hty_clean):
                        continue

                    # Extract numbers from cells
                    cells = [str(c).replace(',', '').replace('None', '0').strip() for c in row]

                    deposit = 0
                    rent = 0
                    deposit_max = 0
                    rent_min = 0

                    # Try to find deposit (column 2 usually) and rent (column 5 usually)
                    for ci, cell in enumerate(cells[1:], 1):
                        val = re.sub(r'[^\d]', '', cell)
                        if not val:
                            continue
                        num = int(val)
                        if ci == 2 and num > 0:  # 임대보증금 (계)
                            deposit = num
                        elif ci == 5 and num > 0:  # 월임대료
                            rent = num
                        elif ci == 8 and num > 0:  # 최대전환 보증금
                            deposit_max = num
                        elif ci == 9 and num > 0:  # 최대전환 월임대료
                            rent_min = num

                    if deposit > 0 or rent > 0:
                        deposit_map[hty_clean] = {
                            'deposit': deposit,
                            'rent': rent,
                            'deposit_max': deposit_max,
                            'rent_min': rent_min,
                        }

        pdf.close()

    except Exception as e:
        logger.warning(f'PDF parsing failed: {e}')

    return deposit_map


def _extract_eligibility_from_pdf(soup, announcement_url: str) -> Dict:
    """
    Extract income/asset eligibility criteria from PDF attachment.
    Returns dict with income_criteria (text), income_table (list), asset_criteria (text)
    """
    result = {'income_text': '', 'income_table': [], 'asset_text': ''}

    try:
        pdf_ids = re.findall(r"fileDownLoad\D+(\d+)", str(soup))
        if not pdf_ids:
            return result

        base_url = announcement_url.split('/lhapply/')[0] + '/lhapply'
        pdf_content = None
        for fid in pdf_ids[:6]:
            try:
                r = requests.get(
                    f'{base_url}/lhFile.do?fileid={fid}',
                    timeout=15,
                    headers={'User-Agent': 'Mozilla/5.0'},
                )
                if r.content[:5] == b'%PDF-':
                    pdf_content = r.content
                    break
            except Exception:
                continue

        if not pdf_content:
            return result

        import io
        import pdfplumber
        pdf = pdfplumber.open(io.BytesIO(pdf_content))

        for pg in pdf.pages[:15]:
            text = pg.extract_text() or ''
            if '소득' not in text:
                continue

            tables = pg.extract_tables()
            for table in tables:
                if not table or len(table) < 2:
                    continue

                all_text = ' '.join(str(c) for row in table for c in row if c)

                # Type 1: 순위 + 소득기준 (매입임대리츠 형태)
                if '순위' in all_text and '소득기준' in all_text:
                    for row in table[1:]:
                        if not row:
                            continue
                        cell_text = ' '.join(str(c) for c in row if c)
                        if '퍼센트' in cell_text or '%' in cell_text:
                            if not result['income_text']:
                                result['income_text'] = cell_text.replace('\n', ' ').strip()[:200]
                            break

                # Type 2: 가구원수 + 월평균소득금액 (독립 테이블)
                if '가구원수' in all_text and '월평균' in all_text and not result['income_table']:
                    # Find percent headers from header rows
                    pct_cols = []
                    for hrow in table[:2]:
                        for hcell in (hrow or []):
                            pct_m = re.search(r'(\d+)%', str(hcell) if hcell else '')
                            if pct_m:
                                pct_cols.append(pct_m.group(1))

                    for row in table[2:]:
                        if not row or not row[0]:
                            continue
                        family = str(row[0]).strip()
                        if not family or family == 'None':
                            continue
                        if not re.match(r'\d+인', family):
                            continue
                        # Each subsequent cell is a different percent tier
                        for ci in range(1, len(row)):
                            val = str(row[ci]).strip() if row[ci] else ''
                            if not val or val == 'None':
                                continue
                            pct = f'{pct_cols[ci-1]}%' if ci - 1 < len(pct_cols) else ''
                            result['income_table'].append({
                                'family_size': family,
                                'amount': val if '원' in val else f'{val}원 이하',
                                'percent': pct,
                            })

                # Type 3: 소득 + 자산 통합 테이블 (국민임대 형태)
                # "구분 | 소득 및 자산보유 기준" with embedded income table in cell text
                if '소득 및 자산' in all_text or ('소득' in all_text and '자산' in all_text and '구분' in all_text):
                    for row in table:
                        if not row:
                            continue
                        for cell in row:
                            cell_str = str(cell) if cell else ''

                            # Extract embedded income table from cell text
                            if '가구원수' in cell_str and '월평균' in cell_str and not result['income_table']:
                                lines = cell_str.split('\n')
                                pct_headers = []
                                for line in lines:
                                    pct_match = re.findall(r'(\d+)%', line)
                                    if pct_match and len(pct_match) >= 2:
                                        pct_headers = pct_match
                                        continue
                                    # "1인 2,669,354 3,050,690 3,432,027"
                                    amounts = re.findall(r'([\d,]{5,})', line)
                                    fam_match = re.match(r'(\d+인)', line.strip())
                                    if fam_match and amounts:
                                        fam = fam_match.group(1)
                                        for ai, amt in enumerate(amounts):
                                            pct = f'{pct_headers[ai]}%' if ai < len(pct_headers) else ''
                                            result['income_table'].append({
                                                'family_size': fam,
                                                'amount': f'{amt}원 이하',
                                                'percent': pct,
                                            })

                                if not result['income_text'] and pct_headers:
                                    result['income_text'] = f'도시근로자 가구당 월평균소득 기준 ({", ".join(p + "%" for p in pct_headers)})'

                            # Extract asset info
                            if '총자산' in cell_str and '백만원' in cell_str:
                                amt_match = re.search(r'\(\s*([\d,]+)\s*\)\s*백만원', cell_str)
                                if amt_match:
                                    amt_val = amt_match.group(1).replace(',', '')
                                    result['asset_text'] = f'총자산 {int(amt_val) / 100:.1f}억원 이하'

                            if '자동차' in cell_str and '만원' in cell_str:
                                car_match = re.search(r'\(\s*([\d,]+)\s*\)\s*만원', cell_str)
                                if car_match:
                                    car_val = car_match.group(1).replace(',', '')
                                    if result['asset_text']:
                                        result['asset_text'] += f', 자동차 {car_val}만원 이하'
                                    else:
                                        result['asset_text'] = f'자동차 {car_val}만원 이하'

                # Type 1 asset: standalone asset table
                if ('자산기준' in all_text or '총자산가액' in all_text) and not result['asset_text']:
                    for row in table[1:]:
                        cell_text = ' '.join(str(c) for c in row if c)
                        if '원 이하' in cell_text and '총자산' not in cell_text[:3]:
                            # Already formatted
                            result['asset_text'] = cell_text.replace('\n', ' ').strip()[:200]
                            break

            if result['income_text'] or result['income_table']:
                break

        pdf.close()

    except Exception as e:
        logger.warning(f'PDF eligibility parsing failed: {e}')

    return result


def scrape_lh_supply_info(announcement_url: str) -> List[Dict]:
    """Backward-compatible wrapper"""
    result = scrape_lh_detail(announcement_url)
    return result.get('units', [])
