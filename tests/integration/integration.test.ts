import { expect } from "chai";
import { Client, PrivkeyAccount, RPCClient } from "firovm-sdk";
import { Context, Testnet } from "../../lib";
import { abiERC20 } from "./data/abi";
import { testAddresses, testPrivkeys } from "./data/accounts";
import { byteCodeContractERC20 } from "./data/bytecode";

export class IntegrationTest {
  rpcUrl: URL;
  rpcClient: RPCClient;
  client: Client;
  address: {
    testAddressMiner: string;
    testAddress1: string;
    testAddress2: string;
    testAddress3: string;
    testAddress4: string;
    testAddress5: string;
  };
  privkey: {
    testPrivkeyMiner: string;
    testPrivkey1: string;
    testPrivkey2: string;
    testPrivkey3: string;
    testPrivkey4: string;
    testPrivkey5: string;
  };
  context: Context;
  account: {
    miner: PrivkeyAccount;
    acc1: PrivkeyAccount;
    acc2: PrivkeyAccount;
    acc3: PrivkeyAccount;
    acc4: PrivkeyAccount;
    acc5: PrivkeyAccount;
  };

  constructor() {
    this.rpcUrl = new URL("http://test:test@firovm:1234");
    this.rpcClient = new RPCClient(this.rpcUrl.href);
    this.client = new Client(this.rpcUrl.href);
    this.address = testAddresses;
    this.privkey = testPrivkeys;
    this.context = new Context().withNetwork(Testnet);
    this.account = {
      miner: new PrivkeyAccount(this.context, this.privkey.testPrivkeyMiner),
      acc1: new PrivkeyAccount(this.context, this.privkey.testPrivkey1),
      acc2: new PrivkeyAccount(this.context, this.privkey.testPrivkey2),
      acc3: new PrivkeyAccount(this.context, this.privkey.testPrivkey3),
      acc4: new PrivkeyAccount(this.context, this.privkey.testPrivkey4),
      acc5: new PrivkeyAccount(this.context, this.privkey.testPrivkey5),
    };
  }

  getNewAccount(): PrivkeyAccount {
    return new PrivkeyAccount(new Context().withNetwork(Testnet));
  }

  async generateToAddress() {
    const res = await this.rpcClient.rpc("generatetoaddress", [
      1,
      this.address.testAddressMiner,
    ]);
    expect(res.result).to.be.a("array");
  }

  async sendToAddress(acc: PrivkeyAccount, addressTo: string, amount: number) {
    await this.client.sendFrom(
      acc,
      [
        {
          to: addressTo,
          value: amount,
        },
      ],
      { feePerKb: 400000 }
    );
    await this.generateToAddress();
  }

  async deployContractERC20(): Promise<string> {
    const contract = new this.client.Contract(abiERC20);
    const contractDeploy = contract.deploy(byteCodeContractERC20);
    const txid = await contractDeploy.send({ from: this.account.acc1 });
    expect(txid).to.be.a("string");
    await this.generateToAddress();

    const response = await this.rpcClient.getTransactionReceipt(txid);
    expect(response.result.length).to.be.greaterThan(0);
    expect(response.result[0].contractAddress).to.be.a("string");
    return response.result[0].contractAddress;
  }

  async before() {
    await this.generateToAddress();
  }
}
