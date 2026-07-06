// SCR-10 — Профиль. getProfile/updateProfile/logout (mock), переключатель push (LOGIC-009).
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../app/SessionContext';
import { getProfile, registerPushTokenMock, updateProfile } from '../../api/endpoints';
import type { Client } from '../../api/types';
import { Button, Card, Modal, Spinner } from '../../shared/ui';

export function ProfilePage() {
  const navigate = useNavigate();
  const { logout } = useSession();
  const [client, setClient] = useState<Client | null>(null);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const pushSupported = typeof Notification !== 'undefined';

  useEffect(() => {
    getProfile().then((data) => {
      setClient(data);
      setName(data.name ?? '');
    });
  }, []);

  async function onSave() {
    setSaving(true);
    try {
      const updated = await updateProfile(name.trim());
      setClient(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function onTogglePush() {
    if (!pushEnabled) {
      const result = await registerPushTokenMock();
      setPushEnabled(result.granted);
    } else {
      setPushEnabled(false);
    }
  }

  function onLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  if (!client) return <Spinner label="Загружаем профиль…" />;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl text-ink-900">Профиль</h1>

      <Card className="flex flex-col gap-4">
        <div>
          <p className="text-sm text-ink-500">Телефон (логин, неизменяем)</p>
          <p className="font-medium text-ink-900">{client.phone || '—'}</p>
        </div>

        <div>
          <p className="text-sm text-ink-500">Имя</p>
          {editing ? (
            <div className="mt-1 flex gap-2">
              <input
                className="flex-1 rounded-xl border border-cream-200 bg-white px-3 py-2 text-sm outline-none focus-visible:border-terracotta-600"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
                autoFocus
              />
              <Button disabled={saving || !name.trim()} onClick={onSave}>
                {saving ? '…' : 'Сохранить'}
              </Button>
            </div>
          ) : (
            <div className="mt-1 flex items-center justify-between">
              <p className="font-medium text-ink-900">{client.name || 'Не указано'}</p>
              <Button variant="ghost" onClick={() => setEditing(true)}>
                Изменить
              </Button>
            </div>
          )}
        </div>
      </Card>

      <Card className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-ink-900">Напоминания о классах</p>
          <p className="text-xs text-ink-500">
            {pushSupported ? 'Push за 24 часа до старта класса' : 'Напоминания недоступны в этом браузере'}
          </p>
        </div>
        <button
          role="switch"
          aria-checked={pushEnabled}
          disabled={!pushSupported}
          onClick={onTogglePush}
          className={`h-7 w-12 rounded-full transition disabled:opacity-40 ${pushEnabled ? 'bg-terracotta-600' : 'bg-cream-200'}`}
        >
          <span
            className={`block h-5 w-5 translate-x-1 rounded-full bg-white shadow transition ${pushEnabled ? 'translate-x-6' : ''}`}
          />
        </button>
      </Card>

      <Button variant="ghost" className="mt-4 text-danger-600" onClick={() => setLogoutOpen(true)}>
        Выйти из аккаунта
      </Button>

      <Modal
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        title="Выйти из аккаунта?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setLogoutOpen(false)}>
              Остаться
            </Button>
            <Button variant="danger" onClick={onLogout}>
              Выйти
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-700">Вы сможете снова войти по номеру телефона в любой момент.</p>
      </Modal>
    </div>
  );
}
