import { suite, test } from "@testdeck/mocha";
import { expect } from "chai";
import {
  AddressOne,
  approveHash,
  buildTransaction,
  fromHexAddress,
  getRandomIntAsString,
  randomInt256,
} from "../../lib";

@suite
class UtilTest {
  @test
  randomInt256() {
    const randomInt = randomInt256();
    expect(randomInt).to.be.a("bigint");
  }

  @test
  getRandomIntAsString() {
    const randomString = getRandomIntAsString();
    expect(randomString).to.be.a("string");
  }

  @test
  fromHexAddress() {
    const address = fromHexAddress(AddressOne);
    expect(address).to.be.a("string");
  }

  @test
  buildTransaction() {
    const tx = buildTransaction({ to: AddressOne, nonce: 1 });
    expect(tx).to.be.a("object");
    expect(tx).to.have.property("to");
    expect(tx).to.have.property("value");
    expect(tx).to.have.property("data");
    expect(tx).to.have.property("operation");
    expect(tx).to.have.property("safeTxGas");
    expect(tx).to.have.property("baseGas");
    expect(tx).to.have.property("gasPrice");
    expect(tx).to.have.property("gasToken");
    expect(tx).to.have.property("refundReceiver");
    expect(tx).to.have.property("nonce");
  }

  @test
  approveHash() {
    const approve = approveHash(AddressOne);
    expect(approve.signer).to.be.a("string");
    expect(approve.signer).to.be.equal(AddressOne);
    expect(approve.data).to.be.a("string");
    expect(approve.data).to.be.equal(
      `0x000000000000000000000000${AddressOne.slice(
        2
      )}000000000000000000000000000000000000000000000000000000000000000001`
    );
  }
}
