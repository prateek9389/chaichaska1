import os, shutil

src_root = 'c:/Users/HP/Desktop/chai update/chaichaska1'
dst_root = 'c:/Users/HP/Desktop/chai/chaichaska1'

if os.path.exists(dst_root):
    for rel_file in [
        'app/brewmaster-chaichaska-login/page.js',
        'app/admin-chaichaska-login/page.js',
        'app/orders/page.js',
        'app/orders/[id]/page.js'
    ]:
        src = os.path.join(src_root, rel_file)
        dst = os.path.join(dst_root, rel_file)
        if os.path.exists(src):
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copy2(src, dst)
            print(f"Synced {rel_file} to {dst_root}")

print("Sync finished.")
