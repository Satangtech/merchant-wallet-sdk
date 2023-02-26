import { Client, MnemonicAccount, PrivkeyAccount } from "firovm-sdk";
import { Context } from "./context";
import { ProxyABI, SafeABI } from "./data/abi";
import {
  AddressZero,
  buildSignatureBytes,
  buildTransaction,
  getRandomIntAsString,
  MerchantTransaction,
  approveHash,
  AddressOne,
} from "./utils";

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

  getOptions(options: TxOptions = {}) {
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
    return sendOptions;
  }

  async deploy(options: TxOptions = {}): Promise<string> {
    if (this.context.getSingleton() === "") {
      throw new Error("Singleton address is not set");
    }
    if (this.context.getProxy() === "") {
      throw new Error("Proxy address is not set");
    }

    const sendOptions = this.getOptions(options);
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
    if (owners.length < threshold || owners.length < 1) {
      throw new Error("Invalid owners or threshold");
    }

    const sendOptions = this.getOptions(options);
    const contract = new this.client.Contract(SafeABI, await this.address());
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
    const contract = new this.client.Contract(SafeABI, await this.address());
    this.owners = (await contract.methods.getOwners().call())["0"];
    return this.owners;
  }

  async getThreshold(): Promise<number> {
    const contract = new this.client.Contract(SafeABI, await this.address());
    this.threshold = (await contract.methods.getThreshold().call())["0"];
    return this.threshold;
  }

  async getNonce(): Promise<number> {
    const contract = new this.client.Contract(SafeABI, await this.address());
    return (await contract.methods.nonce().call())["0"];
  }

  async buildTransaction(template: {
    to: string;
    value?: number;
    data?: string;
  }) {
    return buildTransaction({
      to: template.to,
      value: template.value || 0,
      data: template.data || "0x",
      nonce: await this.getNonce(),
    });
  }

  async getTransactionHash(tx: MerchantTransaction): Promise<string> {
    const contract = new this.client.Contract(SafeABI, await this.address());
    return (
      await contract.methods
        .getTransactionHash(
          tx.to,
          tx.value,
          tx.data,
          tx.operation,
          tx.safeTxGas,
          tx.baseGas,
          tx.gasPrice,
          tx.gasToken,
          tx.refundReceiver,
          tx.nonce
        )
        .call()
    )["0"];
  }

  async approveTransaction(
    txHash: string,
    options: TxOptions = {}
  ): Promise<string> {
    const sendOptions = this.getOptions(options);
    const contract = new this.client.Contract(SafeABI, await this.address());
    return await contract.methods.approveHash(txHash).send(sendOptions);
  }

  async executeTransaction(
    tx: MerchantTransaction,
    addressApprover: string[],
    options: TxOptions = {}
  ) {
    if (addressApprover.length < this.threshold) {
      throw new Error("Not enough approvers");
    }

    const signatures = [];
    for (let address of addressApprover) {
      signatures.push(approveHash(address));
    }
    const signatureBytes = buildSignatureBytes(signatures);

    const sendOptions = this.getOptions(options);
    const contract = new this.client.Contract(SafeABI, await this.address());
    return await contract.methods
      .execTransaction(
        tx.to,
        tx.value,
        tx.data,
        tx.operation,
        tx.safeTxGas,
        tx.baseGas,
        tx.gasPrice,
        tx.gasToken,
        tx.refundReceiver,
        signatureBytes
      )
      .send(sendOptions);
  }

  async getBalance(): Promise<number> {
    const { result, error } = await this.client.rpcClient.rpc(
      "getaccountinfo",
      [(await this.address()).replace("0x", "")]
    );
    if (error) {
      throw new Error(`Error: ${error.message}`);
    }
    return result.balance;
  }

  checkThreshold(threshold: number) {
    if (threshold < 1) {
      throw new Error("Invalid threshold");
    }
  }

  async changeThreshold(threshold: number) {
    this.checkThreshold(threshold);
    const owners = await this.getOwners();
    if (threshold > owners.length) {
      throw new Error("Threshold is greater than number of owners");
    }

    const contract = new this.client.Contract(SafeABI, await this.address());
    const data = await contract.methods.changeThreshold(threshold).encodeABI();

    const tx = await this.buildTransaction({
      to: this._address,
      data,
    });
    return tx;
  }

  async addOwner(owner: string, threshold: number) {
    this.checkThreshold(threshold);
    const owners = await this.getOwners();
    if (threshold > owners.length + 1) {
      throw new Error("Threshold is greater than number of owners");
    }

    const contract = new this.client.Contract(SafeABI, await this.address());
    const data = await contract.methods
      .addOwnerWithThreshold(owner, threshold)
      .encodeABI();

    const tx = await this.buildTransaction({
      to: this._address,
      data,
    });
    return tx;
  }

  getPrevOwner(owner: string, owners: string[]) {
    for (let i = 0; i < owners.length; i++) {
      if (i === 0 && owners[i] === owner) {
        return AddressOne;
      }
      if (owners[i] === owner) {
        return owners[i - 1];
      }
    }
  }

  async removeOwner(owner: string, threshold: number) {
    this.checkThreshold(threshold);
    const owners = await this.getOwners();
    if (threshold > owners.length - 1) {
      throw new Error("Threshold is greater than number of owners");
    }

    const prevOwner = this.getPrevOwner(owner, owners);
    const contract = new this.client.Contract(SafeABI, await this.address());
    const data = await contract.methods
      .removeOwner(prevOwner, owner, threshold)
      .encodeABI();

    const tx = await this.buildTransaction({
      to: this._address,
      data,
    });
    return tx;
  }
}
