#!/bin/bash
set -e
npx expo prebuild --platform android
python3 scripts/fix-gradle.py
