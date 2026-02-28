import { useState } from 'react';
import {
  ChevronDown,
  Download,
  Eye,
  File,
  FileText,
  Folder,
  Image,
  Link2,
  MoreVertical,
  Move,
  Pencil,
  Trash2,
  Video,
} from 'lucide-react';
import type { Item } from '../types';
import { formatBytes, formatDate } from '../utils/format';
import { filesApi } from '../api/files';

interface Props {
  items: Item[];
  onNavigate: (id: string) => void;
  onPreview: (item: Item) => void;
  onShare: (item: Item) => void;
  onRename: (item: Item) => void;
  onMove: (item: Item) => void;
  onTrash: (item: Item) => void;
  onBulkTrash: (items: Item[]) => void;
  onBulkMove: (items: Item[]) => void;
}

function ItemIcon({ item }: { item: Item }) {
  if (item.type === 'FOLDER') return <Folder className="w-5 h-5 text-yellow-400 flex-shrink-0" />;
  const m = item.mimeType ?? '';
  if (m.startsWith('image/')) return <Image className="w-5 h-5 text-green-500 flex-shrink-0" />;
  if (m.startsWith('video/')) return <Video className="w-5 h-5 text-purple-500 flex-shrink-0" />;
  if (m.startsWith('text/') || m === 'application/pdf')
    return <FileText className="w-5 h-5 text-orange-400 flex-shrink-0" />;
  return <File className="w-5 h-5 text-gray-400 flex-shrink-0" />;
}

function canPreview(item: Item): boolean {
  const m = item.mimeType ?? '';
  return (
    item.type === 'FILE' &&
    (m.startsWith('image/') ||
      m.startsWith('video/') ||
      m.startsWith('text/') ||
      m === 'application/pdf')
  );
}

function ActionMenu({
  item,
  pos,
  onPreview,
  onShare,
  onRename,
  onMove,
  onTrash,
  onClose,
}: {
  item: Item;
  pos: { top: number; right: number };
  onPreview: () => void;
  onShare: () => void;
  onRename: () => void;
  onMove: () => void;
  onTrash: () => void;
  onClose: () => void;
}) {
  function action(fn: () => void) { fn(); onClose(); }

  return (
    <div
      className="fixed z-30 w-48 bg-white border border-gray-200 rounded-xl shadow-lg py-1 text-sm"
      style={{ top: pos.top, right: pos.right }}
      onClick={(e) => e.stopPropagation()}
    >
      {canPreview(item) && (
        <button className="flex w-full items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-700" onClick={() => action(onPreview)}>
          <Eye className="w-4 h-4" /> Aperçu
        </button>
      )}
      {item.type === 'FILE' && (
        <a href={filesApi.downloadUrl(item.id)} download className="flex w-full items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-700" onClick={onClose}>
          <Download className="w-4 h-4" /> Télécharger
        </a>
      )}
      {item.type === 'FOLDER' && (
        <a href={filesApi.zipUrl(item.id)} download className="flex w-full items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-700" onClick={onClose}>
          <Download className="w-4 h-4" /> Télécharger (.zip)
        </a>
      )}
      <button className="flex w-full items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-700" onClick={() => action(onShare)}>
        <Link2 className="w-4 h-4" /> Partager
      </button>
      <button className="flex w-full items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-700" onClick={() => action(onRename)}>
        <Pencil className="w-4 h-4" /> Renommer
      </button>
      <button className="flex w-full items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-700" onClick={() => action(onMove)}>
        <Move className="w-4 h-4" /> Déplacer
      </button>
      <hr className="my-1 border-gray-100" />
      <button className="flex w-full items-center gap-2 px-4 py-2 hover:bg-red-50 text-red-600" onClick={() => action(onTrash)}>
        <Trash2 className="w-4 h-4" /> Supprimer
      </button>
    </div>
  );
}

