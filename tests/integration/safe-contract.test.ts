import { suite, test } from "@testdeck/mocha";
import { expect } from "chai";
import {
  Client,
  Context,
  PrivkeyAccount,
  RPCClient,
  Transaction,
} from "firovm-sdk";
import { Testnet } from "../../lib";
import { abiERC20, SafeABI, SafeProxyFactoryABI } from "./data/abi";
import { testAddresses, testAddressMiner, testPrivkeys } from "./data/accounts";
import {
  byteCodeContractERC20,
  SafeByteCode,
  SafeProxyFactoryByteCode,
} from "./data/bytecode";
import {
  AddressOne,
  AddressZero,
  buildTransaction,
  buildSignatureBytes,
  getRandomIntAsString,
  safeApproveHash,
} from "./utils";

let SafeContractAddress: string;
let Erc20ContractAddress: string;

@suite
class SafeContractTest {
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
      testAddressMiner,
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

  async loadWallet() {
    const res = await this.rpcClient.rpc("loadwallet", ["testwallet"]);
  }

  async initSafeContract() {
    const contract = new this.client.Contract(SafeABI);
    const contractDeploy = contract.deploy(SafeByteCode);
    const txid = await contractDeploy.send({ from: this.account.acc1 });
    expect(txid).to.be.a("string");
    await this.generateToAddress();

    const { result, error } = await this.rpcClient.getTransactionReceipt(txid);
    expect(error).to.be.null;
    expect(result.length).to.be.greaterThan(0);
    expect(result[0].excepted).to.be.equal("None");
    expect(result[0].contractAddress).to.be.a("string");
    const singleton = result[0].contractAddress;

    // Deploy contract with out constructor
    const tx = new Transaction();
    const gasPrice = 40;
    const gas = await this.client.estimateFee("", SafeProxyFactoryByteCode);
    tx.call(SafeProxyFactoryByteCode, gasPrice, gas);
    const txidProxy = await this.client.buildAndSend(tx, [this.account.acc1], {
      feePerKb: 400000,
    });
    expect(txidProxy).to.be.a("string");
    await this.generateToAddress();
    const { result: resultProxy, error: errorProxy } =
      await this.rpcClient.getTransactionReceipt(txidProxy);
    expect(errorProxy).to.be.null;
    expect(resultProxy.length).to.be.greaterThan(0);
    expect(resultProxy[0].contractAddress).to.be.a("string");
    expect(resultProxy[0].excepted).to.be.equal("None");
    const safeProxyContractAddress = resultProxy[0].contractAddress;

    const contractProxy = new this.client.Contract(
      SafeProxyFactoryABI,
      safeProxyContractAddress
    );
    const txCreate = await contractProxy.methods
      .createProxyWithNonce(`0x${singleton}`, "0x", getRandomIntAsString())
      .send({
        from: this.account.acc1,
      });
    expect(txCreate).to.be.a("string");
    await this.generateToAddress();

    const { result: resultCreate, error: errorCreate } =
      await this.rpcClient.getTransactionReceipt(txCreate);
    expect(errorCreate).to.be.null;
    expect(resultCreate.length).to.be.greaterThan(0);
    expect(resultCreate[0].excepted).to.be.equal("None");
    SafeContractAddress = resultCreate[0].log[0].data.split(
      "000000000000000000000000"
    )[1];
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
    Erc20ContractAddress = response.result[0].contractAddress;
  }

  async before() {
    await this.generateToAddress();
  }

  @test
  async init() {
    await this.loadWallet();
    await this.sendToAddress(
      this.account.miner,
      this.address.testAddress1,
      10000 * 1e8
    );
    await this.sendToAddress(
      this.account.acc1,
      this.address.testAddress2,
      1000 * 1e8
    );
    await this.sendToAddress(
      this.account.acc1,
      this.address.testAddress3,
      1000 * 1e8
    );
    await this.sendToAddress(
      this.account.acc1,
      this.address.testAddress4,
      1000 * 1e8
    );
    await this.initSafeContract();
    await this.deployContractERC20();
  }

