#!/bin/sh

SCRIPT_PATH=$(dirname $(readlink -f $0))
ROOT_DIR=$(dirname $SCRIPT_PATH)
HOOKS_DIR="$ROOT_DIR/.git/hooks"

ln -s "$SCRIPT_PATH/post-merge-hook.sh" "$HOOKS_DIR/post-merge"