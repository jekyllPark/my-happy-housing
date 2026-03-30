import logging
import pdfplumber
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)


class BasePDFParser:
    """
    Base PDF parser for extracting housing data from PDF documents
    """

    def __init__(self, pdf_path: str):
        self.pdf_path = pdf_path
        self.pdf = None

    def load_pdf(self):
        """
        Load PDF file using pdfplumber
        """
        try:
            self.pdf = pdfplumber.open(self.pdf_path)
            return self.pdf
        except Exception as e:
            logger.error(f'Failed to load PDF {self.pdf_path}: {e}')
            return None

    def close_pdf(self):
        """
        Close PDF file
        """
        if self.pdf:
            self.pdf.close()
            self.pdf = None

    def extract_text_from_page(self, page_number: int) -> str:
        """
        Extract all text from a specific page
        """
        if not self.pdf or page_number >= len(self.pdf.pages):
            return ""

        try:
            page = self.pdf.pages[page_number]
            return page.extract_text()
        except Exception as e:
            logger.error(f'Error extracting text from page {page_number}: {e}')
            return ""

    def extract_table_from_page(self, page_number: int) -> List[List[str]]:
        """
        Extract table data from a specific page
        """
        if not self.pdf or page_number >= len(self.pdf.pages):
            return []

        try:
            page = self.pdf.pages[page_number]
            tables = page.extract_tables()
            return tables[0] if tables else []
        except Exception as e:
            logger.error(f'Error extracting table from page {page_number}: {e}')
            return []

    def extract_all_tables(self) -> List[List[List[str]]]:
        """
        Extract all tables from PDF
        """
        if not self.pdf:
            return []

        all_tables = []
        try:
            for page in self.pdf.pages:
                tables = page.extract_tables()
                if tables:
                    all_tables.extend(tables)
        except Exception as e:
            logger.error(f'Error extracting all tables: {e}')

        return all_tables

    def normalize_number(self, value: str) -> int:
        """
        Normalize numeric values
        """
        if not value:
            return 0

        value = str(value).strip()
        value = value.replace(',', '').replace('원', '').strip()

        try:
            return int(float(value))
        except (ValueError, TypeError):
            return 0


class AnnouncementPDFParser(BasePDFParser):
    """
    Parser for housing announcement PDF documents
    """

    def parse_announcement_info(self) -> Dict:
        """
        Parse announcement header information
        """
        data = {
            'announcement_id': None,
            'announcement_date': None,
            'title': None,
        }

        if not self.pdf:
            return data

        try:
            first_page_text = self.extract_text_from_page(0)

            lines = first_page_text.split('\n')
            for line in lines[:20]:
                if '공고' in line or 'announcement' in line.lower():
                    data['title'] = line.strip()
                    break

        except Exception as e:
            logger.error(f'Error parsing announcement info: {e}')

        return data

    def parse_supply_unit_table(self, page_number: int = 0) -> List[Dict]:
        """
        Parse supply unit information from PDF table
        """
        units = []

        try:
            table_data = self.extract_table_from_page(page_number)

            if not table_data:
                return units

            for row in table_data[1:]:
                if len(row) >= 6:
                    try:
                        unit_data = {
                            'unit_type': row[0].strip() if row[0] else None,
                            'exclusive_area': self.normalize_number(row[1]),
                            'supply_area': self.normalize_number(row[2]),
                            'total_units': self.normalize_number(row[3]),
                            'deposit': self.normalize_number(row[4]),
                            'monthly_rent': self.normalize_number(row[5]),
                        }
                        units.append(unit_data)
                    except Exception as e:
                        logger.warning(f'Error parsing unit row: {e}')
                        continue

        except Exception as e:
            logger.error(f'Error parsing supply unit table: {e}')

        return units

    def parse_eligibility_requirements(self, page_number: int = 1) -> Dict:
        """
        Parse eligibility requirements from PDF
        """
        requirements = {
            'income_limits': {},
            'asset_limits': {},
            'other_criteria': [],
        }

        try:
            text = self.extract_text_from_page(page_number)

            lines = text.split('\n')
            for line in lines:
                if '소득' in line:
                    requirements['other_criteria'].append(line.strip())
                elif '자산' in line:
                    requirements['other_criteria'].append(line.strip())
                elif '나이' in line or '연령' in line:
                    requirements['other_criteria'].append(line.strip())

        except Exception as e:
            logger.error(f'Error parsing eligibility requirements: {e}')

        return requirements


class SpecificationSheetPDFParser(BasePDFParser):
    """
    Parser for detailed specification sheets
    """

    def parse_unit_specifications(self) -> List[Dict]:
        """
        Parse detailed unit specifications
        """
        specifications = []

        try:
            all_tables = self.extract_all_tables()

            for table in all_tables:
                if len(table) > 0:
                    parsed_table = self._parse_specification_table(table)
                    specifications.extend(parsed_table)

        except Exception as e:
            logger.error(f'Error parsing unit specifications: {e}')

        return specifications

    def _parse_specification_table(self, table: List[List[str]]) -> List[Dict]:
        """
        Parse individual specification table
        """
        specs = []

        try:
            for row in table[1:]:
                if len(row) >= 3:
                    spec_data = {
                        'item': row[0].strip() if row[0] else None,
                        'specification': row[1].strip() if row[1] else None,
                        'notes': row[2].strip() if len(row) > 2 and row[2] else None,
                    }
                    specs.append(spec_data)
        except Exception as e:
            logger.warning(f'Error parsing specification row: {e}')

        return specs

    def parse_floor_plans(self) -> List[Dict]:
        """
        Extract floor plan information
        """
        plans = []

        try:
            for i, page in enumerate(self.pdf.pages):
                text = page.extract_text()

                if '평면도' in text or 'floor plan' in text.lower():
                    plan_data = {
                        'page': i,
                        'description': text[:200],
                    }
                    plans.append(plan_data)

        except Exception as e:
            logger.error(f'Error parsing floor plans: {e}')

        return plans
