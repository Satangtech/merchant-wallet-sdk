import { Client, MnemonicAccount, PrivkeyAccount } from "firovm-sdk";
import { Context } from "./context";
import { ProxyABI, SafeABI } from "./data/abi";
import { AddressZero, getRandomIntAsString } from "./utils";

export interface TxOptions {
  gasPrice?: number;
  gas?: number;
}

export class MerchantWallet {
  private threshold: number;
  private owners: string[];
  private createWalletTxId: string;

  constructor(
    private context: Context,
    private client: Client,
    private account: MnemonicAccount | PrivkeyAccount,
    private _address: string = ""
  ) {
    this.threshold = 0;
    this.owners = [];
    this.createWalletTxId = "";
    this._address = _address;
  }

  async deploy(options: TxOptions = {}): Promise<string> {
    if (this.context.getSingleton() === "") {
      throw new Error("Singleton address is not set");
    }
    if (this.context.getProxy() === "") {
      throw new Error("Proxy address is not set");
    }

    const sendOptions: {
      from: MnemonicAccount | PrivkeyAccount;
      gasPrice?: number;
      gas?: number;
    } = {
      from: this.account,
    };
    if (options.gasPrice) {
      sendOptions.gasPrice = options.gasPrice;
    }
    if (options.gas) {
      sendOptions.gas = options.gas;
    }

    const contractProxy = new this.client.Contract(
      ProxyABI,
      this.context.getProxy()
    );
    this.createWalletTxId = await contractProxy.methods
      .createProxyWithNonce(
        this.context.getSingleton(),
        "0x",
        getRandomIntAsString()
      )
      .send(sendOptions);

    return this.createWalletTxId;
  }

  async address(): Promise<string> {
    if (this._address !== "") {
      return this._address;
    }
    if (this.createWalletTxId === "") {
      throw new Error("Wallet not deployed");
    }

    const { result, error } = await this.client.rpcClient.getTransactionReceipt(
      this.createWalletTxId
    );
    if (error) {
      throw new Error(`Error: ${error.message}`);
    }
    if (result.length === 0) {
      throw new Error("Transaction may not have been mined yet.");
    }
    this._address = `0x${
      result[0].log[0].data.split("000000000000000000000000")[1]
    }`;
    return this._address;
  }

  async setup(
    owners: string[],
    threshold: number,
    options: TxOptions = {}
  ): Promise<string> {
    if (this._address === "") {
      throw new Error("Address not set");
    }
    if (owners.length < threshold || owners.length < 1) {
      throw new Error("Invalid owners or threshold");
    }

    const sendOptions: {
      from: MnemonicAccount | PrivkeyAccount;
      gasPrice?: number;
      gas?: number;
    } = {
      from: this.account,
    };
    if (options.gasPrice) {
      sendOptions.gasPrice = options.gasPrice;
    }
    if (options.gas) {
      sendOptions.gas = options.gas;
    }

    const contract = new this.client.Contract(SafeABI, this._address);
    const txId = await contract.methods
      .setup(
        owners,
        threshold,
        AddressZero,
        "0x",
        AddressZero,
        AddressZero,
        0,
        AddressZero
      )
      .send(sendOptions);

    this.threshold = threshold;
    this.owners = owners;

    return txId;
  }

  async getOwners(): Promise<string[]> {
    if (this._address === "") {
      throw new Error("Address not set");
    }

    const contract = new this.client.Contract(SafeABI, this._address);
    this.owners = (await contract.methods.getOwners().call())["0"];
    return this.owners;
  }

  async getThreshold(): Promise<number> {
    if (this._address === "") {
      throw new Error("Address not set");
    }

    const contract = new this.client.Contract(SafeABI, this._address);
    this.threshold = (await contract.methods.getThreshold().call())["0"];
    return this.threshold;
  }

  async getNonce(): Promise<number> {
    if (this._address === "") {
      throw new Error("Address not set");
    }

    const contract = new this.client.Contract(SafeABI, this._address);
    return (await contract.methods.nonce().call())["0"];
  }
}
