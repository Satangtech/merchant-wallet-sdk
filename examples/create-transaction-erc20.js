const { Client, PrivkeyAccount, RPCClient } = require("firovm-sdk");
const { Context, MerchantWallet, Testnet } = require("merchant-wallet-sdk");
const { abiERC20 } = require("./erc20");

const rpcUrl = new URL("http://test:test@127.0.0.1:1234");
const rpcClient = new RPCClient(rpcUrl.href);
const client = new Client(rpcUrl.href);
const context = new Context().withNetwork(Testnet);
const account = new PrivkeyAccount(
  context,
  "UV3NTQDeZqMUSW5d1qj3wD9Ds48H2KCB3b3ttuvRp45qBzSkATcU"
);

const generateToAddress = async () => {
  await rpcClient.rpc("generatetoaddress", [
    1,
    "TS7cQRdd6uU1wu2s94CmYsfe3WNUTctNih",
  ]);
};

const createTransactionERC20 = async () => {
  context
    .withProxy("0x91ead1c01f00bffb97d9e11ddf23468d8f1ce963")
    .withSingleton("0x97b30d3a724eaf24dc422de0e08e4edcdb3009f0");
  const merchantWallet = new MerchantWallet(
    context,
    client,
    account,
    "0x864fea261cd101c30a882c8e80b47792041aa8d8"
  );

  const Erc20Address = "0x97b30d3a724eaf24dc422de0e08e4edcdb3009f1";
  const erc20 = new client.Contract(abiERC20, Erc20Address);
  const value = (BigInt(1) * BigInt(1e18)).toString();
  const to = "0x3f25390b04e4d0a9f007195e2f57247ae15b78d4";
  const data = erc20.methods.transfer(to, value).encodeABI();

  const merchantTx = await merchantWallet.buildTransaction({
    to: Erc20Address,
    data,
  });
  const merchantTxHash = await merchantWallet.getTransactionHash(merchantTx);
  console.log("Merchant Tx Hash: ", merchantTxHash);
};
createTransactionERC20();
