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

const deployMerchantWallet = async () => {
  context
    .withProxy("0xb6ec75fc4caca826f5c71aabced67369d1cb5f86")
    .withSingleton("0x7946a92a12a28b14394e7a91e7404fa56efd882e");
  const merchantWallet = new MerchantWallet(context, client, account);
  const txId = await merchantWallet.deploy();
  await generateToAddress();

  const { result, error } = await rpcClient.getTransactionReceipt(txId);
  console.log(result);
  const merchantAddress = await merchantWallet.address();
  console.log("merchantAddress:", merchantAddress);
};
deployMerchantWallet();
