import { Client, MnemonicAccount, PrivkeyAccount } from "firovm-sdk";
import { ProxyABI, SafeABI } from "./data/abi";
import { SafeByteCode, SafeProxyFactoryByteCode } from "./data/bytecode";
import { TxOptions } from "./utils";

export class Factory {
  private singletonTxId: string;
  private proxyTxId: string;

  constructor(
    private client: Client,
    private account: MnemonicAccount | PrivkeyAccount,
    private singletonAddress: string = "",
    private proxyAddress: string = ""
  ) {
    this.singletonTxId = "";
    this.proxyTxId = "";
  }

  async deploySingleton(options?: TxOptions): Promise<string> {
    if (this.singletonTxId !== "") {
      return this.singletonTxId;
    }

    const contract = new this.client.Contract(SafeABI);
    this.singletonTxId = await contract.deploy(SafeByteCode).send({
      from: this.account,
      ...options,
    });
    return this.singletonTxId;
  }

  async deployProxy(options?: TxOptions): Promise<string> {
    if (this.proxyTxId !== "") {
      return this.proxyTxId;
    }

    const contract = new this.client.Contract(ProxyABI);
    this.proxyTxId = await contract.deploy(SafeProxyFactoryByteCode).send({
      from: this.account,
      ...options,
    });
    return this.proxyTxId;
  }

  async addressSingleton(): Promise<string | undefined> {
    if (this.singletonTxId === "") {
      throw new Error("Singleton not deployed");
    }
    if (this.singletonAddress !== "") {
      return this.singletonAddress;
    }

    const { result, error } = await this.client.rpcClient.getTransactionReceipt(
      this.singletonTxId
    );
    if (error) {
      throw new Error(error.message);
    }
    if (result.length === 0) {
      throw new Error("Transaction may not have been mined yet");
    }
    if (result[0].excepted !== "None") {
      throw new Error(`Transaction failed: ${result[0].exceptedMessage}`);
    }
    this.singletonAddress = `0x${result[0].contractAddress}`;
    return this.singletonAddress;
  }

  async addressProxy(): Promise<string | undefined> {
    if (this.proxyTxId === "") {
      throw new Error("Proxy not deployed");
    }
    if (this.proxyAddress !== "") {
      return this.proxyAddress;
    }

    const { result, error } = await this.client.rpcClient.getTransactionReceipt(
      this.proxyTxId
    );
    if (error) {
      throw new Error(error.message);
    }
    if (result.length === 0) {
      throw new Error("Transaction may not have been mined yet");
    }
    if (result[0].excepted !== "None") {
      throw new Error(`Transaction failed: ${result[0].exceptedMessage}`);
    }
    this.proxyAddress = `0x${result[0].contractAddress}`;
    return this.proxyAddress;
  }
}
