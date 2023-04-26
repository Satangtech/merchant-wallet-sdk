const { Client, PrivkeyAccount, RPCClient } = require("firovm-sdk");
const { Context, MerchantWallet, Testnet } = require("merchant-wallet-sdk");

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

const approveTransaction1TransferERC721 = async () => {
  context
    .withProxy("0x91ead1c01f00bffb97d9e11ddf23468d8f1ce963")
    .withSingleton("0x97b30d3a724eaf24dc422de0e08e4edcdb3009f0");
  const merchantAddress = "0x3f25390b04e4d0a9f007195e2f57247ae15b78d4";
  const merchantWallet = new MerchantWallet(
    context,
    client,
    account,
    merchantAddress
  );

  const merchantTxHash =
    "0xf5c7bc2c564b56ddf3516ded8e83c22444a480f1ff9be486e1145f429975d122";
  const txId = await merchantWallet.approveTransaction(merchantTxHash);
  await generateToAddress();
  const { result, error } = await rpcClient.getTransactionReceipt(txId);
  console.log("result:", result);
};
approveTransaction1TransferERC721();
