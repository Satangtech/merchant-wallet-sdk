#!/bin/bash
git clone --branch d98e2 https://github.com/satang-tech/firovm-tar.git
mv firovm-tar/d98e284274c1e95bb36ed61d1566214b7148f698.tar firovm.tar
rm -rf firovm-tar

checksum=$(sha256sum firovm.tar | cut -d' ' -f1)
if [ "$checksum" != "a36b26c4f3af3485149741062318afddd6e3c103d62d467b5ac2edffd14077f4" ]; then
    echo "Checksum mismatch"
    exit 1
fi
