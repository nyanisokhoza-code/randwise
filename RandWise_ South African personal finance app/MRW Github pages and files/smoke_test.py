import os, sys, re

print("=== RandWise Smoke Test ===\n")
files = ["app.html", "admin_dashboard.html", "sw.js", "manifest.json"]
passed = 0
failed = 0

# 1. File existence & size
for f in files:
    if os.path.exists(f):
        size = os.path.getsize(f)
        if size > 1000:
            print(f"[PASS] {f} exists ({size} bytes)")
            passed += 1
        else:
            print(f"[FAIL] {f} too small ({size} bytes)")
            failed += 1
    else:
        print(f"[FAIL] {f} MISSING")
        failed += 1

# 2. Critical functions in app.html
if os.path.exists("app.html"):
    content = open("app.html", "r", encoding="utf-8", errors="ignore").read()

    checks = [
        ("function toggleHeroFlip", "Coin flip function"),
        ("function openAddGoalPWA", "Savings goal open"),
        ("function saveGoalPWA", "Savings goal save"),
        ("function dismissReferral", "Referral dismiss"),
        ("function toggleRecentTx", "Transactions toggle"),
        ("sbPost(", "Supabase post helper"),
        ("sbG(", "Supabase get helper"),
    ]

    for pattern, name in checks:
        if pattern in content:
            print(f"[PASS] {name} found")
            passed += 1
        else:
            print(f"[FAIL] {name} MISSING")
            failed += 1

    # 3. Broken patterns
    broken = [
        ("merchant_key=", "Payfast merchant_key exposed in URL"),
        ("overflow-y:auto;overflow-y:auto", "Double overflow declaration"),
    ]

    for pattern, name in broken:
        if pattern in content:
            print(f"[WARN] {name} detected")
        else:
            print(f"[OK]   {name} not found (good)")

print(f"\n=== Results: {passed} passed, {failed} failed ===")
if failed > 0:
    print("SMOKE TEST FAILED - DO NOT PUSH")
    sys.exit(1)
else:
    print("SMOKE TEST PASSED - Safe to push")
    sys.exit(0)
