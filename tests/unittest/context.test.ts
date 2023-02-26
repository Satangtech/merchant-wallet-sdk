import { suite, test } from "@testdeck/mocha";
import { expect } from "chai";
import { Testnet, Context } from "../../lib";

@suite
class ContextTest {
  @test
  public context() {
    const context = new Context().withNetwork(Testnet);
    expect(context.network).to.equal(Testnet);
    expect(context.getProxy()).to.equal("");
    expect(context.getSingleton()).to.equal("");
  }

  @test
  public contextWithProxy() {
    const context = new Context().withNetwork(Testnet).withProxy("0x1234");
    expect(context.network).to.equal(Testnet);
    expect(context.getProxy()).to.equal("0x1234");
    expect(context.getSingleton()).to.equal("");
  }

  @test
  public contextWithSingleton() {
    const context = new Context().withNetwork(Testnet).withSingleton("0x1234");
    expect(context.network).to.equal(Testnet);
    expect(context.getProxy()).to.equal("");
    expect(context.getSingleton()).to.equal("0x1234");
  }

  @test
  public contextWithProxyAndSingleton() {
    const context = new Context()
      .withNetwork(Testnet)
      .withProxy("0x1234")
      .withSingleton("0x5678");
    expect(context.network).to.equal(Testnet);
    expect(context.getProxy()).to.equal("0x1234");
    expect(context.getSingleton()).to.equal("0x5678");
  }
}