export default function FileList({
  items,
  onNavigate,
  onPreview,
  onShare,
  onRename,
  onMove,
  onTrash,
  onBulkTrash,
  onBulkMove,
}: Props) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const [sortKey, setSortKey] = useState<'name' | 'updatedAt' | 'sizeBytes'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function openMenuFor(e: React.MouseEvent<HTMLButtonElement>, itemId: string) {
    e.stopPropagation();
    if (openMenu === itemId) { setOpenMenu(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setOpenMenu(itemId);
  }

  function toggleSort(key: typeof sortKey) {
    if (key === sortKey) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function clearSelection() { setSelected(new Set()); }

  const safeItems = Array.isArray(items) ? items : [];
  const sorted = [...safeItems].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'FOLDER' ? -1 : 1;
    let cmp = 0;
    if (sortKey === 'name') cmp = a.name.localeCompare(b.name, 'fr');
    else if (sortKey === 'updatedAt') cmp = a.updatedAt.localeCompare(b.updatedAt);
    else if (sortKey === 'sizeBytes') cmp = Number(a.sizeBytes ?? 0) - Number(b.sizeBytes ?? 0);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const selectedItems = sorted.filter((i) => selected.has(i.id));
  const allSelected = sorted.length > 0 && selected.size === sorted.length;
  const inSelectionMode = selected.size > 0;

  if (safeItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400 select-none">
        <Folder className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-sm">Ce dossier est vide</p>
        <p className="text-xs mt-1">Cliquez sur « Importer »</p>
      </div>
    );
  }

  const SortHeader = ({ label, k }: { label: string; k: typeof sortKey }) => (
    <button
      onClick={() => toggleSort(k)}
      className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800 uppercase tracking-wide"
    >
      {label}
      {sortKey === k && (
        <ChevronDown className={`w-3 h-3 transition-transform ${sortDir === 'desc' ? 'rotate-180' : ''}`} />
      )}
    </button>
  );

  const activeItem = openMenu ? sorted.find((i) => i.id === openMenu) : null;

  return (
    <div className="w-full">
      {/* Bulk action bar */}
      {inSelectionMode && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 border-b border-blue-100">
          <span className="text-sm font-medium text-blue-700 flex-1">
            {selected.size} élément{selected.size > 1 ? 's' : ''} sélectionné{selected.size > 1 ? 's' : ''}
          </span>
          <button
            onClick={() => { onBulkMove(selectedItems); clearSelection(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition"
          >
            <Move className="w-3.5 h-3.5" /> Déplacer
          </button>
          <button
            onClick={() => { onBulkTrash(selectedItems); clearSelection(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition"
          >
            <Trash2 className="w-3.5 h-3.5" /> Supprimer
          </button>
          <button onClick={clearSelection} className="text-xs text-gray-400 hover:text-gray-600 ml-1">
            Annuler
          </button>
        </div>
      )}

      {/* Context menu portal */}
      {activeItem && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpenMenu(null)} />
          <ActionMenu
            item={activeItem}
            pos={menuPos}
            onPreview={() => onPreview(activeItem)}
            onShare={() => onShare(activeItem)}
            onRename={() => onRename(activeItem)}
            onMove={() => onMove(activeItem)}
            onTrash={() => onTrash(activeItem)}
            onClose={() => setOpenMenu(null)}
          />
        </>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="w-10 px-3 py-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => {
                    if (allSelected) clearSelection();
                    else setSelected(new Set(sorted.map((i) => i.id)));
                  }}
                  className="rounded border-gray-300 text-blue-600 cursor-pointer"
                />
              </th>
              <th className="text-left px-2 py-2"><SortHeader label="Nom" k="name" /></th>
              <th className="text-left px-4 py-2 hidden sm:table-cell"><SortHeader label="Modifié" k="updatedAt" /></th>
              <th className="text-right px-4 py-2 hidden sm:table-cell"><SortHeader label="Taille" k="sizeBytes" /></th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => {
              const isSelected = selected.has(item.id);
              return (
                <tr
                  key={item.id}
                  className={`group border-b border-gray-50 cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50/60' : 'hover:bg-blue-50/30'
                  }`}
                  onClick={() => {
                    if (openMenu === item.id) return setOpenMenu(null);
                    if (inSelectionMode) { toggleSelect(item.id); return; }
                    if (item.type === 'FOLDER') onNavigate(item.id);
                    else if (canPreview(item)) onPreview(item);
                  }}
                >
                  <td className="w-10 px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(item.id)}
                      className={`rounded border-gray-300 text-blue-600 cursor-pointer transition-opacity ${
                        inSelectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    />
                  </td>
                  <td className="px-2 py-3 font-medium text-gray-800 max-w-[200px] truncate">
                    <span className="flex items-center gap-2">
                      <ItemIcon item={item} />
                      {item.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                    {formatDate(item.updatedAt)}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-right hidden sm:table-cell">
                    {item.type === 'FILE' && item.sizeBytes ? formatBytes(Number(item.sizeBytes)) : '—'}
                  </td>
                  <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-100 text-gray-500 transition"
                      onClick={(e) => openMenuFor(e, item.id)}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
