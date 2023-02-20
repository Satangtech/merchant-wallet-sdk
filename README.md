# merchant-wallet-sdk

## Installation

```bash
npm install merchant-wallet-sdk
```

### Example

- Create a merchant wallet

```typescript
import { MerchantWallet } from "merchant-wallet-sdk";
import { Context, PrivkeyAccount, Network } from "firovm-sdk";

const rpcUrl = "https://rpc.firovm.com";
const owner = ["0xadd1", "0xadd2", "0xadd3"];
const context = new Context().withNetwork(Network.Testnet);
const account = new PrivkeyAccount(context, "privkey");
const threshold = 2;

const merchantWallet = new MerchantWallet(rpcUrl, account, owner, threshold);
```

- Recover a merchant wallet

```typescript
const merchantWalletAddress = "0xMerchantWalletAddress";
const merchantWallet = new MerchantWallet(
  rpcUrl,
  account,
  owner,
  threshold,
  merchantWalletAddress
);
```

- Get Threshold of the merchant wallet

```typescript
const threshold = await merchantWallet.getThreshold();
```

- Get Owner of the merchant wallet

```typescript
const owner = await merchantWallet.getOwner();
```

- Deposit to the merchant wallet

```typescript
const amount = 100000000; // satoshi
const txHash = await merchantWallet.deposit(amount);

// Send token to merchant wallet
const erc20 = new client.Contract(abiERC20, Erc20ContractAddress);
const txid = await contract.methods
  .transfer(merchantWallet.address, (BigInt(10) * BigInt(1e18)).toString())
  .send({
    from: account,
  });
```

- Get Balance of the merchant wallet

```typescript
// Get balance of natives
const balance = await merchantWallet.getBalance();

// Get balance of erc20
const erc20 = new client.Contract(abiERC20, Erc20ContractAddress);
const balance = await erc20.methods.balanceOf(merchantWallet.address).call();
```

- Create Transaction and Approve Transaction

```typescript
const value = 10000; // satoshi
const to = "0xadd4";

const merchantTx = merchantWallet.buildTransaction(to, value);
const merchantTxHash = await merchantWallet.getTransactionHash(merchantTx);

// Send merchantTxHash to another owner to approve
// Or another owner can build transaction and approve transaction by himself
// Need to approve by threshold number of owners
const txIdApprove = await merchantWallet.approveTransaction(merchantTxHash);
```

- Execute Transaction of the merchant wallet

```typescript
const merchantTx = merchantWallet.buildTransaction(to, value);

// Can execute transaction when approved by threshold number of owners
// In this case, threshold is 2, so need to approve by 2 owners
// Owner Add1 and Add2 already approved transaction hash
const addressApprover = ["0xadd1", "0xadd2"];
const txIdExecute = await merchantWallet.executeTransaction(
  merchantTx,
  addressApprover
);
```

- Execute Transaction with ERC20 Token

```typescript
const erc20 = new client.Contract(abiERC20, Erc20ContractAddress);
const value = (BigInt(10) * BigInt(1e18)).toString();
const to = "0xadd4";
const data = erc20.methods.transfer(to, value).encodeABI();

const merchantTx = merchantWallet.buildTransaction(
  Erc20ContractAddress,
  0,
  data
);

// getTransactionHash and approveTransaction is the same

// Owner Add1 and Add2 already approved transaction hash
const addressApprover = ["0xadd1", "0xadd2"];
const txIdExecute = await merchantWallet.executeTransaction(
  merchantTx,
  addressApprover
);
```

- Change Threshold of the merchant wallet

```typescript
const newThreshold = 3;
const changeThresholdTx = merchantWallet.changeThreshold(newThreshold);

// getTransactionHash and approveTransaction is the same

// Owner Add1 and Add3 already approved transaction hash
const addressApprover = ["0xadd1", "0xadd3"];
const txIdExecute = await merchantWallet.executeTransaction(
  changeThresholdTx,
  addressApprover
);
```

- Add Owner to the merchant wallet

```typescript
const newOwner = "0xadd4";
const newThreshold = 3;
const addOwnerTx = merchantWallet.addOwner(newOwner, newThreshold);

// getTransactionHash and approveTransaction is the same

const addressApprover = ["0xadd1", "0xadd2", "0xadd3"];
const txIdExecute = await merchantWallet.executeTransaction(
  addOwnerTx,
  addressApprover
);
```

- Remove Owner from the merchant wallet

```typescript
const ownerToRemove = "0xadd3";
const newThreshold = 2;
const removeOwnerTx = merchantWallet.removeOwner(ownerToRemove, newThreshold);

// getTransactionHash and approveTransaction is the same

const addressApprover = ["0xadd1", "0xadd2", "0xadd4"];
const txIdExecute = await merchantWallet.executeTransaction(
  removeOwnerTx,
  addressApprover
);
```
