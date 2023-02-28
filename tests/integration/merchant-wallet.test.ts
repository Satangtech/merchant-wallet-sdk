import { suite, test } from "@testdeck/mocha";
import { expect } from "chai";
import { Client, PrivkeyAccount, RPCClient } from "firovm-sdk";
import { Context, Factory, MerchantWallet, Testnet } from "../../lib";
import { abiERC20 } from "./data/abi";
import { testAddresses, testPrivkeys } from "./data/accounts";
import { byteCodeContractERC20 } from "./data/bytecode";

let SingletonAddress: string;
let ProxyAddress: string;
let SafeAddress: string;
let Erc20Address: string;
let merchantTxHash: string;

@suite
class MerchantWalletTest {
  constructor(
    private rpcUrl: URL,
    private rpcClient: RPCClient,
    private client: Client,
    private address: {
      testAddressMiner: string;
      testAddress1: string;
      testAddress2: string;
      testAddress3: string;
      testAddress4: string;
      testAddress5: string;
    },
    private privkey: {
      testPrivkeyMiner: string;
      testPrivkey1: string;
      testPrivkey2: string;
      testPrivkey3: string;
      testPrivkey4: string;
      testPrivkey5: string;
    },
    private context: Context,
    private account: {
      miner: PrivkeyAccount;
      acc1: PrivkeyAccount;
      acc2: PrivkeyAccount;
      acc3: PrivkeyAccount;
      acc4: PrivkeyAccount;
      acc5: PrivkeyAccount;
    }
  ) {
    this.rpcUrl = new URL("http://test:test@firovm:1234");
    this.rpcClient = new RPCClient(this.rpcUrl.href);
    this.client = new Client(this.rpcUrl.href);
    this.address = testAddresses;
    this.privkey = testPrivkeys;
    this.context = new Context().withNetwork(Testnet);
    this.account = {
      miner: new PrivkeyAccount(this.context, this.privkey.testPrivkeyMiner),
      acc1: new PrivkeyAccount(this.context, this.privkey.testPrivkey1),
      acc2: new PrivkeyAccount(this.context, this.privkey.testPrivkey2),
      acc3: new PrivkeyAccount(this.context, this.privkey.testPrivkey3),
      acc4: new PrivkeyAccount(this.context, this.privkey.testPrivkey4),
      acc5: new PrivkeyAccount(this.context, this.privkey.testPrivkey5),
    };
  }

  async generateToAddress() {
    const res = await this.rpcClient.rpc("generatetoaddress", [
      1,
      this.address.testAddressMiner,
    ]);
    expect(res.result).to.be.a("array");
  }

  async sendToAddress(acc: PrivkeyAccount, addressTo: string, amount: number) {
    await this.client.sendFrom(
      acc,
      [
        {
          to: addressTo,
          value: amount,
        },
      ],
      { feePerKb: 400000 }
    );
    await this.generateToAddress();
  }

  async deploySingleton() {
    const factory = new Factory(this.client, this.account.acc1);
    const txId = await factory.deploySingleton();
    expect(txId).to.be.a("string");
    await this.generateToAddress();

    const { result, error } = await this.rpcClient.getTransactionReceipt(txId);
    expect(error).to.be.null;
    expect(result).to.be.a("array");
    expect(result[0].contractAddress).to.be.a("string");
    expect(result[0].excepted).to.be.equal("None");
    expect(result[0].contractAddress).to.be.equal(
      (await factory.addressSingleton()).replace("0x", "")
    );
    SingletonAddress = await factory.addressSingleton();
  }

  async deployProxy() {
    const factory = new Factory(this.client, this.account.acc1);
    const txId = await factory.deployProxy();
    expect(txId).to.be.a("string");
    await this.generateToAddress();

    const { result, error } = await this.rpcClient.getTransactionReceipt(txId);
    expect(error).to.be.null;
    expect(result).to.be.a("array");
    expect(result[0].contractAddress).to.be.a("string");
    expect(result[0].excepted).to.be.equal("None");
    expect(result[0].contractAddress).to.be.equal(
      (await factory.addressProxy()).replace("0x", "")
    );
    ProxyAddress = await factory.addressProxy();
  }

