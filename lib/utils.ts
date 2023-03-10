import { MnemonicAccount, PrivkeyAccount } from "firovm-sdk";
// @ts-ignore
import { Address, Networks } from "fvmcore-lib";
import crypto from "crypto";

export interface TxOptions {
  gasPrice?: number;
  gas?: number;
  value?: number;
  input?: string;
}

export const randomInt256 = (): BigInt => {
  const randomBytes = crypto.randomBytes(32);
  const hexString = randomBytes.toString("hex");
  return BigInt("0x" + hexString);
};

export const getRandomIntAsString = (): string => {
  return randomInt256().toString();
};

export const fromHexAddress = (
  hexAddress: string,
  network = "testnet"
): string => {
  return Address.fromPublicKeyHash(
    Buffer.from(hexAddress.replace("0x", ""), "hex"),
    Networks.get(network)
  ).toString();
};

export const AddressZero = "0x0000000000000000000000000000000000000000";
export const AddressOne = "0x0000000000000000000000000000000000000001";

export interface Signature {
  signer: string;
  data: string;
  // a flag to indicate if the signature is a contract signature and the data has to be appended to the dynamic part of signature bytes
  dynamic?: true;
}

export const buildSignatureBytes = (signatures: Signature[]): string => {
  const SIGNATURE_LENGTH_BYTES = 65;
  signatures.sort((left, right) =>
    left.signer.toLowerCase().localeCompare(right.signer.toLowerCase())
  );

  let signatureBytes = "0x";
  let dynamicBytes = "";
  for (const sig of signatures) {
    if (sig.dynamic) {
      /* 
              A contract signature has a static part of 65 bytes and the dynamic part that needs to be appended at the end of 
              end signature bytes.
              The signature format is
              Signature type == 0
              Constant part: 65 bytes
              {32-bytes signature verifier}{32-bytes dynamic data position}{1-byte signature type}
              Dynamic part (solidity bytes): 32 bytes + signature data length
              {32-bytes signature length}{bytes signature data}
          */
      const dynamicPartPosition = (
        signatures.length * SIGNATURE_LENGTH_BYTES +
        dynamicBytes.length / 2
      )
        .toString(16)
        .padStart(64, "0");
      const dynamicPartLength = (sig.data.slice(2).length / 2)
        .toString(16)
        .padStart(64, "0");
      const staticSignature = `${sig.signer
        .slice(2)
        .padStart(64, "0")}${dynamicPartPosition}00`;
      const dynamicPartWithLength = `${dynamicPartLength}${sig.data.slice(2)}`;

      signatureBytes += staticSignature;
      dynamicBytes += dynamicPartWithLength;
    } else {
      signatureBytes += sig.data.slice(2);
    }
  }

  return signatureBytes + dynamicBytes;
};

export interface MerchantTransaction {
  to: string;
  value?: number | string;
  data?: string;
  operation?: number;
  safeTxGas?: number | string;
  baseGas?: number | string;
  gasPrice?: number | string;
  gasToken?: string;
  refundReceiver?: string;
  nonce: number;
}

export const buildTransaction = (template: MerchantTransaction) => {
  return {
    to: template.to,
    value: template.value || 0,
    data: template.data || "0x",
    operation: template.operation || 0,
    safeTxGas: template.safeTxGas || 0,
    baseGas: template.baseGas || 0,
    gasPrice: template.gasPrice || 0,
    gasToken: template.gasToken || AddressZero,
    refundReceiver: template.refundReceiver || AddressZero,
    nonce: template.nonce,
  };
};

export const approveHash = (signerAddress: string) => {
  return {
    signer: signerAddress,
    data:
      "0x000000000000000000000000" +
      signerAddress.slice(2) +
      "0000000000000000000000000000000000000000000000000000000000000000" +
      "01",
  };
};
