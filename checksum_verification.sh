#!/bin/bash
curl -L -o firovm.tar "https://drive.google.com/uc?export=download&id=1RDzTIico7RsI7y5eQT52VInoCuLvjjq0"

# Set the expected checksum value
expected_sha256sum="bc0112ddcf2573fb770b0784c133ce513ae2725a5f4ba2a49296af7bb26606ce"

# Compute the actual checksum of the file
actual_sha256sum=$(sha256sum firovm.tar | awk '{print $1}')

if [ "$actual_sha256sum" != "$expected_sha256sum" ]; then
    echo "Error: checksums do not match!"
    exit 1
fi

echo "Checksums Match!"
