import { NotFound } from "../errors";
import { Action, BaseRouteDefinition } from "../server/types";
import { IBroker, RequestMapper, RouteMapper } from "./IBroker";
import { IConfiguration } from "../server";
import { ILogger, Log } from "../server/Logger";
import chalk from 'chalk';

export type ActionHandler = (action: Action) => Action | Promise<Action>;
export type DefinitionHandlerPair = {
  def: BaseRouteDefinition,
  handler: ActionHandler
}
export type ActionToRouteMapper = (route: string,
  action: Action,
  pairs: DefinitionHandlerPair[]) => ActionHandler;
export type ConfigResolver<T> = (config: IConfiguration) => T;

export abstract class AbstractBroker<TConfig> implements IBroker {
  public abstract name: string;
  /**
   * Configuration getter
   */
  public appConfiguration?: IConfiguration;

  /**
   * Absolute configuration
   */
  public absoluteConfig?: TConfig;

  /**
   * If provided absolute config, the construct method is called immediately
   * @param absoluteConfig
   */
  constructor(absoluteConfig?: TConfig) {
    if (absoluteConfig) {
      this.setAbsoluteConfig(absoluteConfig);
    }
  }

  protected abstract construct(): void;

  get config(): TConfig {
    if (this.absoluteConfig) {
      return this.absoluteConfig;
    }
    if (this.appConfiguration && this.configResolver) {
      return this.configResolver(this.appConfiguration);
    }
    return {} as TConfig;
  }

  protected registeredRoutes: Map<string, DefinitionHandlerPair[]> = new Map<string, DefinitionHandlerPair[]>();
  protected abstract routeMapper: RouteMapper;
  protected abstract requestMapper: RequestMapper;
  private configResolver!: ConfigResolver<TConfig>;

  protected actionToRouteMapper: ActionToRouteMapper = (route: string, action: Action, pairs: DefinitionHandlerPair[]) => {
    const method = action.request.method;
    if (method) {
      const filtered = pairs.filter(x => {
        return x.def.method === method;
      });
      if (filtered.length) {
        return filtered[0].handler;
      }
    }
    return pairs[0].handler;
  };

  public setConfigResolver(cfg: IConfiguration, resolver: ConfigResolver<TConfig>) {
    this.appConfiguration = cfg;
    this.configResolver = resolver;
    this.construct();
  }

  public setAbsoluteConfig(config: TConfig) {
    this.absoluteConfig = config;
    this.construct();
  }

  public setRequestMapper(requestMapper: RequestMapper): void {
    this.requestMapper = requestMapper;
  }

  public setRouteMapper(routeMapper: RouteMapper): void {
    this.routeMapper = routeMapper;
  }

  public setActionToHandlerMapper(mapper: ActionToRouteMapper): void {
    this.actionToRouteMapper = mapper;
  }

  public getHandler(route: string, action: Action) {
    let allHandlers = this.registeredRoutes.get(route);
    allHandlers = allHandlers || [];
    if (allHandlers.length === 0) {
      throw new NotFound("Not found");
    }
    return this.actionToRouteMapper(route, action, allHandlers);
  }

  public addRoute(def: BaseRouteDefinition, handler: ActionHandler): string {
    const route = this.routeMapper(def);
    let registered = this.registeredRoutes.get(route);
    if (!registered) {
      registered = [];
    }
    registered.push({ def, handler });
    this.registeredRoutes.set(route, registered);
    return route;
  }

  public log(message: string, options?: any, level: keyof ILogger = 'info') {
    const prefix = chalk.green(`[${this.name}]`)
    const message_fmt = `${prefix} ${message}`;
    Log[level](message_fmt, options);
  }

  protected extractParamNames(path: string, separator = "/") {
    const spl = path.split(separator);
    return spl.map(x => {
      const value: { name: string, param: boolean } = { name: x, param: false };
      if (x.length > 0 && x[0] === ":") {
        value.name = x.substr(1);
        value.param = true;
      }
      return value;
    });
  }

  abstract start(): Promise<void>;
}
