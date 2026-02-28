import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderPlus, Loader2, Search, Upload, X } from 'lucide-react';

import Layout from '../components/Layout';
import Breadcrumb, { type BreadcrumbItem } from '../components/Breadcrumb';
import FileList from '../components/FileList';
import Uploader from '../components/Uploader';
import PreviewModal from '../components/modals/PreviewModal';
import ShareModal from '../components/modals/ShareModal';
import CreateFolderModal from '../components/modals/CreateFolderModal';
import RenameModal from '../components/modals/RenameModal';
import MoveModal from '../components/modals/MoveModal';
import { filesApi } from '../api/files';
import type { Item } from '../types';

type Modal =
  | { type: 'upload' }
  | { type: 'createFolder' }
  | { type: 'preview'; item: Item }
  | { type: 'share'; item: Item }
  | { type: 'rename'; item: Item }
  | { type: 'move'; items: Item[] };

export default function FilesPage() {
  const qc = useQueryClient();

  // Navigation state (stack of visited folders)
  const [folderStack, setFolderStack] = useState<BreadcrumbItem[]>([]);
  const currentFolderId: string | null = folderStack[folderStack.length - 1]?.id ?? null;

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  // Modal state
  const [modal, setModal] = useState<Modal | null>(null);

  function refresh() {
    qc.invalidateQueries({ queryKey: ['files'] });
    qc.invalidateQueries({ queryKey: ['quota'] });
  }

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: items, isLoading } = useQuery({
    queryKey: ['files', 'list', currentFolderId],
    queryFn: () => filesApi.list(currentFolderId).then((r) => r.data),
    enabled: !debouncedQ,
  });

  const { data: searchResults } = useQuery({
    queryKey: ['files', 'search', debouncedQ],
    queryFn: () => filesApi.search(debouncedQ).then((r) => r.data),
    enabled: !!debouncedQ,
  });

  const displayedItems = debouncedQ ? (searchResults ?? []) : (items ?? []);

  // ── Navigation ────────────────────────────────────────────────────────────
  function navigateTo(folderId: string) {
    filesApi.get(folderId).then(({ data }) => {
      setFolderStack((s) => [...s, { id: data.id, name: data.name }]);
    });
  }

  function navigateToBreadcrumb(id: string | null) {
    if (id === null) { setFolderStack([]); return; }
    const idx = folderStack.findIndex((f) => f.id === id);
    if (idx >= 0) setFolderStack(folderStack.slice(0, idx + 1));
  }

  // ── Search ────────────────────────────────────────────────────────────────
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleSearchChange(v: string) {
    setSearchQuery(v);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setDebouncedQ(v.trim()), 300);
  }
  function clearSearch() { setSearchQuery(''); setDebouncedQ(''); }

  // ── Trash ─────────────────────────────────────────────────────────────────
  async function handleTrash(item: Item) {
    if (!confirm(`Supprimer « ${item.name} » ? (récupérable depuis la corbeille)`)) return;
    await filesApi.trash(item.id);
    refresh();
  }

  async function handleBulkTrash(items: Item[]) {
    const names = items.length === 1 ? `« ${items[0].name} »` : `${items.length} éléments`;
    if (!confirm(`Supprimer ${names} ? (récupérable depuis la corbeille)`)) return;
    await Promise.all(items.map((i) => filesApi.trash(i.id)));
    refresh();
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-4">
        {/* Header toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Rechercher…"
              className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            {searchQuery && (
              <button onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Actions */}
          <button
            onClick={() => setModal({ type: 'createFolder' })}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            <FolderPlus className="w-4 h-4" /> Nouveau dossier
          </button>
          <button
            onClick={() => setModal({ type: 'upload' })}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition"
          >
            <Upload className="w-4 h-4" /> Importer
          </button>
        </div>

        {/* Breadcrumb */}
        {!debouncedQ && (
          <Breadcrumb items={folderStack} onNavigate={navigateToBreadcrumb} />
        )}
        {debouncedQ && (
          <p className="text-sm text-gray-500">
            Résultats de recherche pour <strong>« {debouncedQ} »</strong>
          </p>
        )}

        {/* Upload panel (inline) */}
        {modal?.type === 'upload' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium text-gray-700">Importer des fichiers</h3>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <Uploader
              parentId={currentFolderId}
              onSuccess={() => { refresh(); }}
            />
          </div>
        )}

        {/* File list */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {isLoading && !debouncedQ ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <FileList
              items={displayedItems}
              onNavigate={navigateTo}
              onPreview={(item) => setModal({ type: 'preview', item })}
              onShare={(item) => setModal({ type: 'share', item })}
              onRename={(item) => setModal({ type: 'rename', item })}
              onMove={(item) => setModal({ type: 'move', items: [item] })}
              onTrash={handleTrash}
              onBulkTrash={handleBulkTrash}
              onBulkMove={(items) => setModal({ type: 'move', items })}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      {modal?.type === 'createFolder' && (
        <CreateFolderModal
          parentId={currentFolderId}
          onSuccess={refresh}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'preview' && (
        <PreviewModal item={modal.item} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'share' && (
        <ShareModal item={modal.item} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'rename' && (
        <RenameModal item={modal.item} onSuccess={refresh} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'move' && (
        <MoveModal items={modal.items} onSuccess={refresh} onClose={() => setModal(null)} />
      )}
    </Layout>
  );
}
