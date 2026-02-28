import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Link2, Settings, Unlink } from 'lucide-react';
import Layout from '../components/Layout';
import { usersApi } from '../api/users';
import { authStore } from '../store/auth';
import { formatBytes } from '../utils/format';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export default function SettingsPage() {
  const user = authStore.getUser();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Profile
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Password
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  // Connections
  const [connMsg, setConnMsg] = useState('');
  const [connError, setConnError] = useState('');
  const [connLoading, setConnLoading] = useState(false);

  // Delete account
  const [deleteStep, setDeleteStep] = useState(0);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Quota
  const { data: quota } = useQuery({
    queryKey: ['quota'],
    queryFn: () => usersApi.getQuota().then((r) => r.data),
  });

  const { data: connections, refetch: refetchConnections } = useQuery({
    queryKey: ['connections'],
    queryFn: () => usersApi.getConnections().then((r) => r.data),
  });

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) return;
    setProfileLoading(true);
    setProfileMsg('');
    try {
      const { data } = await usersApi.updateProfile(displayName.trim());
      const tokens = { accessToken: authStore.getAccessToken()!, refreshToken: authStore.getRefreshToken()! };
      authStore.save({ ...tokens, user: { ...user!, displayName: data.displayName } });
      setProfileMsg('Profil mis à jour !');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch {
      setProfileMsg('Erreur lors de la mise à jour.');
    } finally {
      setProfileLoading(false);
    }
  }

  // Handle redirect back from Google OAuth link/error
  useEffect(() => {
    if (searchParams.get('linked') === '1') {
      setConnMsg('Google connecté !');
      refetchConnections();
      setSearchParams({});
      setTimeout(() => setConnMsg(''), 4000);
    } else if (searchParams.get('error') === 'link_failed') {
      setConnError('Échec de la connexion Google.');
      setSearchParams({});
    } else if (searchParams.get('error') === 'already_linked') {
      setConnError('Ce compte Google est déjà lié à un autre utilisateur.');
      setSearchParams({});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function disconnectGoogle() {
    setConnLoading(true);
    setConnMsg('');
    setConnError('');
    try {
      await usersApi.unlinkGoogle();
      setConnMsg('Google déconnecté.');
      refetchConnections();
      setTimeout(() => setConnMsg(''), 3000);
    } catch (err: any) {
      setConnError(err.response?.data?.message ?? 'Erreur lors de la déconnexion.');
    } finally {
      setConnLoading(false);
    }
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg('');
    setPwError('');
    if (pw.next !== pw.confirm) { setPwError('Les mots de passe ne correspondent pas.'); return; }
    if (pw.next.length < 8) { setPwError('Le nouveau mot de passe doit faire au moins 8 caractères.'); return; }
    setPwLoading(true);
    try {
      if (connections?.hasPassword) {
        await usersApi.changePassword(pw.current, pw.next);
        setPwMsg('Mot de passe modifié !');
      } else {
        await usersApi.setPassword(pw.next);
        setPwMsg('Mot de passe défini !');
        refetchConnections();
      }
      setPw({ current: '', next: '', confirm: '' });
      setTimeout(() => setPwMsg(''), 3000);
    } catch (err: any) {
      setPwError(err.response?.data?.message ?? 'Erreur lors de la mise à jour du mot de passe.');
    } finally {
      setPwLoading(false);
    }
  }

  async function confirmDeleteAccount() {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await usersApi.deleteAccount();
      authStore.clear();
      navigate('/login');
    } catch (err: any) {
      setDeleteError(err.response?.data?.message ?? 'Erreur lors de la suppression.');
      setDeleteStep(0);
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-xl space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-gray-500" />
          <h1 className="text-lg font-semibold text-gray-800">Paramètres</h1>
        </div>

        {/* Quota */}
        {quota && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
            <h2 className="font-medium text-gray-700">Espace de stockage</h2>
            <div className="flex justify-between text-sm text-gray-500">
              <span>{formatBytes(Number(quota.usedBytes))} utilisés</span>
              <span>{formatBytes(Number(quota.maxBytes))} total</span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${Math.min((Number(quota.usedBytes) / Number(quota.maxBytes)) * 100, 100)}%` }}
              />
            </div>
            <p className="text-sm text-gray-400">{formatBytes(Number(quota.freeBytes))} disponibles</p>
          </div>
        )}

        {/* Profile */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
          <h2 className="font-medium text-gray-700">Profil</h2>
          <div>
            <label className="text-sm text-gray-500">Email</label>
            <p className="text-sm font-medium text-gray-800 mt-0.5">{user?.email}</p>
          </div>
          <form onSubmit={saveProfile} className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Nom d'affichage</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            {profileMsg && (
              <p className="flex items-center gap-1.5 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" /> {profileMsg}
              </p>
            )}
            <button
              type="submit"
              disabled={profileLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-xl font-medium disabled:opacity-60 transition"
            >
              Enregistrer
            </button>
          </form>
        </div>

        {/* Password */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
          <h2 className="font-medium text-gray-700">
            {connections?.hasPassword ? 'Changer le mot de passe' : 'Définir un mot de passe'}
          </h2>
          <form onSubmit={submitPassword} className="space-y-3">
            {connections?.hasPassword && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">Mot de passe actuel</label>
                <input
                  type="password"
                  value={pw.current}
                  onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            )}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Nouveau mot de passe</label>
              <input
                type="password"
                value={pw.next}
                onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
                placeholder="••••••••"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Confirmer le mot de passe</label>
              <input
                type="password"
                value={pw.confirm}
                onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
                placeholder="••••••••"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            {pwError && <p className="text-sm text-red-600">{pwError}</p>}
            {pwMsg && (
              <p className="flex items-center gap-1.5 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" /> {pwMsg}
              </p>
            )}
            <button
              type="submit"
              disabled={pwLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-xl font-medium disabled:opacity-60 transition"
            >
              {connections?.hasPassword ? 'Changer le mot de passe' : 'Définir le mot de passe'}
            </button>
          </form>
        </div>

        {/* Connections */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
          <h2 className="font-medium text-gray-700">Connexions</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
              <div>
                <p className="text-sm font-medium text-gray-800">Google</p>
                <p className="text-xs text-gray-400">
                  {connections?.google ? 'Compte Google connecté' : 'Non connecté'}
                </p>
              </div>
            </div>
            {connections?.google ? (
              <button
                onClick={disconnectGoogle}
                disabled={connLoading || !connections.hasPassword}
                title={!connections.hasPassword ? 'Définissez un mot de passe avant de déconnecter Google' : undefined}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-xl hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <Unlink className="w-4 h-4" />
                Déconnecter
              </button>
            ) : (
              <a
                href={`${API_URL}/auth/oauth/google/link?token=${authStore.getAccessToken()}`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition"
              >
                <Link2 className="w-4 h-4" />
                Connecter
              </a>
            )}
          </div>
          {!connections?.hasPassword && connections?.google && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              Pour déconnecter Google, définissez d'abord un mot de passe ci-dessus.
            </p>
          )}
          {connError && <p className="text-sm text-red-600">{connError}</p>}
          {connMsg && (
            <p className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" /> {connMsg}
            </p>
          )}
        </div>

        {/* Danger zone */}
        <div className="bg-white border border-red-200 rounded-2xl p-5 space-y-4">
          <h2 className="font-medium text-red-700">Supprimer le compte</h2>
          {deleteStep === 0 ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Supprimer définitivement votre compte et tous vos fichiers.</p>
              <button
                onClick={() => setDeleteStep(1)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition"
              >
                Supprimer le compte
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  Cette action est <strong>irréversible</strong>. Tous vos fichiers, dossiers et partages seront supprimés définitivement.
                </span>
              </div>
              {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={confirmDeleteAccount}
                  disabled={deleteLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-xl font-medium disabled:opacity-60 transition"
                >
                  {deleteLoading ? 'Suppression...' : 'Confirmer la suppression'}
                </button>
                <button
                  onClick={() => { setDeleteStep(0); setDeleteError(''); }}
                  disabled={deleteLoading}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-xl font-medium disabled:opacity-60 transition"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
