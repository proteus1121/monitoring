import { ReactNode, useEffect, useState } from 'react';
import GeneralDataChart from './components/GeneralDataChart';
import clsx from 'clsx';
import DeviceDataChart from './components/DeviceDataChart';
import { useApi } from '@src/lib/api/ApiProvider';
import { Device } from '@src/lib/api/api.types';
import { notification } from 'antd';
import { Header } from '@src/components/Header';

const DashboardPage = () => {
  const api = useApi();
  const [devices, setDevices] = useState<Array<Device> | undefined>(undefined);
  useEffect(() => {
    const onLoad = async () => {
      const res = await api.getDevices();
      if (!res.ok) {
        notification.error({
          message: 'Failed to get devices',
          description: res.message,
        });
        return;
      }

      setDevices(res.data);
    };
    onLoad();
  }, [api, setDevices]);

  return (
    <>
      <Header>
        <div>Dashboard</div>
      </Header>

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

const Card = (props: {
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
}) => {
  return (
    <div
      className={clsx(
        'w-full bg-white p-4 last:mb-6 sm:mx-auto sm:mt-6 sm:max-w-[36rem] sm:rounded-xl sm:shadow-xl md:max-w-[44rem] md:p-8 lg:max-w-[56rem]',
        props.className
      )}
      onClick={props.onClick}
    >
      {props.children}
    </div>
  );
};
