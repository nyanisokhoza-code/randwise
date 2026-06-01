#!/usr/bin/env python3
"""
MyRandWise Admin Dashboard Scroll Fix
Fixes .main overflow:hidden that blocks scrolling

Usage:
    python fix_admin.py path/to/admin_dashboard.html
"""

import sys

def fix_admin(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    fixes = []

    # FIX 1: .main overflow:hidden → overflow:visible
    if ".main{" in content or ".main {" in content:
        content = content.replace(".main{", ".main{").replace(".main {", ".main {")
        # Find overflow:hidden in .main rule
        import re
        main_rule = re.search(r'\.main\s*\{[^}]*overflow\s*:\s*hidden[^}]*\}', content)
        if main_rule:
            old_rule = main_rule.group(0)
            new_rule = old_rule.replace("overflow:hidden", "overflow:visible").replace("overflow: hidden", "overflow: visible")
            content = content.replace(old_rule, new_rule)
            fixes.append("✅ .main overflow:hidden → overflow:visible")
        else:
            fixes.append("⚠️ .main rule found but no overflow:hidden — may already be fixed")
    else:
        fixes.append("⚠️ .main CSS rule not found")

    # FIX 2: Ensure .content has proper scroll
    if ".content{" in content or ".content {" in content:
        content_rule = re.search(r'\.content\s*\{[^}]*\}', content)
        if content_rule:
            old = content_rule.group(0)
            if "overflow-y" not in old:
                new_rule = old.rstrip("}") + "; overflow-y:auto; max-height:calc(100vh - 60px)}"
                content = content.replace(old, new_rule)
                fixes.append("✅ .content overflow-y:auto added")
            else:
                fixes.append("⚠️ .content already has overflow")

    out_path = path.replace('.html', '_fixed.html')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print("\n" + "="*50)
    print("  Admin Dashboard Fix Results")
    print("="*50)
    for f in fixes:
        print("  " + f)
    print("-"*50)
    print(f"  Output: {out_path}")
    print("="*50)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python fix_admin.py path/to/admin_dashboard.html")
        sys.exit(1)
    fix_admin(sys.argv[1])