  async deployContractERC20() {
    const contract = new this.client.Contract(abiERC20);
    const contractDeploy = contract.deploy(byteCodeContractERC20);
    const txid = await contractDeploy.send({ from: this.account.acc1 });
    expect(txid).to.be.a("string");
    await this.generateToAddress();

    const response = await this.rpcClient.getTransactionReceipt(txid);
    expect(response.result.length).to.be.greaterThan(0);
    expect(response.result[0].contractAddress).to.be.a("string");
    Erc20Address = response.result[0].contractAddress;
  }

  async before() {
    await this.generateToAddress();
    this.context.withProxy(ProxyAddress).withSingleton(SingletonAddress);
  }

  @test
  async init() {
    await this.sendToAddress(
      this.account.miner,
      this.address.testAddress1,
      10000 * 1e8
    );
    await this.sendToAddress(
      this.account.acc1,
      this.address.testAddress2,
      100 * 1e8
    );
    await this.sendToAddress(
      this.account.acc1,
      this.address.testAddress3,
      100 * 1e8
    );
    await this.deploySingleton();
    await this.deployProxy();
    await this.deployContractERC20();
  }

  @test
  async deployMerchantWallet() {
    const merchantWallet = new MerchantWallet(
      this.context,
      this.client,
      this.account.acc1
    );
    const txId = await merchantWallet.deploy();
    expect(txId).to.be.a("string");
    await this.generateToAddress();

    const { result, error } = await this.rpcClient.getTransactionReceipt(txId);
    expect(error).to.be.null;
    expect(result).to.be.a("array");
    expect(result[0].excepted).to.be.equal("None");
    SafeAddress = await merchantWallet.address();
  }

  @test
  async setupMerchantWallet() {
    const merchantWallet = new MerchantWallet(
      this.context,
      this.client,
      this.account.acc1,
      SafeAddress
    );
    const owners = [
      this.account.acc1.hex_address(),
      this.account.acc2.hex_address(),
      this.account.acc3.hex_address(),
    ];
    const threshold = 2;

    const txId = await merchantWallet.setup(owners, threshold);
    expect(txId).to.be.a("string");
    await this.generateToAddress();

    const { result, error } = await this.rpcClient.getTransactionReceipt(txId);
    expect(error).to.be.null;
    expect(result).to.be.a("array");
    expect(result[0].excepted).to.be.equal("None");
  }

  @test
  async getThreshold() {
    const merchantWallet = new MerchantWallet(
      this.context,
      this.client,
      this.account.acc1,
      SafeAddress
    );
    const threshold = await merchantWallet.getThreshold();
    expect(threshold).to.be.a("number");
    expect(threshold).to.be.equal(2);
  }

  @test
  async getOwners() {
    const merchantWallet = new MerchantWallet(
      this.context,
      this.client,
      this.account.acc1,
      SafeAddress
    );
    const owners = await merchantWallet.getOwners();
    expect(owners).to.be.a("array");
    expect(owners).to.be.deep.equal([
      this.account.acc1.hex_address(),
      this.account.acc2.hex_address(),
      this.account.acc3.hex_address(),
    ]);
  }

  @test
  async deposit() {
    const merchantWallet = new MerchantWallet(
      this.context,
      this.client,
      this.account.acc1,
      SafeAddress
    );
    const txId = await merchantWallet.deposit(10 * 1e8);
    expect(txId).to.be.a("string");
    await this.generateToAddress();

    const { result, error } = await this.rpcClient.getTransactionReceipt(txId);
    expect(error).to.be.null;
    expect(result).to.be.a("array");
    expect(result[0].excepted).to.be.equal("None");
  }

