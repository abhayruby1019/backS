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

import {
  CacheManager,
  createServiceBuilder,
  DockerContainerRunner,
  HostDiscovery,
  UrlReader,
} from '@backstage/backend-common';
import { ConfigReader } from '@backstage/config';
import {
  DirectoryPreparer,
  Generators,
  Preparers,
  Publisher,
  TechdocsGenerator,
} from '@backstage/plugin-techdocs-node';
import Docker from 'dockerode';
import { Server } from 'http';
import { Logger } from 'winston';
import { createRouter } from './router';

export interface ServerOptions {
  port: number;
  enableCors: boolean;
  logger: Logger;
}

export async function startStandaloneServer(
  options: ServerOptions,
): Promise<Server> {
  const logger = options.logger.child({ service: 'techdocs-backend' });
  const config = new ConfigReader({
    techdocs: {
      publisher: {
        type: 'local',
      },
    },
  });
  const discovery = HostDiscovery.fromConfig(config);
  const mockUrlReader: jest.Mocked<UrlReader> = {
    readUrl: jest.fn(),
    readTree: jest.fn(),
    search: jest.fn(),
  };

  logger.debug('Creating application...');
  const preparers = new Preparers();
  const directoryPreparer = DirectoryPreparer.fromConfig(config, {
    logger,
    reader: mockUrlReader,
  });
  preparers.register('dir', directoryPreparer);

  const dockerClient = new Docker();
  const containerRunner = new DockerContainerRunner({ dockerClient });

  const generators = new Generators();
  const techdocsGenerator = TechdocsGenerator.fromConfig(config, {
    logger,
    containerRunner,
  });
  generators.register('techdocs', techdocsGenerator);

  const publisher = await Publisher.fromConfig(config, { logger, discovery });

  const cache = CacheManager.fromConfig(config).forPlugin('techdocs');

  logger.debug('Starting application server...');
  const router = await createRouter({
    preparers,
    generators,
    logger,
    publisher,
    config,
    discovery,
    cache,
  });
  let service = createServiceBuilder(module)
    .setPort(options.port)
    .addRouter('/techdocs', router);
  if (options.enableCors) {
    service = service.enableCors({ origin: 'http://localhost:3000' });
  }
  return await service.start().catch(err => {
    logger.error(err);
    process.exit(1);
  });
}

module.hot?.accept();
