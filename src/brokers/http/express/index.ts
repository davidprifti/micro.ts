import {BrokerBuilder} from "../../BrokerBuilder";
import {ExpressBroker} from "./ExpressBroker";
import {IHttpListnerConfig} from "../HttpBroker";
import {IConfiguration, OptionsBuilder} from "../../../server";
import {BrokerResolver} from "../../BrokerResolver";

export class ExpressBrokerBuilder extends BrokerBuilder<ExpressBroker, IHttpListnerConfig> {
  constructor(config: IConfiguration) {
    super(config);
    this.broker = new ExpressBroker();
  }
}

declare module "../../../server/OptionsBuilder" {
  interface OptionsBuilder {
    /**
     * Build an express broker
     * @param builder
     */
    useExpressBroker(builder: BrokerResolver<ExpressBrokerBuilder>): ExpressBroker;
  }
}
/**
 * Extend the OptionBuilder class
 * @param builder
 */
OptionsBuilder.prototype.useExpressBroker = function (builder: BrokerResolver<ExpressBrokerBuilder>) {
  const broker_builder = new ExpressBrokerBuilder(this.config);
  const broker = builder(broker_builder).getBroker();
  this.options.brokers!.push(broker);
  return broker;
};

export * from './ExpressBroker';
