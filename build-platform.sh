#!/bin/bash

if command -v explorer.exe ; then
    echo "Building for windows..."
    PLATFORM="win"
    PLATFORM_DIR="dist/$PLATFORM"
    BUN_TARGET="bun-windows-x64-modern"
else
    echo "Building for linux..."
    PLATFORM="linux"
    PLATFORM_DIR="dist/$PLATFORM"
    BUN_TARGET="bun-linux-x64-modern"
fi

if [ -z "node_modules/raylib/build/Release/node-raylib.node" ] ; then
    echo "Building node-raylib"

    #rebuild pkg tree
    rm -rf node_modules/
    bun i

    if ! command -v cmake ; then
        echo "cmake not installed"
        exit 0
    fi

    #build node-raylib.node
    cd node_modules/raylib && npm run compile
else
    echo "node-raylib.node exists. reusing..."
fi

#"""build""" game install folder
rm -rf $PLATFORM_DIR
mkdir -p $PLATFORM_DIR
mkdir $PLATFORM_DIR/assets

#compile
bun build --compile src/entry.js \
    --target=$BUN_TARGET \
    --outfile $PLATFORM_DIR/game \
    --minify \
    --sourcemap \
    --bytecode 

#copy assets
cp -r assets $PLATFORM_DIR

if [ "$1" == "run" ] ; then
    if [ "$PLATFORM" == "win" ] ; then
        cd $PLATFORM_DIR && ./game.exe
    else
        cd $PLATFORM_DIR && ./game
    fi
fi