import { suite, test } from "@testdeck/mocha";
import { expect } from "chai";
import { Factory, MerchantWallet } from "../../lib";
import { abiERC20, AbiERC721 } from "./data/abi";
import { IntegrationTest } from "./integration.test";

let SingletonAddress: string;
let ProxyAddress: string;
let SafeAddress: string;
let Erc20Address: string;
let Erc721Address: string;
let Erc1155Address: string;
let merchantTxHash: string;

@suite
class MerchantWalletTest extends IntegrationTest {
  constructor() {
    super();
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
    Erc20Address = await this.deployContractERC20();
    Erc721Address = await this.deployContractERC721();
    Erc1155Address = await this.deployContractERC1155();
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
  async mintERC721() {
    const erc721 = new this.client.Contract(AbiERC721, Erc721Address);
    const txid = await erc721.methods
      .mint(this.account.miner.hex_address(), 0)
      .send({ from: this.account.miner });
    expect(txid).to.be.a("string");
    await this.generateToAddress();

    const { result, error } = await this.rpcClient.getTransactionReceipt(txid);
    expect(error).to.be.null;
    expect(result.length).to.be.greaterThan(0);
    expect(result[0].excepted).to.be.equal("None");
  }

  @test
  async transferERC721toMerchant() {
    const erc721 = new this.client.Contract(AbiERC721, Erc721Address);
    const txid = await erc721.methods
      .transferFrom(this.account.miner.hex_address(), SafeAddress, 0)
      .send({ from: this.account.miner });
    expect(txid).to.be.a("string");
    await this.generateToAddress();

    const { result, error } = await this.rpcClient.getTransactionReceipt(txid);
    expect(error).to.be.null;
    expect(result.length).to.be.greaterThan(0);
    expect(result[0].excepted).to.be.equal("None");
  }

  @test
  async getBalanceERC721() {
    const merchantWallet = new MerchantWallet(
      this.context,
      this.client,
      this.account.acc1,
      SafeAddress
    );
    const balance = await merchantWallet.balanceOfERC721(Erc721Address);
    expect(balance).to.be.a("number");
    expect(balance).to.be.equal(1);
  }

  @test
  async createTransactionTransferERC721() {
    const merchantWallet = new MerchantWallet(
      this.context,
      this.client,
      this.account.acc1,
      SafeAddress
    );
    const merchantTx = await merchantWallet.transferFromERC721(
      Erc721Address,
      SafeAddress,
      this.account.acc5.hex_address(),
      0
    );
    merchantTxHash = await merchantWallet.getTransactionHash(merchantTx);
    expect(merchantTxHash).to.be.a("string");
  }

  @test
  async approveTransaction1TransferERC721() {
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
  async approveTransaction2TransferERC721() {
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
  async executeTransactionTransferERC721() {
    const merchantWallet = new MerchantWallet(
      this.context,
      this.client,
      this.account.acc1,
      SafeAddress
    );
    const merchantTx = await merchantWallet.transferFromERC721(
      Erc721Address,
      SafeAddress,
      this.account.acc5.hex_address(),
      0
    );
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

    const erc721 = new this.client.Contract(AbiERC721, Erc721Address);
    const owner = (await erc721.methods.ownerOf(0).call())["0"];
    expect(owner).to.be.equal(this.account.acc5.hex_address());

    const balance = await merchantWallet.balanceOfERC721(Erc721Address);
    expect(balance).to.be.a("number");
    expect(balance).to.be.equal(0);
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
