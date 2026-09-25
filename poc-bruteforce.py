#!/usr/bin/env python3
import sys
import os
import subprocess

script_path = os.path.join(os.path.dirname(__file__), "scripts", "poc-bruteforce.py")
sys.exit(subprocess.call([sys.executable, script_path] + sys.argv[1:]))
