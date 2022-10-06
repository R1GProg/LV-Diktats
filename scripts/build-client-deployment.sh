#!/bin/bash

SCRIPT_PATH=$(dirname $(readlink -f $0))
CLIENT_PATH="$(dirname $SCRIPT_PATH)/client"
DATETIME=$(date +"%Y-%m-%dT%H-%M")

bash "$SCRIPT_PATH/build-all-shared.sh"

cd $CLIENT_PATH
npm run build
tar -czvf build.tar.gz build
mv build.tar.gz "../diktify-client-$DATETIME.tar.gz"
rm -r build