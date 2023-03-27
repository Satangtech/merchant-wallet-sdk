const { Client, PrivkeyAccount, RPCClient } = require("firovm-sdk");
const { Context, Factory, Testnet } = require("merchant-wallet-sdk");

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

const deploySingleton = async () => {
  const factory = new Factory(client, account);
  const txId = await factory.deploySingleton();
  await generateToAddress();
  const { result, error } = await rpcClient.getTransactionReceipt(txId);
  console.log(result);
  const singletonAddress = await factory.addressSingleton();
  console.log("singletonAddress:", singletonAddress);
};
deploySingleton();
