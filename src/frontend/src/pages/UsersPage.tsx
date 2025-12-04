import { useMemo, useState } from 'react';
import { NotificationType } from '@src/lib/api/api.types';
import { Loader } from '@src/components/Loader';
import { PageHeader, PageHeaderTitle } from '@src/components/PageHeader';
import { Button } from '@src/components/Button';
import { Icon } from '@iconify/react';
import { Card } from '@src/components/Card';
import { PageLayout } from '@src/layouts/PageLayout';
import { H1, H3 } from '@src/components/Text';
import {
  GetUsersApiResponse,
  useGetUserQuery,
  useGetUsersQuery,
} from '@src/redux/generatedApi';
import { useModal } from '@src/redux/modals/modals.hook';
import { AppAlertDialogModalId } from '@src/redux/modals/AlertDialog';
import { DeviceIcon } from './DevicesPage/DevicesPage';
import { capitalizeFirstLetter } from '@src/lib/capitalizeFirstLetter';
import { DeviceSharingCreationModalId } from '@src/redux/modals/DeviceSharingCreationModal';

export const UsersPage = () => {
  const [editModal, setEditModal] = useState<any>();
  const { setState: deletionModal } = useModal(AppAlertDialogModalId);
  const { setState: showDeviceSharingCreationModal } = useModal(
    DeviceSharingCreationModalId
  );
  const { data: items, isLoading } = useGetUsersQuery();
  const { data: me } = useGetUserQuery();

  const flatUsersWithoutOwner = useMemo(() => {
    if (!items) return [];

    const arr = Object.entries(items);
    const flatArr = arr
      .map(i => ({ username: i[0], devices: i[1] }))
      .filter(i => i.username !== me?.name);

    return flatArr;
  }, [items, me]);

  const owner = useMemo(() => {
    if (!items) return undefined;
    if (!me || !me.name) return undefined;
    return { devices: items[me.name], username: me.name };
  }, [items, me]);

  if (isLoading && !items) {
    return <Loader />;
  }

  return (
    <>
      <PageLayout className="space-y-4">
        <PageHeader>
          <div>
            <PageHeaderTitle>
              <H1>User Management</H1>
            </PageHeaderTitle>
            <H3>Share devices with users and manage access permissions</H3>
          </div>

          <Button
            onClick={() => showDeviceSharingCreationModal(true)}
            className="ml-2 shrink-0"
          >
            <Icon icon="lucide:user-plus" className="size-4" />
            Share Device
          </Button>
        </PageHeader>

        <Card className="space-y-4">
          <div className="flex items-center justify-between pb-6 text-xl font-semibold">
            Users
            {/* <Select */}
            {/*   defaultValue="all" */}
            {/*   onValueChange={val => { */}
            {/*     const templateType = dropdownOptions.find(i => i.value === val); */}
            {/*     alert(templateType?.label); */}
            {/*   }} */}
            {/* > */}
            {/*   <SelectTrigger className="w-[180px]"> */}
            {/*     <SelectValue /> */}
            {/*   </SelectTrigger> */}
            {/*   <SelectContent> */}
            {/*     <SelectGroup> */}
            {/*       {dropdownOptions.map((option, index) => ( */}
            {/*         <SelectItem key={index} value={option.value}> */}
            {/*           {option.label} */}
            {/*         </SelectItem> */}
            {/*       ))} */}
            {/*     </SelectGroup> */}
            {/*   </SelectContent> */}
            {/* </Select> */}
          </div>
          {owner && <UserItem user={owner} isCurrentUser />}
          {flatUsersWithoutOwner.map(i => (
            <UserItem user={i} key={i.username} />
          ))}
        </Card>

        {/* <Card className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border p-6"> */}
        {/*   <div className="mb-6"> */}
        {/*     <h3 className="mb-1 text-xl font-semibold">Access Control</h3> */}
        {/*     <p className="text-sm text-gray-500"> */}
        {/*       Understanding device access roles */}
        {/*     </p> */}
        {/*   </div> */}
        {/*   <div className="space-y-6"> */}
        {/*     <div> */}
        {/*       <h4 className="mb-3 flex items-center gap-2 font-medium"> */}
        {/*         <svg */}
        {/*           xmlns="http://www.w3.org/2000/svg" */}
        {/*           width="24" */}
        {/*           height="24" */}
        {/*           viewBox="0 0 24 24" */}
        {/*           fill="none" */}
        {/*           stroke="currentColor" */}
        {/*           stroke-width="2" */}
        {/*           stroke-linecap="round" */}
        {/*           stroke-linejoin="round" */}
        {/*           className="lucide lucide-crown h-4 w-4 text-purple-600" */}
        {/*           aria-hidden="true" */}
        {/*         > */}
        {/*           <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"></path> */}
        {/*           <path d="M5 21h14"></path> */}
        {/*         </svg> */}
        {/*         Owner */}
        {/*       </h4> */}
        {/*       <div className="ml-6 space-y-2 text-sm text-gray-600"> */}
        {/*         <p>• Full control over the device</p> */}
        {/*         <p>• Can share device with other users</p> */}
        {/*         <p>• Can modify device settings and configurations</p> */}
        {/*         <p>• Automatically assigned to device creator</p> */}
        {/*       </div> */}
        {/*     </div> */}
        {/*     <div */}
        {/*       data-orientation="horizontal" */}
        {/*       role="none" */}
        {/*       data-slot="separator-root" */}
        {/*       className="bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px" */}
        {/*     ></div> */}
        {/*     <div> */}
        {/*       <h4 className="mb-3 flex items-center gap-2 font-medium"> */}
        {/*         <svg */}
        {/*           xmlns="http://www.w3.org/2000/svg" */}
        {/*           width="24" */}
        {/*           height="24" */}
        {/*           viewBox="0 0 24 24" */}
        {/*           fill="none" */}
        {/*           stroke="currentColor" */}
        {/*           stroke-width="2" */}
        {/*           stroke-linecap="round" */}
        {/*           stroke-linejoin="round" */}
        {/*           className="lucide lucide-square-pen h-4 w-4 text-blue-600" */}
        {/*           aria-hidden="true" */}
        {/*         > */}
        {/*           <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path> */}
        {/*           <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"></path> */}
        {/*         </svg> */}
        {/*         Editor */}
        {/*       </h4> */}
        {/*       <div className="ml-6 space-y-2 text-sm text-gray-600"> */}
        {/*         <p>• Can view and control the device</p> */}
        {/*         <p>• Can modify device states (on/off, temperature, etc.)</p> */}
        {/*         <p>• Can view device history and status</p> */}
        {/*         <p>• Cannot share device with others</p> */}
        {/*       </div> */}
        {/*     </div> */}
        {/*     <div */}
        {/*       data-orientation="horizontal" */}
        {/*       role="none" */}
        {/*       data-slot="separator-root" */}
        {/*       className="bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px" */}
        {/*     ></div> */}
        {/*     <div> */}
        {/*       <h4 className="mb-3 flex items-center gap-2 font-medium"> */}
        {/*         <svg */}
        {/*           xmlns="http://www.w3.org/2000/svg" */}
        {/*           width="24" */}
        {/*           height="24" */}
        {/*           viewBox="0 0 24 24" */}
        {/*           fill="none" */}
        {/*           stroke="currentColor" */}
        {/*           stroke-width="2" */}
        {/*           stroke-linecap="round" */}
        {/*           stroke-linejoin="round" */}
        {/*           className="lucide lucide-eye h-4 w-4 text-gray-600" */}
        {/*           aria-hidden="true" */}
        {/*         > */}
        {/*           <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path> */}
        {/*           <circle cx="12" cy="12" r="3"></circle> */}
        {/*         </svg> */}
        {/*         Viewer */}
        {/*       </h4> */}
        {/*       <div className="ml-6 space-y-2 text-sm text-gray-600"> */}
        {/*         <p>• Read-only access to device</p> */}
        {/*         <p>• Can view device status and history</p> */}
        {/*         <p>• Cannot control or modify device</p> */}
        {/*         <p>• Cannot share device with others</p> */}
        {/*       </div> */}
        {/*     </div> */}
        {/*   </div> */}
        {/* </Card> */}
      </PageLayout>
    </>
  );
};

