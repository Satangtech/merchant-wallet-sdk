import { suite, test } from "@testdeck/mocha";
import { expect } from "chai";
import { Factory } from "../../lib";
import { IntegrationTest } from "./integration.test";

@suite
class FactoryTest extends IntegrationTest {
  constructor() {
    super();
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
      (await factory.addressSingleton()).replace("0x", "")
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
      (await factory.addressProxy()).replace("0x", "")
    );
  }
}