  @test
  async setup() {
    const contract = new this.client.Contract(SafeABI, SafeContractAddress);
    const tx = await contract.methods
      .setup(
        [
          this.account.acc1.hex_address(),
          this.account.acc2.hex_address(),
          this.account.acc3.hex_address(),
        ],
        2,
        AddressZero,
        "0x",
        AddressZero,
        AddressZero,
        0,
        AddressZero
      )
      .send({
        from: this.account.acc1,
      });
    expect(tx).to.be.a("string");
    await this.generateToAddress();
    const { result, error } = await this.rpcClient.getTransactionReceipt(tx);
    expect(error).to.be.null;
    expect(result.length).to.be.greaterThan(0);
    expect(result[0].excepted).to.be.equal("None");
  }

  @test
  async getOwners() {
    const contract = new this.client.Contract(SafeABI, SafeContractAddress);
    const owners = (await contract.methods.getOwners().call())["0"];
    expect(owners).to.be.a("array");
    expect(owners.length).to.be.equal(3);
    expect(owners).to.be.deep.equal([
      this.account.acc1.hex_address(),
      this.account.acc2.hex_address(),
      this.account.acc3.hex_address(),
    ]);
  }

  @test
  async getThreshold() {
    const contract = new this.client.Contract(SafeABI, SafeContractAddress);
    const threshold = (await contract.methods.getThreshold().call())["0"];
    expect(threshold).to.be.equal("2");
  }

  async safeNonce() {
    const contract = new this.client.Contract(SafeABI, SafeContractAddress);
    return Number((await contract.methods.nonce().call())["0"]);
  }

  @test
  async getNonce() {
    const nonce = await this.safeNonce();
    expect(nonce).to.be.equal(0);
  }

  @test
  async depositToSafe() {
    const contract = new this.client.Contract(SafeABI, SafeContractAddress);
    await contract.methods.deposit().send({
      from: this.account.acc1,
      value: 10000,
    });
    await this.generateToAddress();
    const { result, error } = await this.rpcClient.rpc("getaccountinfo", [
      SafeContractAddress,
    ]);
    expect(error).to.be.null;
    expect(result.balance).to.be.equal(10000);
  }

  async getTransactionHash(safeTx: {
    to: string;
    value: string | number;
    data: string;
    operation: number;
    safeTxGas: string | number;
    baseGas: string | number;
    gasPrice: string | number;
    gasToken: string;
    refundReceiver: string;
    nonce: number;
  }) {
    const contract = new this.client.Contract(SafeABI, SafeContractAddress);
    return (
      await contract.methods
        .getTransactionHash(
          safeTx.to,
          safeTx.value,
          safeTx.data,
          safeTx.operation,
          safeTx.safeTxGas,
          safeTx.baseGas,
          safeTx.gasPrice,
          safeTx.gasToken,
          safeTx.refundReceiver,
          safeTx.nonce
        )
        .call()
    )["0"];
  }