const UserItem = ({
  user,
  isCurrentUser = false,
}: {
  user: {
    username: string;
    devices: GetUsersApiResponse[keyof GetUsersApiResponse];
  };
  isCurrentUser?: boolean;
}) => {
  return (
    <div
      className="flex flex-col rounded-lg border p-4 transition-colors hover:bg-gray-50"
      key={user.username}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex flex-1 items-center gap-4">
          <span
            data-slot="avatar"
            className="relative flex size-10 h-12 w-12 shrink-0 overflow-hidden rounded-full"
          >
            <span
              data-slot="avatar-fallback"
              className="flex size-full items-center justify-center rounded-full bg-blue-100 text-blue-700"
            >
              {user.username.length >= 2 ? (
                user.username.slice(0, 2).toUpperCase()
              ) : (
                <Icon icon="lucide:user" />
              )}
            </span>
          </span>
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              <h4 className="font-medium">{user.username}</h4>
            </div>
          </div>
          {isCurrentUser && (
            <span className="inline-flex items-center justify-center gap-1 rounded-2xl border border-current/40 bg-current/20 px-2 py-0.5 text-xs text-green-700">
              You
            </span>
          )}
        </div>
        {!isCurrentUser && (
          <Button size="icon-lg" variant="ghost">
            <Icon icon="lucide:edit" className="size-5" />
          </Button>
        )}
      </div>
      <div className="ml-16 border-t pt-2">
        <p className="mb-2 text-xs text-gray-500">
          Shared Devices ({user.devices.length})
        </p>
        <div className="flex flex-wrap gap-2">
          {user.devices.map(i => (
            <span
              data-slot="badge"
              className="[&amp;&gt;svg]:size-3 [&amp;&gt;svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive text-foreground [a&amp;]:hover:bg-accent [a&amp;]:hover:text-accent-foreground inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border bg-gray-50 px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px]"
            >
              <DeviceIcon type="UNKNOWN" />
              {i.deviceName}
              <span className="ml-1 text-gray-400">
                ({capitalizeFirstLetter(i.role ?? '')})
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
