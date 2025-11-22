import { useEffect, useState } from 'react';
import DeviceDataChart from './components/DeviceDataChart';
import { useApi } from '@src/lib/api/ApiProvider';
import { Device } from '@src/lib/api/api.types';
import { DatePicker, notification } from 'antd';
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

const { RangePicker } = DatePicker;

export const DashboardPage = () => {
  const api = useApi();
  const [devices, setDevices] = useState<Array<Device> | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  useEffect(() => {
    const onLoad = async () => {
      setIsLoading(true);
      const res = await api.getDevices();
      if (!res.ok) {
        notification.error({
          message: 'Failed to get devices',
          description: res.message,
        });
        setIsLoading(false);
        return;
      }

      setDevices(res.data);
      if (res.data[0].id) setChoosenDevicesIds([res.data[0].id]);
      setIsLoading(false);
    };
    onLoad();
  }, [api, setDevices]);

  const [choosenDevicesIds, setChoosenDevicesIds] = useState<number[]>([]);

  const [startDate, setStartDate] = useState<Dayjs>(
    dayjs(new Date()).subtract(5, 'days')
  );
  const [endDate, setEndDate] = useState<Dayjs>(dayjs(new Date()));

  if (!devices || isLoading) {
    return <Loader />;
  }

  return (
    <>
      <PageLayout className="space-y-6">
        <PageHeader>
          <PageHeaderTitle>Overview</PageHeaderTitle>
        </PageHeader>

        <Card>
          <div className="flex items-center justify-between pb-6">
            <div>
              <h3 className="text-xl font-semibold">Recent alerts</h3>
              <span className="text-sm text-gray-500">Last 24 hours</span>
            </div>
          </div>
          <div className="max-h-96 space-y-3 overflow-y-auto">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-600 transition-all hover:shadow-md">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-white p-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    className="lucide lucide-lightbulb h-4 w-4"
                    aria-hidden="true"
                  >
                    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path>
                    <path d="M9 18h6"></path>
                    <path d="M10 22h4"></path>
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">
                      Living room lights turned on
                    </p>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      className="lucide lucide-info h-4 w-4 flex-shrink-0"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M12 16v-4"></path>
                      <path d="M12 8h.01"></path>
                    </svg>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="opacity-75">2 min ago</span>
                    <span className="opacity-50">•</span>
                    <span className="opacity-75">Main Lights</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-orange-600 transition-all hover:shadow-md">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-white p-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    className="lucide lucide-thermometer h-4 w-4"
                    aria-hidden="true"
                  >
                    <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"></path>
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">
                      Temperature increased to 24°C
                    </p>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      className="lucide lucide-triangle-alert h-4 w-4 flex-shrink-0"
                      aria-hidden="true"
                    >
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path>
                      <path d="M12 9v4"></path>
                      <path d="M12 17h.01"></path>
                    </svg>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="opacity-75">5 min ago</span>
                    <span className="opacity-50">•</span>
                    <span className="opacity-75">Thermostat</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-600 transition-all hover:shadow-md">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-white p-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    className="lucide lucide-lock h-4 w-4"
                    aria-hidden="true"
                  >
                    <rect
                      width="18"
                      height="11"
                      x="3"
                      y="11"
                      rx="2"
                      ry="2"
                    ></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">
                      Front door locked automatically
                    </p>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      className="lucide lucide-circle-check-big h-4 w-4 flex-shrink-0"
                      aria-hidden="true"
                    >
                      <path d="M21.801 10A10 10 0 1 1 17 3.335"></path>
                      <path d="m9 11 3 3L22 4"></path>
                    </svg>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="opacity-75">12 min ago</span>
                    <span className="opacity-50">•</span>
                    <span className="opacity-75">Front Door</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-600 transition-all hover:shadow-md">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-white p-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    className="lucide lucide-lock h-4 w-4"
                    aria-hidden="true"
                  >
                    <rect
                      width="18"
                      height="11"
                      x="3"
                      y="11"
                      rx="2"
                      ry="2"
                    ></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">
                      Motion detected in backyard
                    </p>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      className="lucide lucide-info h-4 w-4 flex-shrink-0"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M12 16v-4"></path>
                      <path d="M12 8h.01"></path>
                    </svg>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="opacity-75">18 min ago</span>
                    <span className="opacity-50">•</span>
                    <span className="opacity-75">Backyard Camera</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-600 transition-all hover:shadow-md">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-white p-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    className="lucide lucide-lightbulb h-4 w-4"
                    aria-hidden="true"
                  >
                    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path>
                    <path d="M9 18h6"></path>
                    <path d="M10 22h4"></path>
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">
                      Kitchen lights turned off
                    </p>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      className="lucide lucide-info h-4 w-4 flex-shrink-0"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M12 16v-4"></path>
                      <path d="M12 8h.01"></path>
                    </svg>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="opacity-75">25 min ago</span>
                    <span className="opacity-50">•</span>
                    <span className="opacity-75">Kitchen Lights</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-600 transition-all hover:shadow-md">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-white p-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    className="lucide lucide-info h-4 w-4"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 16v-4"></path>
                    <path d="M12 8h.01"></path>
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">
                      System backup completed
                    </p>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      className="lucide lucide-circle-check-big h-4 w-4 flex-shrink-0"
                      aria-hidden="true"
                    >
                      <path d="M21.801 10A10 10 0 1 1 17 3.335"></path>
                      <path d="m9 11 3 3L22 4"></path>
                    </svg>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="opacity-75">1 hour ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

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
