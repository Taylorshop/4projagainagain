import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  id: string | null;
  name: string;
}

interface Props {
  items: BreadcrumbItem[];
  onNavigate: (id: string | null) => void;
}

export default function Breadcrumb({ items, onNavigate }: Props) {
  return (
    <nav className="flex items-center gap-1 text-sm overflow-x-auto whitespace-nowrap py-1">
      <button
        onClick={() => onNavigate(null)}
        className="flex items-center gap-1 text-gray-500 hover:text-blue-600 transition flex-shrink-0"
      >
        <Home className="w-4 h-4" />
        <span>Mes fichiers</span>
      </button>

      {items.map((item, i) => (
        <span key={item.id ?? 'root'} className="flex items-center gap-1">
          <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
          {i < items.length - 1 ? (
            <button
              onClick={() => onNavigate(item.id)}
              className="text-gray-500 hover:text-blue-600 transition max-w-[160px] truncate"
            >
              {item.name}
            </button>
          ) : (
            <span className="text-gray-800 font-medium max-w-[160px] truncate">{item.name}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
