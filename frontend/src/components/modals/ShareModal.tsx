import { useState } from 'react';
import { Check, Copy, Loader2, X } from 'lucide-react';
import { sharesApi } from '../../api/shares';
import type { Item } from '../../types';

interface Props {
  item: Item;
  onClose: () => void;
}

export default function ShareModal({ item, onClose }: Props) {
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  async function generateLink() {
    setLoading(true);
    setError('');
    try {
      const { data } = await sharesApi.create(item.id);
      const origin = window.location.origin;
      setLink(`${origin}/share/${data.token}`);
    } catch {
      setError('Impossible de créer le lien de partage.');
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Partager « {item.name} »</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        {!link ? (
          <button
            onClick={generateLink}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-medium transition disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Générer un lien de partage
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">Lien public (accessible sans connexion) :</p>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              <input
                readOnly
                value={link}
                className="flex-1 bg-transparent text-sm text-gray-700 outline-none truncate"
              />
              <button
                onClick={copy}
                className={`p-1.5 rounded-lg transition ${copied ? 'text-green-600' : 'text-gray-400 hover:text-blue-600'}`}
                title="Copier"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            {copied && <p className="text-xs text-green-600 text-center">Lien copié !</p>}
          </div>
        )}
      </div>
    </div>
  );
}
