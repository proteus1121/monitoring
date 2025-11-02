import { Icon } from '@iconify/react';
import { Button } from '@src/components/Button';
import {
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from '@src/components/Select';
import { useToast } from '@src/components/Toast';
import { useEffect, useState } from 'react';
import GeneralDataChart from './components/GeneralDataChart';
import { Device } from '@src/lib/api/api.types';
import { useApi } from '@src/lib/api/ApiProvider';
import clsx from 'clsx';

const DashboardPage = () => {
  const [devices, setDevices] = useState<Array<Device> | undefined>(undefined);
  const [deviceName, setDeviceName] = useState<string>('');
  const api = useApi();

  const { toast } = useToast();
  useEffect(() => {
    const onLoad = async () => {
      const res = await api.getDevices();
      if (!res.ok) {
        toast({ title: res.message, variant: 'warning' });
        return;
      }

      setDevices(res.data);
    };
    onLoad();
  }, [api, setDevices]);

  return (
    <div className="w-full bg-white p-8">
      {devices && devices.length > 0 && (
        <>
          Select a device:
          <SelectRoot
            value={deviceName}
            onValueChange={value => {
              setDeviceName(value);
            }}
          >
            <SelectTrigger asChild>
              <Button
                variant="outlined"
                className={clsx('ml-2 min-w-32 transition-all', {
                  'text-[rgba(0,0,0,0.6)]': !deviceName,
                })}
              >
                <SelectValue placeholder="None" />
                <Icon
                  icon="material-symbols:keyboard-arrow-down-rounded"
                  className="size-5"
                />
              </Button>
            </SelectTrigger>
            <SelectPortal>
              <SelectContent align="start">
                <SelectViewport minWidthByTrigger>
                  {devices.map(item => (
                    <SelectItem
                      className="flex gap-[14px]"
                      key={item.name}
                      value={item.name}
                    >
                      <div className="flex flex-col">
                        <SelectItemText className="font-medium text-black">
                          {item.name}
                        </SelectItemText>
                      </div>
                      <SelectItemIndicator className="ml-3" />
                    </SelectItem>
                  ))}
                </SelectViewport>
              </SelectContent>
            </SelectPortal>
          </SelectRoot>
        </>
      )}
      <GeneralDataChart />
    </div>
  );
};

export default DashboardPage;
