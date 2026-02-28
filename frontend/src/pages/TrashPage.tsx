import { useQuery, useQueryClient } from '@tanstack/react-query';
import { File, Folder, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import Layout from '../components/Layout';
import { filesApi } from '../api/files';
import { formatDate } from '../utils/format';
import type { Item } from '../types';

export default function TrashPage() {
  const qc = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ['files', 'trash'],
    queryFn: () => filesApi.listTrash().then((r) => r.data),
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ['files'] });
    qc.invalidateQueries({ queryKey: ['quota'] });
  }

  async function restore(item: Item) {
    await filesApi.restore(item.id);
    refresh();
  }

  async function permanentDelete(item: Item) {
    if (!confirm(`Supprimer définitivement « ${item.name} » ? Cette action est irréversible.`)) return;
    await filesApi.permanentDelete(item.id);
    refresh();
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Trash2 className="w-5 h-5 text-gray-500" />
          <h1 className="text-lg font-semibold text-gray-800">Corbeille</h1>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : !items?.length ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <Trash2 className="w-14 h-14 mb-4 opacity-20" />
              <p className="text-sm">La corbeille est vide</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-2 w-10"></th>
                  <th className="text-left px-2 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Nom</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">Supprimé le</th>
                  <th className="w-32"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      {item.type === 'FOLDER'
                        ? <Folder className="w-5 h-5 text-yellow-300" />
                        : <File className="w-5 h-5 text-gray-300" />}
                    </td>
                    <td className="px-2 py-3 text-gray-600 max-w-[200px] truncate">{item.name}</td>
                    <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">
                      {item.trashedAt ? formatDate(item.trashedAt) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => restore(item)}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                          title="Restaurer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Restaurer
                        </button>
                        <button
                          onClick={() => permanentDelete(item)}
                          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium"
                          title="Supprimer définitivement"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}
