import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { CheckCircle, Loader2, Upload, X } from 'lucide-react';
import { filesApi } from '../api/files';

interface Props {
  parentId: string | null;
  onSuccess: () => void;
}

interface UploadTask {
  id: string;
  name: string;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  error?: string;
}

export default function Uploader({ parentId, onSuccess }: Props) {
  const [tasks, setTasks] = useState<UploadTask[]>([]);

  const updateTask = (id: string, patch: Partial<UploadTask>) =>
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const uploadFiles = useCallback(
    async (files: File[]) => {
      const id = Math.random().toString(36).slice(2);
      const names = files.map((f) => f.name).join(', ');
      setTasks((ts) => [...ts, { id, name: names, progress: 0, status: 'uploading' }]);
      try {
        await filesApi.upload(files, parentId, (pct) => updateTask(id, { progress: pct }));
        updateTask(id, { status: 'done', progress: 100 });
        onSuccess();
        setTimeout(() => setTasks((ts) => ts.filter((t) => t.id !== id)), 3000);
      } catch (err: any) {
        const msg = err.response?.data?.message ?? 'Erreur d\'upload';
        updateTask(id, { status: 'error', error: msg });
      }
    },
    [parentId, onSuccess],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted) => { if (accepted.length) uploadFiles(accepted); },
    multiple: true,
    noClick: false,
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/30'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className={`w-8 h-8 mx-auto mb-2 ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`} />
        <p className="text-sm text-gray-600">
          {isDragActive ? 'Déposez vos fichiers ici' : 'Glissez des fichiers ou cliquez pour importer'}
        </p>
        <p className="text-xs text-gray-400 mt-1">Plusieurs fichiers autorisés · 5 Go max par fichier</p>
      </div>

      {tasks.map((t) => (
        <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2">
            {t.status === 'uploading' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />}
            {t.status === 'done' && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
            {t.status === 'error' && <X className="w-4 h-4 text-red-500 flex-shrink-0" />}
            <span className="text-sm text-gray-700 truncate flex-1">{t.name}</span>
            <span className="text-xs text-gray-400">
              {t.status === 'uploading' ? `${t.progress}%` : t.status === 'done' ? 'Terminé' : 'Erreur'}
            </span>
          </div>
          {t.status === 'uploading' && (
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${t.progress}%` }}
              />
            </div>
          )}
          {t.status === 'error' && <p className="text-xs text-red-500">{t.error}</p>}
        </div>
      ))}
    </div>
  );
}