  @test
  async getBalance() {
    const merchantWallet = new MerchantWallet(
      this.context,
      this.client,
      this.account.acc1,
      SafeAddress
    );
    const balance = await merchantWallet.getBalance();
    expect(balance).to.be.a("number");
    expect(balance).to.be.equal(10 * 1e8);
  }

  @test
  async depositERC20() {
    const merchantWallet = new MerchantWallet(
      this.context,
      this.client,
      this.account.acc1,
      SafeAddress
    );
    const erc20 = new this.client.Contract(abiERC20, Erc20Address);
    const txId = await erc20.methods
      .transfer(
        await merchantWallet.address(),
        (BigInt(10) * BigInt(1e18)).toString()
      )
      .send({
        from: this.account.acc1,
      });
    expect(txId).to.be.a("string");
    await this.generateToAddress();

    const { result, error } = await this.rpcClient.getTransactionReceipt(txId);
    expect(error).to.be.null;
    expect(result).to.be.a("array");
    expect(result[0].excepted).to.be.equal("None");
  }

  @test
  async getBalanceERC20() {
    const merchantWallet = new MerchantWallet(
      this.context,
      this.client,
      this.account.acc1,
      SafeAddress
    );
    const erc20 = new this.client.Contract(abiERC20, Erc20Address);
    const balance = (
      await erc20.methods.balanceOf(await merchantWallet.address()).call()
    )["0"];
    expect(balance).to.be.a("string");
    expect(balance).to.be.equal("10000000000000000000");
  }

  @test
  async createTransaction() {
    const merchantWallet = new MerchantWallet(
      this.context,
      this.client,
      this.account.acc1,
      SafeAddress
    );
    const value = 10000;
    const to = this.account.acc5.hex_address();
    const merchantTx = await merchantWallet.buildTransaction({
      to,
      value,
    });
    merchantTxHash = await merchantWallet.getTransactionHash(merchantTx);
    expect(merchantTxHash).to.be.a("string");
  }

  @test
  async approveTransaction1() {
    const merchantWallet = new MerchantWallet(
      this.context,
      this.client,
      this.account.acc1,
      SafeAddress
    );
    const txId = await merchantWallet.approveTransaction(merchantTxHash);
    expect(txId).to.be.a("string");
    await this.generateToAddress();

    const { result, error } = await this.rpcClient.getTransactionReceipt(txId);
    expect(error).to.be.null;
    expect(result).to.be.a("array");
    expect(result[0].excepted).to.be.equal("None");
  }

  @test
  async approveTransaction2() {
    const merchantWallet = new MerchantWallet(
      this.context,
      this.client,
      this.account.acc2,
      SafeAddress
    );
    const txId = await merchantWallet.approveTransaction(merchantTxHash);
    expect(txId).to.be.a("string");
    await this.generateToAddress();

    const { result, error } = await this.rpcClient.getTransactionReceipt(txId);
    expect(error).to.be.null;
    expect(result).to.be.a("array");
    expect(result[0].excepted).to.be.equal("None");
  }

  @test
  async executeTransaction() {
    const merchantWallet = new MerchantWallet(
      this.context,
      this.client,
      this.account.acc1,
      SafeAddress
    );
    const value = 10000;
    const to = this.account.acc5.hex_address();
    const merchantTx = await merchantWallet.buildTransaction({
      to,
      value,
    });
    const addressApprover = [
      this.account.acc1.hex_address(),
      this.account.acc2.hex_address(),
    ];
    const txId = await merchantWallet.executeTransaction(
      merchantTx,
      addressApprover
    );
    expect(txId).to.be.a("string");
    await this.generateToAddress();

    const { result, error } = await this.rpcClient.getTransactionReceipt(txId);
    expect(error).to.be.null;
    expect(result).to.be.a("array");
    expect(result[0].excepted).to.be.equal("None");

    expect(
      await this.client.getBalance(this.account.acc5.address().toString())
    ).to.be.equal(value);
    expect(await merchantWallet.getBalance()).to.be.equal(999990000);
  }

