# merchant-wallet-sdk

## Installation

```bash
npm install merchant-wallet-sdk
```

### Example

#### Deploy Singleton and Proxy

You can make it into a separate script to run only once and then use the addresses of the Singleton and Proxy for further use.

```typescript
import { Factory, TxOptions } from "merchant-wallet-sdk";

const rpcUrl = "https://rpc.firovm.com";
const client = new Client(rpcUrl);
const account = new PrivkeyAccount(context, "privkey"); // or MnemonicAccount
const factory = new Factory(client, account);

const singletonTxId = await factory.deploySingleton(TxOptions?);
// singletonTxId: 0c10e2b83113e1f04ac2d6fe9bf0619cf8867a4ec32ac39466cbf5be7e072797

const proxyTxId = await factory.deployProxy(TxOptions?);
// proxyTxId: 0c10e2b83113e1f04ac2d6fe9bf0619cf8867a4ec32ac39466cbf5be7e072797

await factory.addressSingleton(); // 0x0000000000000000000000000000000Singleton
await factory.addressProxy(); // 0x0000000000000000000000000000ProxyAddress
```

#### Create a merchant wallet

```typescript
import { MerchantWallet, Context } from "merchant-wallet-sdk";
import { PrivkeyAccount, Network, Client } from "firovm-sdk";

const rpcUrl = "https://rpc.firovm.com";
const context = new Context()
  .withNetwork(Network.Testnet)
  .withProxy("0x0000000000000000000000000000ProxyAddress");
  .withSingleton("0x0000000000000000000000000000000Singleton");
const client = new Client(rpcUrl);
const account = new PrivkeyAccount(context, "privkey"); // or MnemonicAccount

interface TxOptions {
  gasPrice?: number;
  gas?: number;
  value?: number;
  input?: string;
}

const merchantWallet = new MerchantWallet(context, client, account);
// merchantWallet: Object of MerchantWallet

const createWalletTxId = await merchantWallet.deploy(TxOptions?);
// createWalletTxId: 0c10e2b83113e1f04ac2d6fe9bf0619cf8867a4ec32ac39466cbf5be7e072797
```

#### Recover a merchant wallet

```typescript
const merchantAddress = "0x0000000000000000000MerchantWalletAddress";
const merchantWallet = new MerchantWallet(
  context,
  client,
  account,
  merchantAddress
);
await merchantWallet.address(); // 0x0000000000000000000MerchantWalletAddress
```

#### Setup a merchant wallet

```typescript
const owner = [
  "0x000000000000000000000000000000000000add1",
  "0x000000000000000000000000000000000000add2",
  "0x000000000000000000000000000000000000add3",
];
const threshold = 2;

const setupTxId = await merchantWallet.setup(owner, threshold, TxOptions?);
// setupTxId: 0c10e2b83113e1f04ac2d6fe9bf0619cf8867a4ec32ac39466cbf5be7e072797
```

#### Get Threshold of the merchant wallet

```typescript
const threshold = await merchantWallet.getThreshold();
// threshold: 2
```

#### Get Owner of the merchant wallet

```typescript
const owner = await merchantWallet.getOwners();
// owner: [
//   "0x000000000000000000000000000000000000add1",
//   "0x000000000000000000000000000000000000add2",
//   "0x000000000000000000000000000000000000add3",
// ];
```

#### Deposit to the merchant wallet

```typescript
const amount = 100000000; // satoshi
const txId = await merchantWallet.deposit(amount);
// txId: 0c10e2b83113e1f04ac2d6fe9bf0619cf8867a4ec32ac39466cbf5be7e072797

// Send token to merchant wallet
const erc20 = new client.Contract(abiERC20, Erc20ContractAddress);
const txid = await erc20.methods
  .transfer(
    await merchantWallet.address(),
    (BigInt(10) * BigInt(1e18)).toString()
  )
  .send({
    from: account,
  });
```

#### Get Balance of the merchant wallet

```typescript
// Get balance of natives
const balance = await merchantWallet.getBalance();
// balance: 100000000

// Get balance of erc20
const erc20 = new client.Contract(abiERC20, Erc20ContractAddress);
const balance = await erc20.methods
  .balanceOf(await merchantWallet.address())
  .call();
// balance: { '0': '10000000000000000000', __length__: 1 }
```

#### Create Transaction and Approve Transaction

