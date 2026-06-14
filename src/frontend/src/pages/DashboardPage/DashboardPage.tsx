import { useEffect, useState } from 'react';
import DeviceDataChart from './components/DeviceDataChart';
import { RecentIncidentsCard } from './components/RecentIncidentsCard';
import { DatePicker, Select } from 'antd';
import { PageLayout } from '@src/layouts/PageLayout';
import { PageHeader, PageHeaderTitle } from '@src/components/PageHeader';
import { Card } from '@src/components/Card';
import dayjs, { Dayjs } from 'dayjs';
import { Loader } from '@src/components/Loader';
import { useGetAllDevicesQuery } from '@src/redux/generatedApi';

const { RangePicker } = DatePicker;

export const DashboardPage = () => {
  const { data: devices, isLoading } = useGetAllDevicesQuery();

  const [choosenDevicesIds, setChoosenDevicesIds] = useState<number[]>([]);

  useEffect(() => {
    if (devices && devices.length > 0 && choosenDevicesIds.length === 0) {
      setChoosenDevicesIds([devices[0].id!]);
    }
  }, [devices, choosenDevicesIds.length]);

  const [startDate, setStartDate] = useState<Dayjs>(
    dayjs(new Date()).subtract(5, 'days')
  );
  const [endDate, setEndDate] = useState<Dayjs>(dayjs().add(1, 'day'));

  if (isLoading) {
    return <Loader />;
  }

  return (
    <>
      <PageLayout className="space-y-6">
        <PageHeader>
          <PageHeaderTitle>Overview</PageHeaderTitle>
        </PageHeader>

        <RecentIncidentsCard />

        <Card>
          <div className="flex items-center justify-between pb-6">
            <div>
              <h3 className="text-xl font-semibold">Device Metrics</h3>
              <span className="text-sm text-gray-500">
                Monitor device parameters over time
              </span>
            </div>
          </div>

          <div className="flex w-full items-center gap-4">
            {devices && devices.length > 0 && (
              <Select
                mode="multiple"
                placeholder="Select devices"
                style={{ width: 300 }}
                defaultValue={[devices[0].id!]}
                onChange={(selectedIds: number[]) => setChoosenDevicesIds(selectedIds)}
                options={devices.map(device => ({
                  label: device.name,
                  value: device.id!,
                }))}
                maxTagCount="responsive"
              />
            )}

            <RangePicker
              className="!ml-auto"
              id={{
                start: 'startInput',
                end: 'endInput',
              }}
              defaultValue={[startDate, endDate]}
              onChange={dates => {
                if (dates?.[0]) {
                  setStartDate(dates[0]);
                }

                if (dates?.[1]) {
                  setEndDate(dates[1]);
                }
              }}
            />
          </div>
          <DeviceDataChart
            devices={devices}
            choosenDevicesIds={choosenDevicesIds}
            startDate={startDate}
            endDate={endDate}
          />
        </Card>
      </PageLayout>
    </>
  );
};
