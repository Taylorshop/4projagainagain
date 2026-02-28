import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../api/users';
import { formatBytes } from '../utils/format';

export default function QuotaBar() {
  const { data } = useQuery({
    queryKey: ['quota'],
    queryFn: () => usersApi.getQuota().then((r) => r.data),
  });

  if (!data) return null;

  const used = Number(data.usedBytes);
  const max = Number(data.maxBytes);
  const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0;
  const color = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-400' : 'bg-blue-500';

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-gray-500">
        <span>{formatBytes(used)} utilisés</span>
        <span>{formatBytes(max)}</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-gray-400">{formatBytes(Number(data.freeBytes))} disponibles</p>
    </div>
  );
}
