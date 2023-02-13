import { suite, test } from "@testdeck/mocha";
import { expect } from "chai";

@suite
class Hello {
  @test
  world() {
    expect(true).to.be.true;
  }
}
