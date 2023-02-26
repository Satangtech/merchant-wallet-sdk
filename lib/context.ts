import { Context as ContextFiroSDK, Network } from "firovm-sdk";

export class Context extends ContextFiroSDK {
  private proxy: string;
  private singleton: string;

  constructor() {
    super();
    this.proxy = "";
    this.singleton = "";
  }

  withNetwork(network: Network): Context {
    super.withNetwork(network);
    return this;
  }

  withProxy(address: string): Context {
    this.proxy = address;
    return this;
  }

  getProxy(): string {
    return this.proxy;
  }

  withSingleton(address: string): Context {
    this.singleton = address;
    return this;
  }

  getSingleton(): string {
    return this.singleton;
  }
}
