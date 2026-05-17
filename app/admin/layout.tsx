import Link from 'next/link';

const navItems = [
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/settings', label: 'Settings' },
  { href: '/', label: '← POS Terminal' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-6">
        <div className="flex items-center gap-2 mr-4">
          <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-xs">
            VX
          </div>
          <span className="text-white font-bold text-sm">Admin</span>
        </div>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
