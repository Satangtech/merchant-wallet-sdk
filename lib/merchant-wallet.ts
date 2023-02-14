import { MnemonicAccount, Context, Network } from "firovm-sdk";

export class MerchantWallet {
  mnemonic: MnemonicAccount;
  context: Context;

  constructor(
    private rpcUrl: string,
    private network?: Network,
    private mnemonicWords?: string,
    private accountIndex: number = 0
  ) {
    this.context = new Context().withNetwork(
      network ? network : Network.Mainnet
    );
    this.mnemonic = mnemonicWords
      ? new MnemonicAccount(this.context, mnemonicWords, accountIndex)
      : new MnemonicAccount(this.context);
  }

  async rpc(method: string, params: any = []) {
    const init = {
      method: "post",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: Date.now().toString(),
        jsonrpc: "2.0",
        method,
        params: params ? params : [],
      }),
    };
    const resTx = await fetch(this.rpcUrl, init);
    const resJsonTx = await resTx.json();
    return resJsonTx;
  }

  getInfo() {
    return {
      hex_address: this.mnemonic.hex_address(),
      address: this.mnemonic.address().toString(),
    };
  }

  async getUTXOs(amount = 1) {
    const { result } = await this.rpc("qtum_getUTXOs", [
      this.mnemonic.hex_address(),
      amount,
    ]);
    return result;
  }
}
