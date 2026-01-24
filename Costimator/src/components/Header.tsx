'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/');

  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="text-2xl font-bold text-blue-600">C</span>
            </div>
            <div>
              <div className="text-xl font-bold">Costimator</div>
              <div className="text-xs text-blue-100">DPWH Estimation System</div>
            </div>
          </Link>

          <nav className="flex items-center space-x-1">
            <Link
              href="/"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${pathname === '/' ? 'bg-white text-blue-600 shadow-md' : 'text-white hover:bg-blue-500'}`}
            >
              Home
            </Link>

            <div className="relative group">
              <button suppressHydrationWarning className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/projects') ? 'bg-white text-blue-600 shadow-md' : 'text-white hover:bg-blue-500'}`}>
                Projects 
              </button>
              <div className="absolute left-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <Link href="/projects" className={`block px-4 py-3 text-sm hover:bg-blue-50 first:rounded-t-lg ${isActive('/projects') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700'}`}> All Projects</Link>
                <Link href="/projects?type=takeoff" className="block px-4 py-3 text-sm hover:bg-blue-50 text-gray-700"> Quantity Takeoff</Link>
                <Link href="/projects?type=boq" className="block px-4 py-3 text-sm hover:bg-blue-50 last:rounded-b-lg text-gray-700"> BOQ Projects</Link>
              </div>
            </div>

            <div className="relative group">
              <button suppressHydrationWarning className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/estimate') || isActive('/dupa-templates') ? 'bg-white text-blue-600 shadow-md' : 'text-white hover:bg-blue-500'}`}>
                Estimation 
              </button>
              <div className="absolute left-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <Link href="/estimate" className={`block px-4 py-3 text-sm hover:bg-blue-50 first:rounded-t-lg ${isActive('/estimate') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700'}`}> Legacy Estimates</Link>
                <Link href="/dupa-templates" className={`block px-4 py-3 text-sm hover:bg-blue-50 last:rounded-b-lg ${isActive('/dupa-templates') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700'}`}> DUPA Templates</Link>
                <div className="border-t border-gray-100"></div>
                <div className="px-4 py-2 text-xs text-gray-500">
                  💡 Create estimates from Projects tab
                </div>
              </div>
            </div>

            <div className="relative group">
              <button suppressHydrationWarning className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/master') || isActive('/catalog') ? 'bg-white text-blue-600 shadow-md' : 'text-white hover:bg-blue-500'}`}>
                Master Data 
              </button>
              <div className="absolute left-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <Link href="/master" className={`block px-4 py-3 text-sm hover:bg-blue-50 first:rounded-t-lg ${pathname === '/master' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700'}`}> Master Data Home</Link>
                <div className="border-t border-gray-100"></div>
                <Link href="/master/materials" className={`block px-4 py-3 text-sm hover:bg-blue-50 ${isActive('/master/materials') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700'}`}> CMPD (Materials & Prices)</Link>
                <Link href="/master/equipment" className={`block px-4 py-3 text-sm hover:bg-blue-50 ${isActive('/master/equipment') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700'}`}> Equipment</Link>
                <Link href="/master/labor" className={`block px-4 py-3 text-sm hover:bg-blue-50 ${isActive('/master/labor') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700'}`}> Labor Rates</Link>
                <div className="border-t border-gray-100"></div>
                <Link href="/catalog" className={`block px-4 py-3 text-sm hover:bg-blue-50 last:rounded-b-lg ${isActive('/catalog') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700'}`}> DPWH Pay Items</Link>
              </div>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
