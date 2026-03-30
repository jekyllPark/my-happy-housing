'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { searchAddressByKeyword } from '@/lib/housing-api';
import { MapPin, Search, X } from 'lucide-react';

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/api/address/search?keyword=${lat.toFixed(4)},${lng.toFixed(4)}`
    );
    const data = await res.json();
    if (data.data?.[0]?.name) return data.data[0].name;
  } catch {}
  // Fallback: use Kakao SDK reverse geocode if available
  return new Promise((resolve) => {
    if (window.kakao?.maps?.services) {
      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.coord2Address(lng, lat, (result: any, status: any) => {
        if (status === window.kakao.maps.services.Status.OK && result[0]) {
          resolve(result[0].address?.address_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        } else {
          resolve(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }
      });
    } else {
      resolve(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  });
}

interface SearchFormProps {
  onSearch?: (params: {
    originLat: number;
    originLng: number;
    destinationLat: number;
    destinationLng: number;
  }) => void;
}

interface AddressOption {
  name: string;
  address?: string;
  lat: number;
  lng: number;
}

export function SearchForm({ onSearch }: SearchFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [originOptions, setOriginOptions] = useState<AddressOption[]>([]);
  const [destinationOptions, setDestinationOptions] = useState<AddressOption[]>([]);
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);
  const [showDestinationDropdown, setShowDestinationDropdown] = useState(false);
  const [selectedOrigin, setSelectedOrigin] = useState<AddressOption | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<AddressOption | null>(null);
  const [loading, setLoading] = useState(false);
  const originInputRef = useRef<HTMLInputElement>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);

  // Restore previous search from URL params
  useEffect(() => {
    const oLat = searchParams.get('originLat');
    const oLng = searchParams.get('originLng');
    const dLat = searchParams.get('destinationLat');
    const dLng = searchParams.get('destinationLng');
    const oName = searchParams.get('originName');
    const dName = searchParams.get('destinationName');

    if (oLat && oLng) {
      const lat = parseFloat(oLat);
      const lng = parseFloat(oLng);
      if (oName) {
        const name = decodeURIComponent(oName);
        setOrigin(name);
        setSelectedOrigin({ name, lat, lng });
      } else {
        // Reverse geocode to get address
        reverseGeocode(lat, lng).then(name => {
          setOrigin(name);
          setSelectedOrigin({ name, lat, lng });
        });
      }
    }
    if (dLat && dLng) {
      const lat = parseFloat(dLat);
      const lng = parseFloat(dLng);
      if (dName) {
        const name = decodeURIComponent(dName);
        setDestination(name);
        setSelectedDestination({ name, lat, lng });
      } else {
        reverseGeocode(lat, lng).then(name => {
          setDestination(name);
          setSelectedDestination({ name, lat, lng });
        });
      }
    }
  }, []);

  const handleAddressSearch = async (
    keyword: string,
    type: 'origin' | 'destination'
  ) => {
    if (!keyword.trim()) {
      if (type === 'origin') {
        setOriginOptions([]);
      } else {
        setDestinationOptions([]);
      }
      return;
    }

    try {
      setLoading(true);
      const results = await searchAddressByKeyword(keyword);
      if (type === 'origin') {
        setOriginOptions(results);
        setShowOriginDropdown(true);
      } else {
        setDestinationOptions(results);
        setShowDestinationDropdown(true);
      }
    } catch (error) {
      console.error('Address search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOriginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setOrigin(value);
    setSelectedOrigin(null);
    handleAddressSearch(value, 'origin');
  };

  const handleDestinationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDestination(value);
    setSelectedDestination(null);
    handleAddressSearch(value, 'destination');
  };

  const handleOriginSelect = (option: AddressOption) => {
    setSelectedOrigin(option);
    setOrigin(option.name);
    setShowOriginDropdown(false);
  };

  const handleDestinationSelect = (option: AddressOption) => {
    setSelectedDestination(option);
    setDestination(option.name);
    setShowDestinationDropdown(false);
  };

  const handleSearch = () => {
    if (!selectedOrigin || !selectedDestination) {
      alert('출발지와 목적지를 선택해주세요');
      return;
    }

    const params = new URLSearchParams({
      originLat: selectedOrigin.lat.toString(),
      originLng: selectedOrigin.lng.toString(),
      destinationLat: selectedDestination.lat.toString(),
      destinationLng: selectedDestination.lng.toString(),
      originName: selectedOrigin.name,
      destinationName: selectedDestination.name,
    });

    router.push(`/search?${params.toString()}`);

    if (onSearch) {
      onSearch({
        originLat: selectedOrigin.lat,
        originLng: selectedOrigin.lng,
        destinationLat: selectedDestination.lat,
        destinationLng: selectedDestination.lng,
      });
    }
  };

  const handleSwap = () => {
    const tempOrigin = origin;
    const tempSelectedOrigin = selectedOrigin;
    setOrigin(destination);
    setSelectedOrigin(selectedDestination);
    setDestination(tempOrigin);
    setSelectedDestination(tempSelectedOrigin);
  };

  const clearOrigin = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOrigin('');
    setSelectedOrigin(null);
    setOriginOptions([]);
    originInputRef.current?.focus();
  };

  const clearDestination = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDestination('');
    setSelectedDestination(null);
    setDestinationOptions([]);
    destinationInputRef.current?.focus();
  };

  return (
    <div className="w-full space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Origin Input */}
        <div className="relative">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            출발지
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <MapPin className="w-5 h-5" />
            </div>
            <input
              ref={originInputRef}
              type="text"
              value={origin}
              onChange={handleOriginChange}
              onFocus={() => origin && setShowOriginDropdown(true)}
              placeholder="출발지를 입력하세요"
              className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {origin && (
              <button
                onClick={clearOrigin}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Origin Dropdown */}
            {showOriginDropdown && originOptions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
                {originOptions.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleOriginSelect(option)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 border-b border-gray-200 last:border-b-0 transition-colors flex items-center gap-2"
                  >
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{option.name}</div>
                      {option.address && (
                        <div className="text-xs text-gray-400 truncate">{option.address}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Destination Input */}
        <div className="relative">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            목적지
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <MapPin className="w-5 h-5" />
            </div>
            <input
              ref={destinationInputRef}
              type="text"
              value={destination}
              onChange={handleDestinationChange}
              onFocus={() => destination && setShowDestinationDropdown(true)}
              placeholder="목적지를 입력하세요"
              className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {destination && (
              <button
                onClick={clearDestination}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Destination Dropdown */}
            {showDestinationDropdown && destinationOptions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
                {destinationOptions.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleDestinationSelect(option)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 border-b border-gray-200 last:border-b-0 transition-colors flex items-center gap-2"
                  >
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{option.name}</div>
                      {option.address && (
                        <div className="text-xs text-gray-400 truncate">{option.address}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Swap and Search Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleSwap}
          className="px-4 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors sm:w-auto"
        >
          출발/도착 전환
        </button>
        <button
          onClick={handleSearch}
          disabled={loading || !selectedOrigin || !selectedDestination}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Search className="w-5 h-5" />
          검색
        </button>
      </div>
    </div>
  );
}
