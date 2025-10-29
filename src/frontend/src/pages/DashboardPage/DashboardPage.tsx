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

const DashboardPage = () => {
  const [devices, setDevices] = useState<Array<Device> | undefined>(undefined);
  const [device, setDevice] = useState<Device | undefined>(undefined);
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
            value={device?.name ?? 'Choose a Device'}
            onValueChange={value => {
              const deviceTmp = devices?.find(device => device.name === value);
              if (deviceTmp) setDevice(deviceTmp);
              else setDevice(undefined);
            }}
          >
            <SelectTrigger asChild>
              <Button variant="flat">
                <SelectValue />
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
