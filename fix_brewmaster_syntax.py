import re, subprocess, shutil

for path in ['app/brewmaster-chaichaska-login/page.js', '../chai/chaichaska1/app/brewmaster-chaichaska-login/page.js']:
    try:
        with open(path, 'r', encoding='utf-8') as f:
            c = f.read()
    except Exception as e:
        print(f"Skipping {path}: {e}")
        continue

    c = c.replace('\r\n', '\n')

    # Fix closing of dashboard-container before <aside
    # Search for end of isOfflineItemModalOpen
    target = '''            )}


          {/* FIXED RIGHT SIDEBAR (PENDING ORDERS WITH PRODUCT IMAGE & ALL DETAILS) */}'''

    replacement = '''            )}

          </div>

          {/* FIXED RIGHT SIDEBAR (PENDING ORDERS WITH PRODUCT IMAGE & ALL DETAILS) */}'''

    if target in c:
        c = c.replace(target, replacement)
        print(f"Fixed dashboard-container closing in {path}!")
        with open(path, 'w', encoding='utf-8') as f:
            f.write(c)

print("Running node -c syntax check...")
res = subprocess.run(["node", "-c", "app/brewmaster-chaichaska-login/page.js"], capture_output=True, text=True)
print("Return code:", res.returncode)
print("Stdout:", res.stdout)
print("Stderr:", res.stderr)
