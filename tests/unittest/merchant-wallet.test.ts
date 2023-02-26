import { suite, test } from "@testdeck/mocha";
import { expect } from "chai";
import { Client, PrivkeyAccount } from "firovm-sdk";
import { MerchantWallet, Testnet, Context } from "../../lib";

@suite
class MerchantWalletTest {
  @test
  create() {
    const rpcUrl = "https://rpc.firovm.com";
    const context = new Context().withNetwork(Testnet);
    const account = new PrivkeyAccount(context);
    const client = new Client(rpcUrl);
    const merchantWallet = new MerchantWallet(context, client, account);
    expect(merchantWallet).to.be.an.instanceof(MerchantWallet);
  }

  @test
  async createWithProxy() {
    const rpcUrl = "https://rpc.firovm.com";
    const context = new Context().withNetwork(Testnet).withProxy("0x1234");
    const account = new PrivkeyAccount(context);
    const client = new Client(rpcUrl);
    const merchantWallet = new MerchantWallet(context, client, account);
    expect(merchantWallet).to.be.an.instanceof(MerchantWallet);
  }

  @test
  async createWithSingleton() {
    const rpcUrl = "https://rpc.firovm.com";
    const context = new Context().withNetwork(Testnet).withSingleton("0x1234");
    const account = new PrivkeyAccount(context);
    const client = new Client(rpcUrl);
    const merchantWallet = new MerchantWallet(context, client, account);
    expect(merchantWallet).to.be.an.instanceof(MerchantWallet);
  }

  @test
  async createWithProxyAndSingleton() {
    const rpcUrl = "https://rpc.firovm.com";
    const context = new Context()
      .withNetwork(Testnet)
      .withSingleton("0x1234")
      .withProxy("0x5678");
    const account = new PrivkeyAccount(context);
    const client = new Client(rpcUrl);
    const merchantWallet = new MerchantWallet(context, client, account);
    expect(merchantWallet).to.be.an.instanceof(MerchantWallet);
  }
}
