CSS_SELECTORS = {
    'myhome': {
        'description': 'CSS selectors for myhome.go.kr',
        'complex_list': '.complex-item',
        'complex_name': '.complex-name',
        'complex_address': '.complex-address',
        'recruitment_list': '.recruitment-item',
        'recruitment_id': '.recruitment-id',
        'unit_type': '.unit-type',
        'unit_area': '.unit-area',
        'deposit': '.deposit-amount',
        'monthly_rent': '.monthly-rent',
        'apply_start': '.apply-start-date',
        'apply_end': '.apply-end-date',
    },
    'lh': {
        'description': 'CSS selectors for apply.lh.or.kr',
        'complex_list': 'tbody tr',
        'complex_name': 'td.name',
        'complex_address': 'td.address',
        'recruitment_list': 'tbody tr',
        'recruitment_id': 'td.announce-no',
        'unit_type': 'td.unit-type',
        'unit_area': 'td.area',
        'deposit': 'td.deposit',
        'monthly_rent': 'td.rent',
        'apply_start': 'td.apply-start',
        'apply_end': 'td.apply-end',
    },
    'applyhome': {
        'description': 'CSS selectors for applyhome.co.kr',
        'complex_list': '.item-complex',
        'complex_name': '.name',
        'complex_address': '.address',
        'recruitment_list': '.item-recruitment',
        'recruitment_id': '.id',
        'unit_type': '.type',
        'unit_area': '.area',
        'deposit': '.deposit-amount',
        'monthly_rent': '.rent-amount',
        'apply_start': '.start-date',
        'apply_end': '.end-date',
    }
}

XPATH_SELECTORS = {
    'myhome': {
        'description': 'XPath selectors for myhome.go.kr',
        'complex_items': "//div[@class='complex-item']",
        'complex_name': ".//span[@class='name']",
    },
    'lh': {
        'description': 'XPath selectors for apply.lh.or.kr',
        'complex_items': "//tbody/tr",
        'complex_name': ".//td[@class='name']",
    },
    'applyhome': {
        'description': 'XPath selectors for applyhome.co.kr',
        'complex_items': "//div[@class='item-complex']",
        'complex_name': ".//div[@class='name']",
    }
}

SITE_URLS = {
    'myhome': {
        'base_url': 'https://www.myhome.go.kr',
        'search_url': 'https://www.myhome.go.kr/cs/mylist',
        'headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        'timeout': 30,
    },
    'lh': {
        'base_url': 'https://apply.lh.or.kr',
        'search_url': 'https://apply.lh.or.kr/applyhome/lesserPossible/list',
        'headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        'timeout': 30,
    },
    'applyhome': {
        'base_url': 'https://www.applyhome.co.kr',
        'search_url': 'https://www.applyhome.co.kr/search',
        'headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        'timeout': 30,
    }
}
