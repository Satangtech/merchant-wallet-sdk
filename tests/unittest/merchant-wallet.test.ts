import { suite, test } from "@testdeck/mocha";
import { expect } from "chai";
import { Context, MnemonicAccount, PrivkeyAccount } from "firovm-sdk";
import { MerchantWallet, Testnet } from "../../lib";

@suite
class MerchantWalletTest {}