  @test
  async execTransaction() {
    const safeTx = buildTransaction({
      to: this.account.acc5.hex_address(),
      value: 1000,
      nonce: await this.safeNonce(),
    });

    const signatures = [
      safeApproveHash(this.account.acc1.hex_address()),
      safeApproveHash(this.account.acc2.hex_address()),
    ];
    const signatureBytes = buildSignatureBytes(signatures);
    const contract = new this.client.Contract(SafeABI, SafeContractAddress);

    const tx = await contract.methods
      .execTransaction(
        safeTx.to,
        safeTx.value,
        safeTx.data,
        safeTx.operation,
        safeTx.safeTxGas,
        safeTx.baseGas,
        safeTx.gasPrice,
        safeTx.gasToken,
        safeTx.refundReceiver,
        signatureBytes
      )
      .send({
        from: this.account.acc1,
      });
    expect(tx).to.be.a("string");
    await this.generateToAddress();
    const { result, error } = await this.rpcClient.getTransactionReceipt(tx);
    expect(error).to.be.null;
    expect(result.length).to.be.greaterThan(0);
    expect(result[0].excepted).to.be.equal("Revert");
    expect(result[0].exceptedMessage).to.be.equal("GS025");

    const txHash = await this.getTransactionHash(safeTx);

    const txApproveHash1 = await contract.methods.approveHash(txHash).send({
      from: this.account.acc1,
    });
    expect(txApproveHash1).to.be.a("string");
    await this.generateToAddress();
    const { result: resultApproveHash1, error: errorApproveHash1 } =
      await this.rpcClient.getTransactionReceipt(txApproveHash1);
    expect(errorApproveHash1).to.be.null;
    expect(resultApproveHash1.length).to.be.greaterThan(0);
    expect(resultApproveHash1[0].excepted).to.be.equal("None");

    const txApproveHash2 = await contract.methods.approveHash(txHash).send({
      from: this.account.acc2,
    });
    expect(txApproveHash2).to.be.a("string");
    await this.generateToAddress();
    const { result: resultApproveHash2, error: errorApproveHash2 } =
      await this.rpcClient.getTransactionReceipt(txApproveHash2);
    expect(errorApproveHash2).to.be.null;
    expect(resultApproveHash2.length).to.be.greaterThan(0);
    expect(resultApproveHash2[0].excepted).to.be.equal("None");

    const tx1 = await contract.methods
      .execTransaction(
        safeTx.to,
        safeTx.value,
        safeTx.data,
        safeTx.operation,
        safeTx.safeTxGas,
        safeTx.baseGas,
        safeTx.gasPrice,
        safeTx.gasToken,
        safeTx.refundReceiver,
        signatureBytes
      )
      .send({
        from: this.account.acc1,
      });
    expect(tx1).to.be.a("string");
    await this.generateToAddress();
    const { result: result1, error: error1 } =
      await this.rpcClient.getTransactionReceipt(tx1);
    expect(error1).to.be.null;
    expect(result1.length).to.be.greaterThan(0);
    expect(result1[0].excepted).to.be.equal("None");
  }

  @test
  async getAccountInfo() {
    const { result, error } = await this.rpcClient.rpc("getaccountinfo", [
      SafeContractAddress,
    ]);
    expect(error).to.be.null;
    expect(result.balance).to.be.equal(9000);

    const balance = await this.client.getBalance(
      this.account.acc5.address().toString()
    );
    expect(balance).to.be.equal(1000);
  }

  @test
  async sendTokenToSafe() {
    const contract = new this.client.Contract(abiERC20, Erc20ContractAddress);
    const txid = await contract.methods
      .transfer(
        `0x${SafeContractAddress}`,
        (BigInt(10) * BigInt(1e18)).toString()
      )
      .send({
        from: this.account.acc1,
      });
    expect(txid).to.be.a("string");
    await this.generateToAddress();

    const { result, error } = await this.rpcClient.getTransactionReceipt(txid);
    expect(error).to.be.null;
    expect(result.length).to.be.greaterThan(0);
    expect(result[0].excepted).to.be.equal("None");

    const res = (
      await contract.methods.balanceOf(`0x${SafeContractAddress}`).call()
    )["0"];
    expect(res).to.be.equal((BigInt(10) * BigInt(1e18)).toString());
  }

