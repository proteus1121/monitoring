import { useEffect, useState } from 'react';
import DeviceDataChart from './components/DeviceDataChart';
import { RecentIncidentsCard } from './components/RecentIncidentsCard';
import { DatePicker } from 'antd';
import { PageLayout } from '@src/layouts/PageLayout';
import { PageHeader, PageHeaderTitle } from '@src/components/PageHeader';
import { Card } from '@src/components/Card';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@src/components/Select';
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

          <div className="flex w-full items-center">
            {devices && devices.length > 0 && (
              <Select
                // TODO : add multi select
                defaultValue={String(devices[0].id)}
                onValueChange={value => setChoosenDevicesIds([Number(value)])}
              >
                <SelectTrigger className="w-[240px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {devices.map((option, index) => (
                      <SelectItem key={index} value={String(option.id)}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
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
