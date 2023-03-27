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

const setupMerchantWallet = async () => {
  context
    .withProxy("0xb6ec75fc4caca826f5c71aabced67369d1cb5f86")
    .withSingleton("0x7946a92a12a28b14394e7a91e7404fa56efd882e");
  const merchantWallet = new MerchantWallet(
    context,
    client,
    account,
    "0x02c1dfab4b6503c3d259409965d133c1c69e6fd2"
  );
  const owners = [
    "0xb118e03f6575aa270673c8d86d6dcb07eb2d9221",
    "0x3f25390b04e4d0a9f007195e2f57247ae15b78d4",
    "0xecd971253154038c3cfb372e89c905e9db935375",
  ];
  const threshold = 1;

  const txId = await merchantWallet.setup(owners, threshold);
  await generateToAddress();

  const { result, error } = await rpcClient.getTransactionReceipt(txId);
  console.log(result);
};
setupMerchantWallet();