  @test
  async sendTokenFromSafe() {
    const contractERC20 = new this.client.Contract(
      abiERC20,
      Erc20ContractAddress
    );
    const data = contractERC20.methods
      .transfer(
        this.account.acc5.hex_address(),
        (BigInt(1) * BigInt(1e18)).toString()
      )
      .encodeABI();

    const safeTx = buildTransaction({
      to: `0x${Erc20ContractAddress}`,
      data,
      nonce: await this.safeNonce(),
    });
    const signatures = [
      safeApproveHash(this.account.acc1.hex_address()),
      safeApproveHash(this.account.acc2.hex_address()),
    ];
    const signatureBytes = buildSignatureBytes(signatures);

    const txHash = await this.getTransactionHash(safeTx);
    const contractSafe = new this.client.Contract(SafeABI, SafeContractAddress);

    const txApproveHash1 = await contractSafe.methods.approveHash(txHash).send({
      from: this.account.acc1,
    });
    expect(txApproveHash1).to.be.a("string");
    await this.generateToAddress();
    const { result: resultApproveHash1, error: errorApproveHash1 } =
      await this.rpcClient.getTransactionReceipt(txApproveHash1);
    expect(errorApproveHash1).to.be.null;
    expect(resultApproveHash1.length).to.be.greaterThan(0);
    expect(resultApproveHash1[0].excepted).to.be.equal("None");

    const txApproveHash2 = await contractSafe.methods.approveHash(txHash).send({
      from: this.account.acc2,
    });
    expect(txApproveHash2).to.be.a("string");
    await this.generateToAddress();
    const { result: resultApproveHash2, error: errorApproveHash2 } =
      await this.rpcClient.getTransactionReceipt(txApproveHash2);
    expect(errorApproveHash2).to.be.null;
    expect(resultApproveHash2.length).to.be.greaterThan(0);
    expect(resultApproveHash2[0].excepted).to.be.equal("None");

    const tx = await contractSafe.methods
      .execTransaction(
        safeTx.to,
        safeTx.value,
        safeTx.data,
        safeTx.operation,
        safeTx.safeTxGas,
        safeTx.baseGas,
        safeTx.gasPrice,
        safeTx.gasToken,
        safeTx.refundReceiver,
        signatureBytes
      )
      .send({
        from: this.account.acc1,
      });
    expect(tx).to.be.a("string");
    await this.generateToAddress();
    const { result, error } = await this.rpcClient.getTransactionReceipt(tx);
    expect(error).to.be.null;
    expect(result.length).to.be.greaterThan(0);
    expect(result[0].excepted).to.be.equal("None");

    expect(
      (
        await contractERC20.methods.balanceOf(`0x${SafeContractAddress}`).call()
      )["0"]
    ).to.be.equal((BigInt(9) * BigInt(1e18)).toString());

    expect(
      (
        await contractERC20.methods
          .balanceOf(this.account.acc5.hex_address())
          .call()
      )["0"]
    ).to.be.equal((BigInt(1) * BigInt(1e18)).toString());
  }

  @test
  async changeThreshold() {
    const contractSafe = new this.client.Contract(SafeABI, SafeContractAddress);
    const data = contractSafe.methods.changeThreshold(3).encodeABI();

    const safeTx = buildTransaction({
      to: `0x${SafeContractAddress}`,
      data,
      nonce: await this.safeNonce(),
    });
    const signatures = [
      safeApproveHash(this.account.acc1.hex_address()),
      safeApproveHash(this.account.acc2.hex_address()),
    ];
    const signatureBytes = buildSignatureBytes(signatures);

    const txHash = await this.getTransactionHash(safeTx);

    const txApproveHash1 = await contractSafe.methods.approveHash(txHash).send({
      from: this.account.acc1,
    });
    expect(txApproveHash1).to.be.a("string");
    await this.generateToAddress();
    const { result: resultApproveHash1, error: errorApproveHash1 } =
      await this.rpcClient.getTransactionReceipt(txApproveHash1);
    expect(errorApproveHash1).to.be.null;
    expect(resultApproveHash1.length).to.be.greaterThan(0);
    expect(resultApproveHash1[0].excepted).to.be.equal("None");

    const txApproveHash2 = await contractSafe.methods.approveHash(txHash).send({
      from: this.account.acc2,
    });
    expect(txApproveHash2).to.be.a("string");
    await this.generateToAddress();
    const { result: resultApproveHash2, error: errorApproveHash2 } =
      await this.rpcClient.getTransactionReceipt(txApproveHash2);
    expect(errorApproveHash2).to.be.null;
    expect(resultApproveHash2.length).to.be.greaterThan(0);
    expect(resultApproveHash2[0].excepted).to.be.equal("None");

    const tx = await contractSafe.methods
      .execTransaction(
        safeTx.to,
        safeTx.value,
        safeTx.data,
        safeTx.operation,
        safeTx.safeTxGas,
        safeTx.baseGas,
        safeTx.gasPrice,
        safeTx.gasToken,
        safeTx.refundReceiver,
        signatureBytes
      )
      .send({
        from: this.account.acc1,
      });
    expect(tx).to.be.a("string");
    await this.generateToAddress();
    const { result, error } = await this.rpcClient.getTransactionReceipt(tx);
    expect(error).to.be.null;
    expect(result.length).to.be.greaterThan(0);
    expect(result[0].excepted).to.be.equal("None");

    expect((await contractSafe.methods.getThreshold().call())["0"]).to.be.equal(
      "3"
    );
  }

