import { OptionsBuilder, Class } from "../../server";
import typeorm, { useContainer, createConnection as createDatabaseConnection, ConnectionOptions, ConnectionManager } from 'typeorm';
import { Container, Inject } from "../../di";
import {ILogger, LoggerKey} from "../../server/Logger";

declare module "../../server/OptionsBuilder" {
  interface OptionsBuilder {
    useTypeOrm(config: typeorm.ConnectionOptions): void;
    addModels(...models: Class<any>[]): void;
  }
}

declare module "../../server/types/ServerOptions" {
  interface ServerOptions {
    typeormOptions?: ConnectionOptions;
    models?: Class<any>[];
  }
}

OptionsBuilder.prototype.useTypeOrm = function(config: typeorm.ConnectionOptions) {
  useContainer(Container);
  this.options.typeormOptions = config;
  this.addBeforeStartHook(async () => {
    let dbOptions: any = this.options.typeormOptions;
    dbOptions = { ...dbOptions, entities: this.options.models || [] };
    await createDatabaseConnection({ ...dbOptions });
    Container.get<ILogger>(LoggerKey).info("Database connected");
  });
};

OptionsBuilder.prototype.addModels = function(...models: Class<any>[]) {
  if (!this.options.models) {
    this.options.models = [];
  }
  this.options.models.push(...models);
};

export function InjectRepository<T>(model: Class<T>, name: string = 'default') {
  const key = {
    type: '__repository',
    model,
    connectionName: name
  };
  if (!Container.hasResolver(key)) {
    Container.bindResolver(key, () => {
      try {
        const connectionManager = Container.get<ConnectionManager>(ConnectionManager);
        const connection = connectionManager.get(name);
        const repo = connection.getRepository<T>(model);
        return repo;
      } catch (err) {
        console.log("ERROR GETTING REPOSITORY", err);
      }
    });
  }
  return Inject(key);
}
