import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Download, File, Folder } from 'lucide-react';
import { sharesApi } from '../api/shares';
import { formatBytes } from '../utils/format';

export default function PublicSharePage() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-share', token],
    queryFn: () => sharesApi.getPublic(token!).then((r) => r.data),
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Chargement…</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-2">Lien de partage invalide ou expiré.</p>
          <p className="text-gray-400 text-sm">Ce lien n'existe pas ou a été révoqué.</p>
        </div>
      </div>
    );
  }

  const { item } = data;
  const isFolder = item.type === 'FOLDER';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="flex flex-col items-center gap-4 mb-6">
          {isFolder ? (
            <Folder className="w-16 h-16 text-yellow-400" />
          ) : (
            <File className="w-16 h-16 text-blue-400" />
          )}
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-800 break-all">{item.name}</h2>
            {item.sizeBytes && (
              <p className="text-sm text-gray-500 mt-1">{formatBytes(Number(item.sizeBytes))}</p>
            )}
            {item.mimeType && (
              <p className="text-xs text-gray-400">{item.mimeType}</p>
            )}
          </div>
        </div>

        <a
          href={sharesApi.publicDownloadUrl(token!)}
          download
          className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition"
        >
          <Download className="w-5 h-5" />
          {isFolder ? 'Télécharger le dossier (.zip)' : 'Télécharger'}
        </a>

        <p className="mt-4 text-center text-xs text-gray-400">Partagé via SUPFile</p>
      </div>
    </div>
  );
}
