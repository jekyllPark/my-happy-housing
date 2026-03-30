'use client';

import Link from 'next/link';
import { Mail, Phone, MapPin } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8 sm:mb-12">
          {/* About */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">나의 행복주택</h3>
            <p className="text-sm mb-4">
              출퇴근이 편한 저렴한 주택을 찾는 것이 우리의 목표입니다.
            </p>
            <Link
              href="/about"
              className="text-blue-400 hover:text-blue-300 text-sm font-medium"
            >
              서비스 소개 →
            </Link>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">빠른 링크</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  홈
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  서비스 소개
                </Link>
              </li>
            </ul>
          </div>

          {/* Housing Types */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">주택 유형</h3>
            <ul className="space-y-2 text-sm">
              <li className="hover:text-white transition-colors cursor-default">
                행복주택
              </li>
              <li className="hover:text-white transition-colors cursor-default">
                국민주택
              </li>
              <li className="hover:text-white transition-colors cursor-default">
                전세 및 구입용
              </li>
              <li className="hover:text-white transition-colors cursor-default">
                공공지원 주택
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">문의</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <a
                  href="mailto:info@example.com"
                  className="hover:text-white transition-colors"
                >
                  info@example.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <a
                  href="tel:1234567890"
                  className="hover:text-white transition-colors"
                >
                  1234-5678
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>서울시 강남구 테헤란로 123</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
            <p>
              © {currentYear} 나의 행복주택. 모든 권리 보유. |{' '}
              <a href="#" className="hover:text-white transition-colors">
                개인정보처리방침
              </a>{' '}
              |{' '}
              <a href="#" className="hover:text-white transition-colors">
                이용약관
              </a>
            </p>
            <div className="flex gap-4">
              {/* Social Links */}
              <a
                href="#"
                className="hover:text-white transition-colors"
                aria-label="Facebook"
              >
                Facebook
              </a>
              <a
                href="#"
                className="hover:text-white transition-colors"
                aria-label="Twitter"
              >
                Twitter
              </a>
              <a
                href="#"
                className="hover:text-white transition-colors"
                aria-label="Instagram"
              >
                Instagram
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
