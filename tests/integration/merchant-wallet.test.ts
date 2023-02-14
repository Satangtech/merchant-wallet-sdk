import { suite, test } from "@testdeck/mocha";
import { expect } from "chai";
import { Client, Context, PrivkeyAccount, RPCClient } from "firovm-sdk";
import { MerchantWallet, Testnet } from "../../lib";
import { testAddresses, testPrivkeys } from "./data";

@suite
class MerchantWalletTest {
  constructor(
    private mnemonic: string,
    private rpcUrl: string,
    private wallet: MerchantWallet,
    private firoUrl: URL,
    private rpcClient: RPCClient,
    private client: Client,
    private address: {
      testAddress1: string;
      testAddress2: string;
      testAddress3: string;
      testAddress4: string;
      testAddress5: string;
    },
    private privkey: {
      testPrivkey1: string;
      testPrivkey2: string;
      testPrivkey3: string;
      testPrivkey4: string;
      testPrivkey5: string;
    },
    private context: Context,
    private account: {
      acc1: PrivkeyAccount;
      acc2: PrivkeyAccount;
      acc3: PrivkeyAccount;
      acc4: PrivkeyAccount;
      acc5: PrivkeyAccount;
    }
  ) {
    this.mnemonic =
      "sand home split purity total soap solar predict talent enroll nut unable";
    this.rpcUrl = "http://janus:23889";
    this.wallet = new MerchantWallet(this.rpcUrl, Testnet, this.mnemonic);
    this.firoUrl = new URL("http://test:test@firovm:1234");
    this.rpcClient = new RPCClient(this.firoUrl.href);
    this.client = new Client(this.firoUrl.href);
    this.address = testAddresses;
    this.privkey = testPrivkeys;
    this.context = new Context().withNetwork(Testnet);
    this.account = {
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
      this.address.testAddress1,
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

  async loadWallet() {
    const res = await this.rpcClient.rpc("loadwallet", ["testwallet"]);
  }

  @test
  async init() {
    await this.loadWallet();
    await this.sendToAddress(
      this.account.acc1,
      this.wallet.mnemonic.address().toString(),
      1e8
    );
  }

  @test
  async getUtxos() {
    const utxos = await this.wallet.getUTXOs();
    expect(utxos).to.be.a("array");
    expect(utxos.length).to.be.greaterThan(0);
  }
}