  @test
  async addOwnerWithThreshold() {
    const contractSafe = new this.client.Contract(SafeABI, SafeContractAddress);
    const data = contractSafe.methods
      .addOwnerWithThreshold(this.account.acc4.hex_address(), 3)
      .encodeABI();

    const safeTx = buildTransaction({
      to: `0x${SafeContractAddress}`,
      data,
      nonce: await this.safeNonce(),
    });
    const signatures = [
      safeApproveHash(this.account.acc1.hex_address()),
      safeApproveHash(this.account.acc2.hex_address()),
      safeApproveHash(this.account.acc3.hex_address()),
    ];
    const signatureBytes = buildSignatureBytes(signatures);

    const txHash = await this.getTransactionHash(safeTx);

    const txApproveHash1 = await contractSafe.methods.approveHash(txHash).send({
      from: this.account.acc1,
    });
    expect(txApproveHash1).to.be.a("string");
    await this.generateToAddress();
    const { result: resultApproveHash1, error: errorApproveHash1 } =
      await this.rpcClient.getTransactionReceipt(txApproveHash1);
    expect(errorApproveHash1).to.be.null;
    expect(resultApproveHash1.length).to.be.greaterThan(0);
    expect(resultApproveHash1[0].excepted).to.be.equal("None");

    const txApproveHash2 = await contractSafe.methods.approveHash(txHash).send({
      from: this.account.acc2,
    });
    expect(txApproveHash2).to.be.a("string");
    await this.generateToAddress();
    const { result: resultApproveHash2, error: errorApproveHash2 } =
      await this.rpcClient.getTransactionReceipt(txApproveHash2);
    expect(errorApproveHash2).to.be.null;
    expect(resultApproveHash2.length).to.be.greaterThan(0);
    expect(resultApproveHash2[0].excepted).to.be.equal("None");

    const txApproveHash3 = await contractSafe.methods.approveHash(txHash).send({
      from: this.account.acc3,
    });
    expect(txApproveHash3).to.be.a("string");
    await this.generateToAddress();
    const { result: resultApproveHash3, error: errorApproveHash3 } =
      await this.rpcClient.getTransactionReceipt(txApproveHash3);
    expect(errorApproveHash3).to.be.null;
    expect(resultApproveHash3.length).to.be.greaterThan(0);
    expect(resultApproveHash3[0].excepted).to.be.equal("None");

    const tx = await contractSafe.methods
      .execTransaction(
        safeTx.to,
        safeTx.value,
        safeTx.data,
        safeTx.operation,
        safeTx.safeTxGas,
        safeTx.baseGas,
        safeTx.gasPrice,
        safeTx.gasToken,
        safeTx.refundReceiver,
        signatureBytes
      )
      .send({
        from: this.account.acc1,
      });
    expect(tx).to.be.a("string");
    await this.generateToAddress();
    const { result, error } = await this.rpcClient.getTransactionReceipt(tx);
    expect(error).to.be.null;
    expect(result.length).to.be.greaterThan(0);
    expect(result[0].excepted).to.be.equal("None");

    expect((await contractSafe.methods.getThreshold().call())["0"]).to.be.equal(
      "3"
    );

    const owners = (await contractSafe.methods.getOwners().call())["0"];
    expect(owners).to.be.a("array");
    expect(owners.length).to.be.equal(4);
    expect(owners).to.be.deep.equal([
      this.account.acc4.hex_address(),
      this.account.acc1.hex_address(),
      this.account.acc2.hex_address(),
      this.account.acc3.hex_address(),
    ]);
  }

