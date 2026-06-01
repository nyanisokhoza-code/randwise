#!/usr/bin/env python3
"""
MyRandWise Service Worker Fix
Bumps cache version and adds admin_dashboard.html to no-cache list

Usage:
    python fix_sw.py path/to/sw.js
"""

import sys

def fix_sw(sw_path):
    with open(sw_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    fixes = []

    # FIX 1: Bump cache version
    if "rw-v154" in content:
        content = content.replace("rw-v154", "rw-v155")
        fixes.append("✅ Cache version bumped: rw-v154 → rw-v155")
    elif "rw-v" in content:
        # Find any version and bump it
        import re
        v = re.search(r"rw-v(\d+)", content)
        if v:
            old_v = v.group(0)
            new_num = int(v.group(1)) + 1
            new_v = f"rw-v{new_num}"
            content = content.replace(old_v, new_v)
            fixes.append(f"✅ Cache version bumped: {old_v} → {new_v}")
    else:
        fixes.append("⚠️ No rw-v version found")

    # FIX 2: Add admin_dashboard.html to no-cache list
    if "admin_dashboard.html" not in content:
        # Find the app.html no-cache block and add admin after it
        app_block = """if(url.pathname==='/app.html'||url.pathname.endsWith('/randwise/')||url.pathname.endsWith('/randwise')){
 e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>caches.match('./app.html')));
 return;
 }"""
        admin_block = """if(url.pathname==='/app.html'||url.pathname.endsWith('/randwise/')||url.pathname.endsWith('/randwise')){
 e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>caches.match('./app.html')));
 return;
 }

 // admin_dashboard.html → always fetch fresh
 if(url.pathname==='/admin_dashboard.html'){
 e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>caches.match('./admin_dashboard.html')));
 return;
 }"""

        if app_block in content:
            content = content.replace(app_block, admin_block)
            fixes.append("✅ admin_dashboard.html added to no-cache list")
        else:
            fixes.append("⚠️ app.html no-cache block not found — manual add needed")
    else:
        fixes.append("⚠️ admin_dashboard.html already in no-cache list")

    out_path = sw_path.replace('.js', '_fixed.js')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print("\n" + "="*50)
    print("  Service Worker Fix Results")
    print("="*50)
    for f in fixes:
        print("  " + f)
    print("-"*50)
    print(f"  Output: {out_path}")
    print("="*50)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python fix_sw.py path/to/sw.js")
        sys.exit(1)
    fix_sw(sys.argv[1])