  @test
  async changeThreshold() {
    const merchantWallet = new MerchantWallet(
      this.context,
      this.client,
      this.account.acc1,
      SafeAddress
    );
    const changeThresholdTx = await merchantWallet.changeThreshold(3);
    merchantTxHash = await merchantWallet.getTransactionHash(changeThresholdTx);
    expect(merchantTxHash).to.be.a("string");
  }

  @test
  async approveChangeThreshold1() {
    const merchantWallet = new MerchantWallet(
      this.context,
      this.client,
      this.account.acc1,
      SafeAddress
    );
    const txId = await merchantWallet.approveTransaction(merchantTxHash);
    expect(txId).to.be.a("string");
    await this.generateToAddress();

    const { result, error } = await this.rpcClient.getTransactionReceipt(txId);
    expect(error).to.be.null;
    expect(result).to.be.a("array");
    expect(result[0].excepted).to.be.equal("None");
  }

  @test
  async approveChangeThreshold2() {
    const merchantWallet = new MerchantWallet(
      this.context,
      this.client,
      this.account.acc2,
      SafeAddress
    );
    const txId = await merchantWallet.approveTransaction(merchantTxHash);
    expect(txId).to.be.a("string");
    await this.generateToAddress();

    const { result, error } = await this.rpcClient.getTransactionReceipt(txId);
    expect(error).to.be.null;
    expect(result).to.be.a("array");
    expect(result[0].excepted).to.be.equal("None");
  }

  @test
  async executeChangeThreshold() {
    const merchantWallet = new MerchantWallet(
      this.context,
      this.client,
      this.account.acc1,
      SafeAddress
    );
    const changeThresholdTx = await merchantWallet.changeThreshold(3);
    const addressApprover = [
      this.account.acc1.hex_address(),
      this.account.acc2.hex_address(),
    ];
    const txId = await merchantWallet.executeTransaction(
      changeThresholdTx,
      addressApprover
    );
    expect(txId).to.be.a("string");
    await this.generateToAddress();

    const { result, error } = await this.rpcClient.getTransactionReceipt(txId);
    expect(error).to.be.null;
    expect(result).to.be.a("array");
    expect(result[0].excepted).to.be.equal("None");
    expect(await merchantWallet.getThreshold()).to.be.equal(3);
  }

  @test
  async crateTransactionERC20() {
    const merchantWallet = new MerchantWallet(
      this.context,
      this.client,
      this.account.acc1,
      SafeAddress
    );
    const erc20 = new this.client.Contract(abiERC20, Erc20Address);
    const value = (BigInt(1) * BigInt(1e18)).toString();
    const to = this.account.acc5.hex_address();
    const data = erc20.methods.transfer(to, value).encodeABI();

    const merchantTx = await merchantWallet.buildTransaction({
      to: `0x${Erc20Address}`,
      data,
    });
    merchantTxHash = await merchantWallet.getTransactionHash(merchantTx);
    expect(merchantTxHash).to.be.a("string");
  }

  @test
  async approveTransactionERC201() {
    const merchantWallet = new MerchantWallet(
      this.context,
      this.client,
      this.account.acc1,
      SafeAddress
    );
    const txId = await merchantWallet.approveTransaction(merchantTxHash);
    expect(txId).to.be.a("string");
    await this.generateToAddress();

    const { result, error } = await this.rpcClient.getTransactionReceipt(txId);
    expect(error).to.be.null;
    expect(result).to.be.a("array");
    expect(result[0].excepted).to.be.equal("None");
  }

  @test
  async approveTransactionERC202() {
    const merchantWallet = new MerchantWallet(
      this.context,
      this.client,
      this.account.acc2,
      SafeAddress
    );
    const txId = await merchantWallet.approveTransaction(merchantTxHash);
    expect(txId).to.be.a("string");
    await this.generateToAddress();

    const { result, error } = await this.rpcClient.getTransactionReceipt(txId);
    expect(error).to.be.null;
    expect(result).to.be.a("array");
    expect(result[0].excepted).to.be.equal("None");
  }

