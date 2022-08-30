#!/bin/bash

SCRIPT_PATH=$(dirname $(readlink -f $0))
SHARED_PATH="$(dirname $SCRIPT_PATH)/shared"

for dir in $SHARED_PATH/* ; do
	echo "--- Building $dir"
	cd $dir
	npm i
	npm run build
done