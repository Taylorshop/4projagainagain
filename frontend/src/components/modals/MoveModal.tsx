import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Folder, Home, X } from 'lucide-react';
import { filesApi } from '../../api/files';
import type { Item } from '../../types';

interface Props {
  items: Item[];
  onSuccess: () => void;
  onClose: () => void;
}

export default function MoveModal({ items, onSuccess, onClose }: Props) {
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const itemIds = new Set(items.map((i) => i.id));

  const { data: folders } = useQuery({
    queryKey: ['folders-for-move', currentFolder],
    queryFn: () =>
      filesApi.list(currentFolder).then((r) =>
        // Exclude the items being moved (can't move a folder into itself)
        r.data.filter((i) => i.type === 'FOLDER' && !itemIds.has(i.id)),
      ),
  });

  const title = items.length === 1
    ? `Déplacer « ${items[0].name} »`
    : `Déplacer ${items.length} éléments`;

  async function moveTo(targetId: string | null) {
    setLoading(true);
    setError('');
    try {
      await Promise.all(items.map((item) => filesApi.move(item.id, targetId)));
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erreur lors du déplacement');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800 truncate pr-4">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0"><X className="w-5 h-5" /></button>
        </div>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <div className="space-y-1 max-h-64 overflow-y-auto mb-4">
          {currentFolder !== null && (
            <button
              onClick={() => setCurrentFolder(null)}
              className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-600"
            >
              <Home className="w-4 h-4 text-gray-400" />
              ← Remonter
            </button>
          )}

          <button
            onClick={() => moveTo(currentFolder)}
            disabled={loading}
            className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-sm text-blue-700 font-medium disabled:opacity-50"
          >
            Déplacer ici
          </button>

          {(folders ?? []).map((f) => (
            <button
              key={f.id}
              className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700"
              onClick={() => setCurrentFolder(f.id)}
            >
              <Folder className="w-4 h-4 text-yellow-400 flex-shrink-0" />
              <span className="truncate">{f.name}</span>
            </button>
          ))}

          {(folders ?? []).length === 0 && currentFolder && (
            <p className="text-xs text-gray-400 px-3 py-2">Aucun sous-dossier</p>
          )}
        </div>

        <button type="button" onClick={onClose} className="w-full text-sm text-gray-500 hover:text-gray-700">
          Annuler
        </button>
      </div>
    </div>
  );
}