  @test
  async approveTransactionERC203() {
    const merchantWallet = new MerchantWallet(
      this.context,
      this.client,
      this.account.acc3,
      SafeAddress
    );
    const txId = await merchantWallet.approveTransaction(merchantTxHash);
    expect(txId).to.be.a("string");
    await this.generateToAddress();

    const { result, error } = await this.rpcClient.getTransactionReceipt(txId);
    expect(error).to.be.null;
    expect(result).to.be.a("array");
    expect(result[0].excepted).to.be.equal("None");
  }

  @test
  async executeTransactionERC20() {
    const merchantWallet = new MerchantWallet(
      this.context,
      this.client,
      this.account.acc1,
      SafeAddress
    );
    const erc20 = new this.client.Contract(abiERC20, Erc20Address);
    const value = (BigInt(1) * BigInt(1e18)).toString();
    const to = this.account.acc5.hex_address();
    const data = erc20.methods.transfer(to, value).encodeABI();

    const merchantTx = await merchantWallet.buildTransaction({
      to: `0x${Erc20Address}`,
      data,
    });
    const addressApprover = [
      this.account.acc1.hex_address(),
      this.account.acc2.hex_address(),
      this.account.acc3.hex_address(),
    ];
    const txId = await merchantWallet.executeTransaction(
      merchantTx,
      addressApprover
    );
    expect(txId).to.be.a("string");
    await this.generateToAddress();

    const { result, error } = await this.rpcClient.getTransactionReceipt(txId);
    expect(error).to.be.null;
    expect(result).to.be.a("array");
    expect(result[0].excepted).to.be.equal("None");

    expect(
      (await erc20.methods.balanceOf(await merchantWallet.address()).call())[
        "0"
      ]
    ).to.be.equal("9000000000000000000");
    expect(
      (await erc20.methods.balanceOf(this.account.acc5.hex_address()).call())[
        "0"
      ]
    ).to.be.equal(value);
  }

  @test
  async addOwner() {
    const merchantWallet = new MerchantWallet(
      this.context,
      this.client,
      this.account.acc1,
      SafeAddress
    );
    const newOwner = this.account.acc4.hex_address();
    const threshold = 2;
    const addOwnerTx = await merchantWallet.addOwner(newOwner, threshold);
    merchantTxHash = await merchantWallet.getTransactionHash(addOwnerTx);
    expect(merchantTxHash).to.be.a("string");
  }

  @test
  async approveAddOwner1() {
    const merchantWallet = new MerchantWallet(
      this.context,
      this.client,
      this.account.acc1,
      SafeAddress
    );
    const txId = await merchantWallet.approveTransaction(merchantTxHash);
    expect(txId).to.be.a("string");
    await this.generateToAddress();

    const { result, error } = await this.rpcClient.getTransactionReceipt(txId);
    expect(error).to.be.null;
    expect(result).to.be.a("array");
    expect(result[0].excepted).to.be.equal("None");
  }

  @test
  async approveAddOwner2() {
    const merchantWallet = new MerchantWallet(
      this.context,
      this.client,
      this.account.acc2,
      SafeAddress
    );
    const txId = await merchantWallet.approveTransaction(merchantTxHash);
    expect(txId).to.be.a("string");
    await this.generateToAddress();

    const { result, error } = await this.rpcClient.getTransactionReceipt(txId);
    expect(error).to.be.null;
    expect(result).to.be.a("array");
    expect(result[0].excepted).to.be.equal("None");
  }

  @test
  async approveAddOwner3() {
    const merchantWallet = new MerchantWallet(
      this.context,
      this.client,
      this.account.acc3,
      SafeAddress
    );
    const txId = await merchantWallet.approveTransaction(merchantTxHash);
    expect(txId).to.be.a("string");
    await this.generateToAddress();

    const { result, error } = await this.rpcClient.getTransactionReceipt(txId);
    expect(error).to.be.null;
    expect(result).to.be.a("array");
    expect(result[0].excepted).to.be.equal("None");
  }

