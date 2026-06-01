#!/usr/bin/env python3
"""
MyRandWise Master Fix Script
Runs all 3 fix scripts in sequence

Usage:
    python fix_all.py path/to/app.html path/to/sw.js path/to/admin_dashboard.html

Or just:
    python fix_all.py
    (will look for files in current directory)
"""

import os, sys, subprocess

def run_fix(script_name, target_file):
    script_path = os.path.join(os.path.dirname(__file__), script_name)
    if not os.path.exists(script_path):
        print(f"❌ {script_name} not found in same folder")
        return False
    if not os.path.exists(target_file):
        print(f"❌ {target_file} not found")
        return False

    print(f"\n🔧 Running {script_name} on {target_file}...")
    result = subprocess.run([sys.executable, script_path, target_file], capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
    return True

print("="*60)
print("  MyRandWise Master Fix — All Bugs")
print("="*60)

# Determine file paths
app = sys.argv[1] if len(sys.argv) > 1 else "app.html"
sw = sys.argv[2] if len(sys.argv) > 2 else "sw.js"
admin = sys.argv[3] if len(sys.argv) > 3 else "admin_dashboard.html"

print(f"\nTarget files:")
print(f"  app.html:           {app} {'✅' if os.path.exists(app) else '❌ NOT FOUND'}")
print(f"  sw.js:              {sw} {'✅' if os.path.exists(sw) else '❌ NOT FOUND'}")
print(f"  admin_dashboard:    {admin} {'✅' if os.path.exists(admin) else '❌ NOT FOUND'}")

if not os.path.exists(app):
    print("\n❌ app.html not found. Please provide the correct path:")
    print("   python fix_all.py C:/Users/.../app.html C:/Users/.../sw.js C:/Users/.../admin_dashboard.html")
    sys.exit(1)

# Run fixes
run_fix("fix_randwise.py", app)
if os.path.exists(sw):
    run_fix("fix_sw.py", sw)
if os.path.exists(admin):
    run_fix("fix_admin.py", admin)

print("\n" + "="*60)
print("  ALL FIXES COMPLETE")
print("="*60)
print("\nNext steps:")
print("  1. Test app_fixed.html in Chrome (F12 → Console → SmokeTest.runAll())")
print("  2. Test sw_fixed.js by checking CACHE = 'rw-v155'")
print("  3. Test admin_dashboard_fixed.html scrolling")
print("  4. Rename _fixed files to original names")
print("  5. git add . → git commit -m 'Bug fixes' → git push")
print("="*60)
