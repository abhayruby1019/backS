/*
 * Copyright 2020 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { PagerDutyChangeEvent } from '../types';
import { TestApiRegistry, renderInTestApp } from '@backstage/test-utils';
import { pagerDutyApiRef } from '../../api';
import { ApiProvider } from '@backstage/core-app-api';
import { ChangeEvents } from './ChangeEvents';

const mockPagerDutyApi = {
  getChangeEventsByServiceId: jest.fn(),
};
const apis = TestApiRegistry.from([pagerDutyApiRef, mockPagerDutyApi]);

describe('Incidents', () => {
  it('Renders an empty state when there are no change events', async () => {
    mockPagerDutyApi.getChangeEventsByServiceId = jest
      .fn()
      .mockImplementationOnce(async () => ({ change_events: [] }));

    await renderInTestApp(
      <ApiProvider apis={apis}>
        <ChangeEvents serviceId="abc" refreshEvents={false} />
      </ApiProvider>,
    );
    await waitFor(() => !screen.queryByTestId('progress'));
    expect(
      screen.getByText('No change events to display yet.'),
    ).toBeInTheDocument();
  });

  it('Renders all change events', async () => {
    mockPagerDutyApi.getChangeEventsByServiceId = jest
      .fn()
      .mockImplementationOnce(async () => ({
        change_events: [
          {
            id: 'id1',
            source: 'changeSource1',
            html_url: 'www.pdlink.com',
            links: [
              {
                href: 'www.externalLink1.com',
                text: 'link1',
              },
            ],
            summary: 'summary of event',
            timestamp: '2020-07-17T08:42:58.315+0000',
          },
          {
            id: 'id2',
            source: 'changeSource1',
            html_url: 'www.pdlink.com/link',
            links: [
              {
                href: 'www.externalLink1.com',
                text: 'link1',
              },
            ],
            summary: 'sum of EVENT',
            timestamp: '2020-07-18T08:42:58.315+0000',
          },
        ] as PagerDutyChangeEvent[],
      }));
    await renderInTestApp(
      <ApiProvider apis={apis}>
        <ChangeEvents serviceId="abc" refreshEvents={false} />
      </ApiProvider>,
    );
    await waitFor(() => !screen.queryByTestId('progress'));
    expect(screen.getByText('summary of event')).toBeInTheDocument();
    expect(screen.getByText('sum of EVENT')).toBeInTheDocument();

    // assert links, mailto and hrefs, date calculation
    expect(screen.getAllByTitle('View in PagerDuty').length).toEqual(2);
  });

  it('Does not render a pagerduty link when html_url is not present in response', async () => {
    mockPagerDutyApi.getChangeEventsByServiceId = jest
      .fn()
      .mockImplementationOnce(async () => ({
        change_events: [
          {
            id: 'id1',
            source: 'changeSource1',
            links: [
              {
                href: 'www.externalLink1.com',
                text: 'link1',
              },
            ],
            summary: 'summary of event',
            timestamp: '2020-07-17T08:42:58.315+0000',
          },
          {
            id: 'id2',
            source: 'changeSource1',
            html_url: 'www.pdlink.com/link',
            links: [
              {
                href: 'www.externalLink1.com',
                text: 'link1',
              },
            ],
            summary: 'sum of EVENT',
            timestamp: '2020-07-18T08:42:58.315+0000',
          },
        ] as PagerDutyChangeEvent[],
      }));
    await renderInTestApp(
      <ApiProvider apis={apis}>
        <ChangeEvents serviceId="abc" refreshEvents={false} />
      </ApiProvider>,
    );
    await waitFor(() => !screen.queryByTestId('progress'));
    expect(screen.getByText('summary of event')).toBeInTheDocument();
    expect(screen.getByText('sum of EVENT')).toBeInTheDocument();

    // assert links, mailto and hrefs, date calculation
    expect(screen.getAllByTitle('View in PagerDuty').length).toEqual(1);
  });

  it('Handle errors', async () => {
    mockPagerDutyApi.getChangeEventsByServiceId = jest
      .fn()
      .mockRejectedValueOnce(new Error('Error occurred'));

    await renderInTestApp(
      <ApiProvider apis={apis}>
        <ChangeEvents serviceId="abc" refreshEvents={false} />
      </ApiProvider>,
    );
    await waitFor(() => !screen.queryByTestId('progress'));
    expect(
      screen.getByText(
        'Error encountered while fetching information. Error occurred',
      ),
    ).toBeInTheDocument();
  });
});