```typescript
const value = 10000; // satoshi
const to = "0x000000000000000000000000000000000000add4";

const merchantTx = await merchantWallet.buildTransaction({ to, value });
// merchantTx: {
//   to: "0x000000000000000000000000000000000000add4",
//   value: 10000,
// }

const merchantTxHash = await merchantWallet.getTransactionHash(merchantTx);
// merchantTxHash: 0xca51916524321d9ad4cd316b26866dbda3125cb5a06a134012d4c373f60ed165

// Send merchantTxHash to another owner to approve
// Or another owner can build transaction and approve transaction by himself
// Need to approve by threshold number of owners
const txIdApprove = await merchantWallet.approveTransaction(merchantTxHash);
// txIdApprove: 0c10e2b83113e1f04ac2d6fe9bf0619cf8867a4ec32ac39466cbf5be7e072797
```

#### Execute Transaction of the merchant wallet

```typescript
const merchantTx = await merchantWallet.buildTransaction({
  to: "0x000000000000000000000000000000000000add5",
  value: 10000, // satoshi
});
// merchantTx: {
//   to: "0x000000000000000000000000000000000000add5",
//   value: 10000,
// }

// Can execute transaction when approved by threshold number of owners
// In this case, threshold is 2, so need to approve by 2 owners
// Owner Add1 and Add2 already approved transaction hash
const addressApprover = [
  "0x000000000000000000000000000000000000add1",
  "0x000000000000000000000000000000000000add2",
];
const executeTxId = await merchantWallet.executeTransaction(
  merchantTx,
  addressApprover
);
// executeTxId: 0c10e2b83113e1f04ac2d6fe9bf0619cf8867a4ec32ac39466cbf5be7e072797
```

#### Execute Transaction with ERC20 Token

```typescript
const erc20 = new client.Contract(abiERC20, Erc20ContractAddress);
const value = (BigInt(10) * BigInt(1e18)).toString();
const to = "0x000000000000000000000000000000000000add4";
const data = erc20.methods.transfer(to, value).encodeABI();

const merchantTx = await merchantWallet.buildTransaction({
  to: Erc20ContractAddress,
  data,
});
// merchantTx: {
//   to: "0x000000000000000000000Erc20ContractAddress",
//   data: "0xa9059cbb0000000000000",
// }

// getTransactionHash and approveTransaction is the same

// Owner Add1 and Add2 already approved transaction hash
const addressApprover = [
  "0x000000000000000000000000000000000000add1",
  "0x000000000000000000000000000000000000add2",
];
const executeTxId = await merchantWallet.executeTransaction(
  merchantTx,
  addressApprover
);
// executeTxId: 0c10e2b83113e1f04ac2d6fe9bf0619cf8867a4ec32ac39466cbf5be7e072797
```

#### Change Threshold of the merchant wallet

```typescript
const newThreshold = 3;
const changeThresholdTx = merchantWallet.changeThreshold(newThreshold);
// merchantTx: {
//   to: "0x000000000000000000000MerchantWalletAddress", // await merchantWallet.address()
//   data: "0x6d4ce63c0000000000000003", // ABI Encode of changeThreshold
// }

// getTransactionHash and approveTransaction is the same

// Owner Add1 and Add3 already approved transaction hash
const addressApprover = [
  "0x000000000000000000000000000000000000add1",
  "0x000000000000000000000000000000000000add3",
];
const executeTxId = await merchantWallet.executeTransaction(
  changeThresholdTx,
  addressApprover
);
```

#### Add Owner to the merchant wallet

```typescript
const newOwner = "0x000000000000000000000000000000000000add4";
const newThreshold = 3;
const addOwnerTx = merchantWallet.addOwner(newOwner, newThreshold);
// addOwnerTx: {
//   to: "0x000000000000000000000MerchantWalletAddress", // await merchantWallet.address()
//   data: "0x00000000000ABIEncodeForAddOwner", // ABI Encode of addOwner
// }

// getTransactionHash and approveTransaction is the same

const addressApprover = [
  "0x000000000000000000000000000000000000add1",
  "0x000000000000000000000000000000000000add2",
  "0x000000000000000000000000000000000000add3",
];
const executeTxId = await merchantWallet.executeTransaction(
  addOwnerTx,
  addressApprover
);
// executeTxId: 0c10e2b83113e1f04ac2d6fe9bf0619cf8867a4ec32ac39466cbf5be7e072797
```

