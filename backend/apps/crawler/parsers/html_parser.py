import logging
from typing import Dict, List, Optional
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


class BaseHTMLParser:
    """
    Base HTML parser for housing complex and recruitment data
    """

    def __init__(self):
        self.soup = None

    def load_html(self, html_content):
        """
        Load HTML content into BeautifulSoup
        """
        self.soup = BeautifulSoup(html_content, 'html.parser')
        return self.soup

    def extract_text(self, selector, element=None, multiple=False):
        """
        Extract text from element(s) using CSS selector
        """
        target = element if element else self.soup

        if multiple:
            elements = target.select(selector)
            return [el.get_text(strip=True) for el in elements]
        else:
            el = target.select_one(selector)
            return el.get_text(strip=True) if el else None

    def extract_attribute(self, selector, attribute, element=None, multiple=False):
        """
        Extract attribute value from element(s)
        """
        target = element if element else self.soup

        if multiple:
            elements = target.select(selector)
            return [el.get(attribute) for el in elements if el.get(attribute)]
        else:
            el = target.select_one(selector)
            return el.get(attribute) if el else None

    def normalize_number(self, value):
        """
        Normalize numeric values (remove commas, 원, etc.)
        """
        if not value:
            return 0

        value = str(value).strip()
        value = value.replace(',', '').replace('원', '').strip()

        try:
            return int(float(value))
        except (ValueError, TypeError):
            return 0


class MyHomeHTMLParser(BaseHTMLParser):
    """
    Parser for myhome.go.kr HTML
    """

    def parse_complex_list(self) -> List[Dict]:
        """
        Parse complex list from search results
        """
        complexes = []

        if not self.soup:
            return complexes

        items = self.soup.select('.complex-item')

        for item in items:
            try:
                complex_data = {
                    'name': self.extract_text('.complex-name', item),
                    'address': self.extract_text('.complex-address', item),
                    'housing_type': 'happy',
                }
                complexes.append(complex_data)
            except Exception as e:
                logger.error(f'Error parsing complex item: {e}')

        return complexes

    def parse_recruitment_list(self) -> List[Dict]:
        """
        Parse recruitment information
        """
        recruitments = []

        if not self.soup:
            return recruitments

        items = self.soup.select('.recruitment-item')

        for item in items:
            try:
                recruitment_data = {
                    'recruitment_id': self.extract_text('.recruitment-id', item),
                    'apply_start': self.extract_text('.apply-start-date', item),
                    'apply_end': self.extract_text('.apply-end-date', item),
                }
                recruitments.append(recruitment_data)
            except Exception as e:
                logger.error(f'Error parsing recruitment item: {e}')

        return recruitments

    def parse_unit_details(self) -> List[Dict]:
        """
        Parse unit/supply details
        """
        units = []

        if not self.soup:
            return units

        items = self.soup.select('.unit-item')

        for item in items:
            try:
                unit_data = {
                    'unit_type': self.extract_text('.unit-type', item),
                    'exclusive_area': self.normalize_number(
                        self.extract_text('.unit-area', item)
                    ),
                    'deposit': self.normalize_number(
                        self.extract_text('.deposit', item)
                    ),
                    'monthly_rent': self.normalize_number(
                        self.extract_text('.monthly-rent', item)
                    ),
                }
                units.append(unit_data)
            except Exception as e:
                logger.error(f'Error parsing unit item: {e}')

        return units


class LHHTMLParser(BaseHTMLParser):
    """
    Parser for apply.lh.or.kr HTML
    """

    def parse_announcement_list(self) -> List[Dict]:
        """
        Parse announcement list from LH site
        """
        announcements = []

        if not self.soup:
            return announcements

        rows = self.soup.select('tbody tr')

        for row in rows:
            try:
                ann_data = {
                    'announcement_id': self.extract_text('td.announce-no', row),
                    'district': self.extract_text('td.district', row),
                    'address': self.extract_text('td.address', row),
                    'apply_start': self.extract_text('td.apply-start', row),
                    'apply_end': self.extract_text('td.apply-end', row),
                }
                announcements.append(ann_data)
            except Exception as e:
                logger.error(f'Error parsing announcement row: {e}')

        return announcements

    def parse_unit_table(self) -> List[Dict]:
        """
        Parse unit information table
        """
        units = []

        if not self.soup:
            return units

        rows = self.soup.select('.unit-table tbody tr')

        for row in rows:
            try:
                unit_data = {
                    'unit_type': self.extract_text('td.type', row),
                    'exclusive_area': self.normalize_number(
                        self.extract_text('td.area', row)
                    ),
                    'total_units': self.normalize_number(
                        self.extract_text('td.total', row)
                    ),
                    'deposit': self.normalize_number(
                        self.extract_text('td.deposit', row)
                    ),
                    'monthly_rent': self.normalize_number(
                        self.extract_text('td.rent', row)
                    ),
                }
                units.append(unit_data)
            except Exception as e:
                logger.error(f'Error parsing unit row: {e}')

        return units


class ApplyHomeHTMLParser(BaseHTMLParser):
    """
    Parser for applyhome.co.kr HTML
    """

    def parse_search_results(self) -> List[Dict]:
        """
        Parse search result items
        """
        results = []

        if not self.soup:
            return results

        items = self.soup.select('.search-result-item')

        for item in items:
            try:
                result_data = {
                    'name': self.extract_text('.complex-name', item),
                    'address': self.extract_text('.address', item),
                    'district': self.extract_text('.district', item),
                    'link': self.extract_attribute('a.detail-link', 'href', item),
                }
                results.append(result_data)
            except Exception as e:
                logger.error(f'Error parsing search result: {e}')

        return results

    def parse_complex_detail(self) -> Dict:
        """
        Parse complex detail page
        """
        data = {
            'name': self.extract_text('.complex-title'),
            'address': self.extract_text('.address-full'),
            'total_units': self.normalize_number(
                self.extract_text('.total-units')
            ),
            'phone': self.extract_text('.phone-number'),
            'website': self.extract_attribute('.website-link', 'href'),
        }

        return data

    def parse_recruitment_cards(self) -> List[Dict]:
        """
        Parse recruitment cards from detail page
        """
        recruitments = []

        if not self.soup:
            return recruitments

        cards = self.soup.select('.recruitment-card')

        for card in cards:
            try:
                rec_data = {
                    'recruitment_id': self.extract_text('.id', card),
                    'target_groups': self.extract_text('.target-groups', card),
                    'apply_start': self.extract_text('.start-date', card),
                    'apply_end': self.extract_text('.end-date', card),
                    'total_households': self.normalize_number(
                        self.extract_text('.households', card)
                    ),
                }
                recruitments.append(rec_data)
            except Exception as e:
                logger.error(f'Error parsing recruitment card: {e}')

        return recruitments