  @test
  async executeAddOwner() {
    const merchantWallet = new MerchantWallet(
      this.context,
      this.client,
      this.account.acc1,
      SafeAddress
    );
    const addressApprover = [
      this.account.acc1.hex_address(),
      this.account.acc2.hex_address(),
      this.account.acc3.hex_address(),
    ];
    const newOwner = this.account.acc4.hex_address();
    const threshold = 2;
    const addOwnerTx = await merchantWallet.addOwner(newOwner, threshold);
    const txId = await merchantWallet.executeTransaction(
      addOwnerTx,
      addressApprover
    );
    expect(txId).to.be.a("string");
    await this.generateToAddress();

    const { result, error } = await this.rpcClient.getTransactionReceipt(txId);
    expect(error).to.be.null;
    expect(result).to.be.a("array");
    expect(result[0].excepted).to.be.equal("None");
    expect(await merchantWallet.getOwners()).to.be.deep.equal([
      this.account.acc4.hex_address(),
      this.account.acc1.hex_address(),
      this.account.acc2.hex_address(),
      this.account.acc3.hex_address(),
    ]);
    expect(await merchantWallet.getThreshold()).to.be.equal(threshold);
  }

  @test
  async removeOwner() {
    const merchantWallet = new MerchantWallet(
      this.context,
      this.client,
      this.account.acc1,
      SafeAddress
    );
    const ownerToRemove = this.account.acc3.hex_address();
    const threshold = 2;
    const removeOwnerTx = await merchantWallet.removeOwner(
      ownerToRemove,
      threshold
    );
    merchantTxHash = await merchantWallet.getTransactionHash(removeOwnerTx);
    expect(merchantTxHash).to.be.a("string");
  }

  @test
  async approveRemoveOwner1() {
    const merchantWallet = new MerchantWallet(
      this.context,
      this.client,
      this.account.acc1,
      SafeAddress
    );
    const txId = await merchantWallet.approveTransaction(merchantTxHash);
    expect(txId).to.be.a("string");
    await this.generateToAddress();

    const { result, error } = await this.rpcClient.getTransactionReceipt(txId);
    expect(error).to.be.null;
    expect(result).to.be.a("array");
    expect(result[0].excepted).to.be.equal("None");
  }

  @test
  async approveRemoveOwner2() {
    const merchantWallet = new MerchantWallet(
      this.context,
      this.client,
      this.account.acc2,
      SafeAddress
    );
    const txId = await merchantWallet.approveTransaction(merchantTxHash);
    expect(txId).to.be.a("string");
    await this.generateToAddress();

    const { result, error } = await this.rpcClient.getTransactionReceipt(txId);
    expect(error).to.be.null;
    expect(result).to.be.a("array");
    expect(result[0].excepted).to.be.equal("None");
  }

  @test
  async executeRemoveOwner() {
    const merchantWallet = new MerchantWallet(
      this.context,
      this.client,
      this.account.acc1,
      SafeAddress
    );
    const addressApprover = [
      this.account.acc1.hex_address(),
      this.account.acc2.hex_address(),
    ];
    const ownerToRemove = this.account.acc3.hex_address();
    const threshold = 2;
    const removeOwnerTx = await merchantWallet.removeOwner(
      ownerToRemove,
      threshold
    );
    const txId = await merchantWallet.executeTransaction(
      removeOwnerTx,
      addressApprover
    );
    expect(txId).to.be.a("string");
    await this.generateToAddress();

    const { result, error } = await this.rpcClient.getTransactionReceipt(txId);
    expect(error).to.be.null;
    expect(result).to.be.a("array");
    expect(result[0].excepted).to.be.equal("None");
    expect(await merchantWallet.getOwners()).to.be.deep.equal([
      this.account.acc4.hex_address(),
      this.account.acc1.hex_address(),
      this.account.acc2.hex_address(),
    ]);
    expect(await merchantWallet.getThreshold()).to.be.equal(threshold);
  }
}
