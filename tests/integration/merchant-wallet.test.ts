import { suite, test } from "@testdeck/mocha";
import { expect } from "chai";
import {
  Client,
  Context,
  MnemonicAccount,
  PrivkeyAccount,
  RPCClient,
} from "firovm-sdk";
import { MerchantWallet, Testnet } from "../../lib";
import { testAddresses, testPrivkeys } from "./data/accounts";

@suite
class MerchantWalletTest {
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

  @test
  async createMerchantWallet() {}
}
