import { suite, test } from "@testdeck/mocha";
import { expect } from "chai";
import { MerchantWallet, Testnet } from "../../lib";

@suite
class MerchantWalletTest {
  constructor(private mnemonic: string, private rpcUrl: string) {
    this.mnemonic =
      "sand home split purity total soap solar predict talent enroll nut unable";
    this.rpcUrl = "http://janus:23889";
  }

  @test
  async testGetInfo() {
    const wallet = new MerchantWallet(this.rpcUrl, Testnet, this.mnemonic);
    const info = wallet.getInfo();
    expect(info.hex_address).to.equal(
      "0xAe7991F092D19e1D4753173AB9f8C9F307C9f542"
    );
    expect(info.address).to.equal("TRskDGsnMSH6ZAw9unjQS3Z3yQzjN4Pwxp");

    const wallet2 = new MerchantWallet(this.rpcUrl, Testnet, this.mnemonic, 1);
    const info2 = wallet2.getInfo();
    expect(info2.hex_address).to.equal(
      "0x5bd6Dbc8A1698ED5c89E4439B0f4B1d65A64b237"
    );
    expect(info2.address).to.equal("TJLot9Xyw1KFtuEvrtniU9vBzapgzFnYJt");

    const wallet3 = new MerchantWallet(this.rpcUrl, Testnet);
    const info3 = wallet3.getInfo();
    expect(info3.hex_address).to.be.string;
    expect(info3.address).to.be.string;
  }
}
