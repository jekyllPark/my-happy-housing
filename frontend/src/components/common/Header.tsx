'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, Home } from 'lucide-react';

export function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-gray-900">
            <div className="bg-blue-600 text-white rounded-lg p-2">
              <Home className="w-5 h-5" />
            </div>
            <span className="hidden sm:inline">나의 행복주택</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-5">
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              통근 검색
            </Link>
            <Link
              href="/commute"
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              통근시간 검색
            </Link>
            <Link
              href="/region"
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              지역별 검색
            </Link>
            <Link
              href="/eligibility"
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              자격요건
            </Link>
            <Link
              href="/browse"
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              유형별 공고
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-gray-600 hover:text-gray-900"
          >
            {isOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <nav className="md:hidden mt-4 pt-4 border-t border-gray-200 space-y-3">
            <Link
              href="/"
              className="block text-gray-600 hover:text-gray-900 font-medium py-2"
              onClick={() => setIsOpen(false)}
            >
              통근 검색
            </Link>
            <Link
              href="/commute"
              className="block text-gray-600 hover:text-gray-900 font-medium py-2"
              onClick={() => setIsOpen(false)}
            >
              통근시간 검색
            </Link>
            <Link
              href="/region"
              className="block text-gray-600 hover:text-gray-900 font-medium py-2"
              onClick={() => setIsOpen(false)}
            >
              지역별 검색
            </Link>
            <Link
              href="/eligibility"
              className="block text-gray-600 hover:text-gray-900 font-medium py-2"
              onClick={() => setIsOpen(false)}
            >
              자격요건
            </Link>
            <Link
              href="/browse"
              className="block text-gray-600 hover:text-gray-900 font-medium py-2"
              onClick={() => setIsOpen(false)}
            >
              유형별 공고
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
