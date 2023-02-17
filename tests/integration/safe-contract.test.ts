import { suite, test } from "@testdeck/mocha";
import { expect } from "chai";
import {
  Client,
  Context,
  Method,
  PrivkeyAccount,
  RPCClient,
  Transaction,
} from "firovm-sdk";
import { MerchantWallet, Testnet } from "../../lib";
import {
  SafeABI,
  SafeByteCode,
  SafeProxyFactoryABI,
  SafeProxyFactoryByteCode,
  testAddresses,
  testPrivkeys,
} from "./data";
import {
  AddressZero,
  buildSafeTransaction,
  buildSignatureBytes,
  fromHexAddress,
  getRandomIntAsString,
  safeApproveHash,
} from "./utils";

let safeContractAddress: string;

@suite
class SafeContractTest {
  constructor(
    private mnemonic: string,
    private rpcUrl: URL,
    private wallet: MerchantWallet,
    private rpcClient: RPCClient,
    private client: Client,
    private address: {
      testAddress1: string;
      testAddress2: string;
      testAddress3: string;
      testAddress4: string;
      testAddress5: string;
    },
    private privkey: {
      testPrivkey1: string;
      testPrivkey2: string;
      testPrivkey3: string;
      testPrivkey4: string;
      testPrivkey5: string;
    },
    private context: Context,
    private account: {
      acc1: PrivkeyAccount;
      acc2: PrivkeyAccount;
      acc3: PrivkeyAccount;
      acc4: PrivkeyAccount;
      acc5: PrivkeyAccount;
    }
  ) {
    this.mnemonic =
      "sand home split purity total soap solar predict talent enroll nut unable";
    this.rpcUrl = new URL("http://test:test@firovm:1234");
    this.rpcClient = new RPCClient(this.rpcUrl.href);
    this.client = new Client(this.rpcUrl.href);
    this.address = testAddresses;
    this.privkey = testPrivkeys;
    this.context = new Context().withNetwork(Testnet);
    this.account = {
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
      this.address.testAddress1,
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
    safeContractAddress = resultCreate[0].log[0].data.split(
      "000000000000000000000000"
    )[1];
  }

  @test
  async init() {
    await this.loadWallet();
    await this.initSafeContract();
    await this.sendToAddress(
      this.account.acc1,
      this.address.testAddress2,
      10000 * 1e8
    );
  }

  @test
  async setup() {
    const contract = new this.client.Contract(SafeABI, safeContractAddress);
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
    const contract = new this.client.Contract(SafeABI, safeContractAddress);
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
    const contract = new this.client.Contract(SafeABI, safeContractAddress);
    const threshold = (await contract.methods.getThreshold().call())["0"];
    expect(threshold).to.be.equal("2");
  }

  async safeNonce() {
    const contract = new this.client.Contract(SafeABI, safeContractAddress);
    return Number((await contract.methods.nonce().call())["0"]);
  }

  @test
  async getNonce() {
    const nonce = await this.safeNonce();
    expect(nonce).to.be.equal(0);
  }

  @test
  async depositToSafe() {
    // const nativeAddress = fromHexAddress(safeContractAddress);
    // const balanceBefore = await this.client.getBalance(nativeAddress);
    // expect(balanceBefore).to.be.equal(0);

    // await this.sendToAddress(this.account.acc1, nativeAddress, 10000);
    // const balanceAfter = await this.client.getBalance(nativeAddress);
    // expect(balanceAfter).to.be.equal(10000);
    const contract = new this.client.Contract(SafeABI, safeContractAddress);
    await contract.methods.deposit().send({
      from: this.account.acc1,
      value: 10000,
    });
    await this.generateToAddress();
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
    const contract = new this.client.Contract(SafeABI, safeContractAddress);
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
    const safeTx = buildSafeTransaction({
      to: this.account.acc4.hex_address(),
      value: 1000,
      operation: 0,
      // gasPrice: 1,
      safeTxGas: 1000000,
      refundReceiver: this.account.acc1.hex_address(),
      nonce: await this.safeNonce(),
    });

    const signatures = [
      safeApproveHash(this.account.acc1.hex_address()),
      safeApproveHash(this.account.acc2.hex_address()),
    ];
    const signatureBytes = buildSignatureBytes(signatures);
    const contract = new this.client.Contract(SafeABI, safeContractAddress);
    // const callData = await contract.methods
    //   .execTransaction(
    //     safeTx.to,
    //     safeTx.value,
    //     safeTx.data,
    //     safeTx.operation,
    //     safeTx.safeTxGas,
    //     safeTx.baseGas,
    //     safeTx.gasPrice,
    //     safeTx.gasToken,
    //     safeTx.refundReceiver,
    //     signatureBytes
    //   )
    //   .encodeABI();
    // const gasLimit = await this.client.estimateFee(
    //   safeContractAddress,
    //   callData,
    //   this.address.testAddress1
    // );

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
      from: this.account.acc2,
    });
    expect(txApproveHash1).to.be.a("string");
    await this.generateToAddress();
    const { result: resultApproveHash1, error: errorApproveHash1 } =
      await this.rpcClient.getTransactionReceipt(txApproveHash1);
    expect(errorApproveHash1).to.be.null;
    expect(resultApproveHash1.length).to.be.greaterThan(0);
    expect(resultApproveHash1[0].excepted).to.be.equal("None");

    const txApproveHash2 = await contract.methods.approveHash(txHash).send({
      from: this.account.acc1,
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
}
