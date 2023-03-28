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

const executeTransaction = async () => {
  context
    .withProxy("0x91ead1c01f00bffb97d9e11ddf23468d8f1ce963")
    .withSingleton("0x97b30d3a724eaf24dc422de0e08e4edcdb3009f0");
  const merchantWallet = new MerchantWallet(
    context,
    client,
    account,
    "0x864fea261cd101c30a882c8e80b47792041aa8d8"
  );

  const to = "0x3f25390b04e4d0a9f007195e2f57247ae15b78d4";
  const value = 1000;
  const merchantTx = await merchantWallet.buildTransaction({
    to,
    value,
  });
  const addressApprover = ["0xb118e03f6575aa270673c8d86d6dcb07eb2d9221"];

  const txId = await merchantWallet.executeTransaction(
    merchantTx,
    addressApprover
  );
  await generateToAddress();
  const { result, error } = await rpcClient.getTransactionReceipt(txId);
  console.log("result:", result);

  const balance = await merchantWallet.getBalance();
  console.log("balance:", balance);
};
executeTransaction();
