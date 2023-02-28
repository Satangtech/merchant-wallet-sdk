import { suite, test } from "@testdeck/mocha";
import { expect } from "chai";
import { Client, PrivkeyAccount, RPCClient } from "firovm-sdk";
import { Context, Factory, Testnet } from "../../lib";
import { testAddresses, testPrivkeys } from "./data/accounts";

@suite
class FactoryTest {
  constructor(
    private rpcUrl: URL,
    private rpcClient: RPCClient,
    private client: Client,
    private address: {
      testAddressMiner: string;
      testAddress1: string;
      testAddress2: string;
      testAddress3: string;
      testAddress4: string;
      testAddress5: string;
    },
    private privkey: {
      testPrivkeyMiner: string;
      testPrivkey1: string;
      testPrivkey2: string;
      testPrivkey3: string;
      testPrivkey4: string;
      testPrivkey5: string;
    },
    private context: Context,
    private account: {
      miner: PrivkeyAccount;
      acc1: PrivkeyAccount;
      acc2: PrivkeyAccount;
      acc3: PrivkeyAccount;
      acc4: PrivkeyAccount;
      acc5: PrivkeyAccount;
    }
  ) {
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

  async before() {
    await this.generateToAddress();
  }

  @test
  async init() {
    await this.sendToAddress(
      this.account.miner,
      this.address.testAddress1,
      10000 * 1e8
    );
  }

  @test
  async deploySingleton() {
    const factory = new Factory(this.client, this.account.acc1);
    const txId = await factory.deploySingleton();
    expect(txId).to.be.a("string");
    await this.generateToAddress();

    const { result, error } = await this.rpcClient.getTransactionReceipt(txId);
    expect(error).to.be.null;
    expect(result).to.be.a("array");
    expect(result[0].contractAddress).to.be.a("string");
    expect(result[0].excepted).to.be.equal("None");
    expect(result[0].contractAddress).to.be.equal(
      (await factory.addressSingleton())?.replace("0x", "")
    );
  }

  @test
  async deployProxy() {
    const factory = new Factory(this.client, this.account.acc1);
    const txId = await factory.deployProxy();
    expect(txId).to.be.a("string");
    await this.generateToAddress();

    const { result, error } = await this.rpcClient.getTransactionReceipt(txId);
    expect(error).to.be.null;
    expect(result).to.be.a("array");
    expect(result[0].contractAddress).to.be.a("string");
    expect(result[0].excepted).to.be.equal("None");
    expect(result[0].contractAddress).to.be.equal(
      (await factory.addressProxy())?.replace("0x", "")
    );
  }
}
