import { ReactNode, useEffect, useState } from 'react';
import GeneralDataChart from './components/GeneralDataChart';
import clsx from 'clsx';
import DeviceDataChart from './components/DeviceDataChart';
import { useApi } from '@src/lib/api/ApiProvider';
import { Device } from '@src/lib/api/api.types';
import { useToast } from '@src/components/Toast';

const DashboardPage = () => {
  const api = useApi();
  const [devices, setDevices] = useState<Array<Device> | undefined>(undefined);
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
    <>
      <Card>
        <GeneralDataChart />
      </Card>

      <Card>
        <DeviceDataChart devices={devices} />
      </Card>
    </>
  );
};

export default DashboardPage;

const Card = (props: { children: ReactNode; className?: string }) => {
  return (
    <div
      className={clsx(
        'w-full bg-white p-4 last:mb-6 sm:mx-auto sm:mt-6 sm:max-w-[36rem] sm:rounded-xl sm:shadow-xl md:max-w-[44rem] md:p-8 lg:max-w-[56rem]',
        props.className
      )}
    >
      {props.children}
    </div>
  );
};