#### Remove Owner from the merchant wallet

```typescript
const ownerToRemove = "0x000000000000000000000000000000000000add3";
const newThreshold = 2;
const removeOwnerTx = merchantWallet.removeOwner(ownerToRemove, newThreshold);
// removeOwnerTx: {
//   to: "0x000000000000000000000MerchantWalletAddress", // await merchantWallet.address()
//   data: "0x00000000000ABIEncodeForRemoveOwner", // ABI Encode of removeOwner
// }

// getTransactionHash and approveTransaction is the same

const addressApprover = [
  "0x000000000000000000000000000000000000add1",
  "0x000000000000000000000000000000000000add2",
  "0x000000000000000000000000000000000000add4",
];
const executeTxId = await merchantWallet.executeTransaction(
  removeOwnerTx,
  addressApprover
);
// executeTxId: 0c10e2b83113e1f04ac2d6fe9bf0619cf8867a4ec32ac39466cbf5be7e072797
```

#### NFT

```typescript
// import from typescript or json file
import { AbiERC721 } from "./abi/erc721";

const Erc721Address = "0x000000000000000000000000000Erc721Address";
const erc721 = new client.Contract(AbiERC721, Erc721Address);

// transferFrom
const from = "0x000000000000000000000000000000000000from";
const to = "0x000000000000000000000000000000000000to";
const tokenId = 0;
const encodeData = await erc721.methods
  .transferFrom(from, to, tokenId)
  .encodeABI();

const merchantTx = await merchantWallet.buildTransaction({
  to: Erc721Address,
  data: encodeData,
});

// getTransactionHash and approveTransaction is the same

const addressApprover = [
  "0x000000000000000000000000000000000000add1",
  "0x000000000000000000000000000000000000add2",
];
const executeTxId = await merchantWallet.executeTransaction(
  merchantTx,
  addressApprover
);
// executeTxId: 0c10e2b83113e1f04ac2d6fe9bf0619cf8867a4ec32ac39466cbf5be7e072797
```

#### ERC721

```typescript
// This section will be about the SDK method that helps make it easier to use.
// safeTransferFromERC721
// approveERC721
// setApprovalForAllERC721
// transferFromERC721
// balanceOfERC721

// Example for balanceOfERC721
const Erc721Address = "0x000000000000000000000000000Erc721Address";
const balance = await merchantWallet.balanceOfERC721(Erc721Address);
// balance: 10

// Example for safeTransferFromERC721
const from = "0x000000000000000000000000000000000000from";
const to = "0x000000000000000000000000000000000000to";
const tokenId = 0;
const merchantTx = await merchantWallet.transferFromERC721(
  Erc721Address,
  from,
  to,
  tokenId
);

// getTransactionHash and approveTransaction is the same

const addressApprover = [
  "0x000000000000000000000000000000000000add1",
  "0x000000000000000000000000000000000000add2",
];
const executeTxId = await merchantWallet.executeTransaction(
  merchantTx,
  addressApprover
);
// executeTxId: 0c10e2b83113e1f04ac2d6fe9bf0619cf8867a4ec32ac39466cbf5be7e072797
```

#### ERC1155

```typescript
// This section will be about the SDK method that helps make it easier to use.
// safeTransferFromERC1155
// setApprovalForAllERC1155
// safeBatchTransferFromERC1155

// Example for safeTransferFromERC1155
const Erc11551Address = "0x000000000000000000000000000Erc11551Address";
const from = "0x000000000000000000000000000000000000from";
const to = "0x000000000000000000000000000000000000to";
const tokenId = 0;
const amount = 10;
const merchantTx = await merchantWallet.safeTransferFromERC1155(
  Erc11551Address,
  from,
  to,
  tokenId,
  amount
);

// getTransactionHash and approveTransaction is the same

const addressApprover = [
  "0x000000000000000000000000000000000000add1",
  "0x000000000000000000000000000000000000add2",
];
const executeTxId = await merchantWallet.executeTransaction(
  merchantTx,
  addressApprover
);
// executeTxId: 0c10e2b83113e1f04ac2d6fe9bf0619cf8867a4ec32ac39466cbf5be7e072797
```

#### Run Test

```bash
yarn test:it
```

```bash
yarn test:down
```
