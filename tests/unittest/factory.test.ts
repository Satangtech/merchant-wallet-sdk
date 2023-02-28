import { suite, test } from "@testdeck/mocha";
import { expect } from "chai";
import { Client, PrivkeyAccount } from "firovm-sdk";
import { Context, Factory, Testnet } from "../../lib";

@suite
class FactoryTest {
  @test
  public createFactory() {
    const rpcUrl = "http://localhost:8545";
    const client = new Client(rpcUrl);
    const context = new Context().withNetwork(Testnet);
    const account = new PrivkeyAccount(context);
    const factory = new Factory(client, account);
    expect(factory).to.be.instanceOf(Factory);
  }
}
