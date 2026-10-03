import { useState } from 'react';
import { notification } from 'antd';
import { Icon } from '@iconify/react';
import { Button } from '@src/components/Button';
import { Card } from '@src/components/Card';
import { Input } from '@src/components/Input';
import { Spinner } from '@src/components/Spinner';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@src/components/Select';
import { useGetControllersQuery } from '@src/redux/generatedApi';
import {
  ControllerWithRole,
  DeviceRoleValue,
  useGetControllerSharesQuery,
  useShareControllerMutation,
  useUnshareControllerMutation,
} from '@src/redux/controllersApi';
import { errorMessage } from '@src/redux/helpers';

const ROLE_LABELS: Record<DeviceRoleValue, string> = {
  OWNER: 'Owner',
  EDITOR: 'Editor',
  VIEWER: 'Viewer',
};

/**
 * Sharing a whole board: every device on it, including ones added later, is shared with the user.
 */
export function BoardSharingCard() {
  const { data: controllers } = useGetControllersQuery();
  const { data: shares } = useGetControllerSharesQuery();
  const [share, { isLoading: isSharing }] = useShareControllerMutation();
  const [unshare] = useUnshareControllerMutation();

  const boards = (controllers ?? []) as ControllerWithRole[];
  const own = boards.filter(c => !c.role || c.role === 'OWNER');
  const sharedWithMe = boards.filter(c => c.role && c.role !== 'OWNER');

  const [boardId, setBoardId] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<DeviceRoleValue>('VIEWER');
  const selectedBoard = boardId || (own[0]?.id ? String(own[0].id) : '');

  const submit = async () => {
    const res = await share({ id: Number(selectedBoard), username: username.trim(), role });
    if ('error' in res) {
      notification.error({ message: 'Could not share the board', description: errorMessage(res.error) });
      return;
    }
    notification.success({ message: `Board shared with ${username.trim()}` });
    setUsername('');
  };

  const remove = async (controllerId: number, userId: number, name: string) => {
    const res = await unshare({ id: controllerId, userId });
    if ('error' in res) {
      notification.error({ message: 'Could not stop sharing', description: errorMessage(res.error) });
    } else {
      notification.success({ message: `${name} no longer has access` });
    }
  };

  return (
    <Card className="space-y-4">
      <div>
        <div className="text-xl font-semibold">Boards</div>
        <p className="text-sm text-slate-500">
          Share a whole board: the user gets every device on it, including devices you add later.
        </p>
      </div>

      {own.length === 0 ? (
        <p className="text-sm text-slate-500">You have no boards yet. Link one on the Devices page.</p>
      ) : (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={e => {
            e.preventDefault();
            submit();
          }}
        >
          <Select value={selectedBoard} onValueChange={setBoardId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Board" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {own.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Username"
            autoComplete="off"
            className="w-[200px]"
          />
          <Select value={role} onValueChange={v => setRole(v as DeviceRoleValue)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="VIEWER">Viewer</SelectItem>
                <SelectItem value="EDITOR">Editor</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button type="submit" disabled={isSharing || !selectedBoard || !username.trim()}>
            {isSharing ? <Spinner /> : <Icon icon="lucide:share-2" />}
            Share board
          </Button>
        </form>
      )}

      {own.map(board => {
        const boardShares = (shares ?? []).filter(s => s.controllerId === board.id);
        return (
          <div key={board.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
            <Icon icon="lucide:cpu" className="size-4 text-slate-500" />
            <span className="mr-2 font-medium">{board.name}</span>
            {boardShares.length === 0 ? (
              <span className="text-sm text-slate-400">not shared</span>
            ) : (
              boardShares.map(s => (
                <span
                  key={s.userId}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-50 py-0.5 pr-1 pl-2 text-xs text-blue-800"
                >
                  {s.username} · {ROLE_LABELS[s.role]}
                  <button
                    type="button"
                    title="Stop sharing"
                    className="rounded-full p-0.5 hover:bg-blue-100"
                    onClick={() => remove(board.id!, s.userId, s.username)}
                  >
                    <Icon icon="lucide:x" className="size-3" />
                  </button>
                </span>
              ))
            )}
          </div>
        );
      })}

      {sharedWithMe.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-slate-600">Shared with you</div>
          {sharedWithMe.map(board => (
            <div key={board.id} className="flex items-center gap-2 text-sm">
              <Icon icon="lucide:cpu" className="size-4 text-slate-500" />
              {board.name}
              <span className="text-xs text-slate-500">{ROLE_LABELS[board.role!]}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
