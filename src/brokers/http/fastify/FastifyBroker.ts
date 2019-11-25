import { HttpBroker, HttpVerbs, IHttpListnerConfig } from "../HttpBroker";
import fastify, { FastifyRequest, FastifyReply, FastifyInstance, FastifyContext } from "fastify";
import { Action } from "../../../server/types";
import { DefinitionHandlerPair } from "../../AbstractBroker";
import { TransformerDefinition } from "../../../decorators";

export class FastifyBroker extends HttpBroker<FastifyInstance, FastifyRequest, FastifyReply<any>, IHttpListnerConfig> {
  public name: string = "FastifyBroker";
  protected server!: FastifyInstance;

  protected requestMapper = async (r: FastifyRequest, decoder?: TransformerDefinition) => {
    const action: Action = {
      request: {
        headers: r.headers,
        body: await this.decode(r.body, decoder),
        method: r.req.method,
        qs: r.query,
        params: r.params,
        raw: r,
        path: r.req.url || ""
      },
      connection: this.getConnection()
    };
    return action;
  };

  protected paramWrapper(paramName: string): string {
    return `:${paramName}`;
  }

  protected registerHandler(value: DefinitionHandlerPair[], route: string, method: HttpVerbs): void {
    this.server[method](route, async (req: FastifyRequest, res: FastifyReply<any>) => {
      const action = await this.requestMapper(req, value[0].def.decoder);
      const handler = this.actionToRouteMapper(route, action, value);
      const result: Action = await handler(action);
      result.response = result.response || {};
      return this.respond(result, res, value[0].def.encoder);
    });
  }

  protected async respond(result: Action, ctx: FastifyReply<any>, encoder?: TransformerDefinition): Promise<any> {
    let body = result.response!.body || result.response!.error;
    body = this.encode(body, encoder);
    const headers = result.response!.headers || {};
    ctx.code(result.response!.statusCode || 200);
    ctx.headers(headers);
    ctx.send(body);
  }

  async start(): Promise<void> {
    this.registerRoutes();
    await this.server.listen(Number(this.config.port || 8080), this.config.address);
    this.log(`Server listening on address ${this.config.address} and port ${this.config.port}`);
  }

  protected construct(): void {
    this.server = fastify();
  }
}