  async getPrevOwner(owner: string) {
    const contractSafe = new this.client.Contract(SafeABI, SafeContractAddress);
    const owners = (await contractSafe.methods.getOwners().call())["0"];
    for (let i = 0; i < owners.length; i++) {
      if (i === 0 && owners[i] === owner) {
        return AddressOne;
      }
      if (owners[i] === owner) {
        return owners[i - 1];
      }
    }
  }

  @test
  async removeOwner() {
    const contractSafe = new this.client.Contract(SafeABI, SafeContractAddress);
    const owner = this.account.acc3.hex_address();
    const prevOwner = await this.getPrevOwner(owner);
    const data = contractSafe.methods
      .removeOwner(prevOwner, owner, 2)
      .encodeABI();

    const safeTx = buildTransaction({
      to: `0x${SafeContractAddress}`,
      data,
      nonce: await this.safeNonce(),
    });
    const signatures = [
      safeApproveHash(this.account.acc1.hex_address()),
      safeApproveHash(this.account.acc2.hex_address()),
      safeApproveHash(this.account.acc4.hex_address()),
    ];
    const signatureBytes = buildSignatureBytes(signatures);

    const txHash = await this.getTransactionHash(safeTx);

    const txApproveHash1 = await contractSafe.methods.approveHash(txHash).send({
      from: this.account.acc1,
    });
    expect(txApproveHash1).to.be.a("string");
    await this.generateToAddress();
    const { result: resultApproveHash1, error: errorApproveHash1 } =
      await this.rpcClient.getTransactionReceipt(txApproveHash1);
    expect(errorApproveHash1).to.be.null;
    expect(resultApproveHash1.length).to.be.greaterThan(0);
    expect(resultApproveHash1[0].excepted).to.be.equal("None");

    const txApproveHash2 = await contractSafe.methods.approveHash(txHash).send({
      from: this.account.acc2,
    });
    expect(txApproveHash2).to.be.a("string");
    await this.generateToAddress();
    const { result: resultApproveHash2, error: errorApproveHash2 } =
      await this.rpcClient.getTransactionReceipt(txApproveHash2);
    expect(errorApproveHash2).to.be.null;
    expect(resultApproveHash2.length).to.be.greaterThan(0);
    expect(resultApproveHash2[0].excepted).to.be.equal("None");

    const txApproveHash4 = await contractSafe.methods.approveHash(txHash).send({
      from: this.account.acc4,
    });
    expect(txApproveHash4).to.be.a("string");
    await this.generateToAddress();
    const { result: resultApproveHash4, error: errorApproveHash4 } =
      await this.rpcClient.getTransactionReceipt(txApproveHash4);
    expect(errorApproveHash4).to.be.null;
    expect(resultApproveHash4.length).to.be.greaterThan(0);
    expect(resultApproveHash4[0].excepted).to.be.equal("None");

    const tx = await contractSafe.methods
      .execTransaction(
        safeTx.to,
        safeTx.value,
        safeTx.data,
        safeTx.operation,
        safeTx.safeTxGas,
        safeTx.baseGas,
        safeTx.gasPrice,
        safeTx.gasToken,
        safeTx.refundReceiver,
        signatureBytes
      )
      .send({
        from: this.account.acc1,
      });
    expect(tx).to.be.a("string");
    await this.generateToAddress();
    const { result, error } = await this.rpcClient.getTransactionReceipt(tx);
    expect(error).to.be.null;
    expect(result.length).to.be.greaterThan(0);
    expect(result[0].excepted).to.be.equal("None");

    expect((await contractSafe.methods.getThreshold().call())["0"]).to.be.equal(
      "2"
    );

    const owners = (await contractSafe.methods.getOwners().call())["0"];
    expect(owners).to.be.a("array");
    expect(owners.length).to.be.equal(3);
    expect(owners).to.be.deep.equal([
      this.account.acc4.hex_address(),
      this.account.acc1.hex_address(),
      this.account.acc2.hex_address(),
    ]);
  }
}
