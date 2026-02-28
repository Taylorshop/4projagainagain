import { useEffect, useRef, useState } from 'react';
import { Download, Loader2, X } from 'lucide-react';
import { api } from '../../api/client';
import { filesApi } from '../../api/files';
import type { Item } from '../../types';

interface Props {
  item: Item;
  onClose: () => void;
}

type PreviewType = 'image' | 'video' | 'pdf' | 'text' | 'unsupported';

function getPreviewType(mimeType: string | null): PreviewType {
  if (!mimeType) return 'unsupported';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('text/')) return 'text';
  return 'unsupported';
}

/** Fetch a file as a blob via the authenticated API and return a blob:// URL. */
function useBlobUrl(itemId: string, active: boolean) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    api
      .get<Blob>(`/files/${itemId}/preview`, { responseType: 'blob' })
      .then(({ data }) => {
        if (cancelled) return;
        const url = URL.createObjectURL(data);
        urlRef.current = url;
        setBlobUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [itemId, active]);

  return { blobUrl, error };
}

export default function PreviewModal({ item, onClose }: Props) {
  const previewType = getPreviewType(item.mimeType);

  // Blob-based preview for PDF and image (avoids X-Frame-Options cross-origin block on iframes).
  // Videos use a direct token URL instead so the browser can stream without downloading fully first.
  const needsBlob = previewType === 'pdf' || previewType === 'image';
  const { blobUrl, error: blobError } = useBlobUrl(item.id, needsBlob);

  // Direct URL with token for video streaming
  const videoUrl = filesApi.previewUrl(item.id);

  // Text preview
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textError, setTextError] = useState(false);

  useEffect(() => {
    if (previewType !== 'text') return;
    api
      .get<string>(`/files/${item.id}/preview`, { responseType: 'text' })
      .then(({ data }) => setTextContent(data))
      .catch(() => setTextError(true));
  }, [item.id, previewType]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const loading = needsBlob && !blobUrl && !blobError;


  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 gap-3">
          <h2 className="font-medium text-gray-800 truncate flex-1">{item.name}</h2>
          <a
            href={filesApi.downloadUrl(item.id)}
            download
            className="text-gray-400 hover:text-blue-600 transition flex-shrink-0"
            title="Télécharger"
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="w-5 h-5" />
          </a>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition flex-shrink-0"
            title="Fermer (Échap)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-gray-50 p-4 min-h-0">
          {loading && <Loader2 className="w-8 h-8 animate-spin text-gray-300" />}

          {blobError && (
            <p className="text-gray-400 text-sm">Impossible de charger l'aperçu.</p>
          )}

          {previewType === 'image' && blobUrl && (
            <img
              src={blobUrl}
              alt={item.name}
              className="max-w-full max-h-full object-contain rounded"
            />
          )}

          {previewType === 'video' && (
            <video controls className="max-w-full max-h-full rounded">
              <source src={videoUrl} type={item.mimeType ?? undefined} />
              Votre navigateur ne supporte pas la lecture vidéo.
            </video>
          )}

          {previewType === 'pdf' && blobUrl && (
            <iframe
              src={blobUrl}
              className="w-full h-full min-h-[60vh] rounded border-0"
              title={item.name}
            />
          )}

          {previewType === 'text' && (
            <>
              {textContent === null && !textError && (
                <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
              )}
              {textError && (
                <p className="text-gray-400 text-sm">Impossible de charger ce fichier.</p>
              )}
              {textContent !== null && (
                <pre className="w-full max-h-full overflow-auto text-sm text-gray-800 bg-white p-4 rounded border border-gray-200 whitespace-pre-wrap break-words">
                  {textContent}
                </pre>
              )}
            </>
          )}

          {previewType === 'unsupported' && (
            <div className="text-center space-y-3">
              <p className="text-gray-400">Aperçu non disponible pour ce type de fichier.</p>
              <a
                href={filesApi.downloadUrl(item.id)}
                download
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition"
              >
                <Download className="w-4 h-4" /> Télécharger
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
