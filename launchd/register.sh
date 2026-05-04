#!/bin/bash

echo "Registering Cortex services with macOS..."

PLIST_DIR="$HOME/cortex/launchd"
LAUNCH_DIR="$HOME/Library/LaunchAgents"
LOG_DIR="$HOME/cortex/logs"

mkdir -p $LOG_DIR

cp $PLIST_DIR/com.cortex.backend.plist $LAUNCH_DIR/
cp $PLIST_DIR/com.cortex.nightly.plist $LAUNCH_DIR/
cp $PLIST_DIR/com.cortex.updater.plist $LAUNCH_DIR/

launchctl load $LAUNCH_DIR/com.cortex.backend.plist
launchctl load $LAUNCH_DIR/com.cortex.nightly.plist
launchctl load $LAUNCH_DIR/com.cortex.updater.plist

echo "Done. Cortex will now:"
echo "  - Start automatically when this Mac boots"
echo "  - Pull updates from GitHub at 1:30am"
echo "  - Run the nightly digest at 2:00am"
