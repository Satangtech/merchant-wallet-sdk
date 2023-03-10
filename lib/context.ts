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
    if (this.proxy === "") {
      return this.proxy;
    }
    return `0x${this.proxy.replace("0x", "")}`;
  }

  withSingleton(address: string): Context {
    this.singleton = address;
    return this;
  }

  getSingleton(): string {
    if (this.singleton === "") {
      return this.singleton;
    }
    return `0x${this.singleton.replace("0x", "")}`;
  }
}
